/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */

import { EventEmitter } from 'events';
import * as http from 'http';
import { attach, SCServer, SCServerSocket } from 'socketcluster-server';
import * as url from 'url';

import { Peer } from './peer';

import {
	INVALID_CONNECTION_QUERY_CODE,
	INVALID_CONNECTION_QUERY_REASON,
	INVALID_CONNECTION_URL_CODE,
	INVALID_CONNECTION_URL_REASON,
} from './disconnect_status_codes';

import {
	P2PConfig,
	P2PMessagePacket,
	P2PNetworkStatus,
	P2PNodeInfo,
	P2PPeerInfo,
	P2PPenalty,
	P2PRequestPacket,
	P2PResponsePacket,
} from './p2p_types';

import { P2PRequest } from './p2p_request';
export { P2PRequest };

import {
	EVENT_CONNECT_ABORT_OUTBOUND,
	EVENT_CONNECT_OUTBOUND,
	EVENT_MESSAGE_RECEIVED,
	EVENT_REQUEST_RECEIVED,
	PeerPool,
} from './peer_pool';

export { EVENT_REQUEST_RECEIVED, EVENT_MESSAGE_RECEIVED };

export const EVENT_NEW_INBOUND_PEER = 'newInboundPeer';
export const EVENT_FAILED_TO_ADD_INBOUND_PEER = 'failedToAddInboundPeer';
export const EVENT_NEW_PEER = 'newPeer';

export const NODE_HOST_IP = '0.0.0.0';

const BASE_10_RADIX = 10;

export class P2P extends EventEmitter {
	private readonly _config: P2PConfig;
	private readonly _httpServer: http.Server;
	private _isActive: boolean;
	private readonly _newPeers: Set<P2PPeerInfo>;
	private readonly _triedPeers: Set<P2PPeerInfo>;

	private _nodeInfo: P2PNodeInfo;
	private readonly _peerPool: PeerPool;
	private readonly _scServer: SCServer;

	private readonly _handlePeerPoolRPC: (request: P2PRequest) => void;
	private readonly _handlePeerPoolMessage: (message: P2PMessagePacket) => void;
	private readonly _handlePeerConnect: (peerInfo: P2PPeerInfo) => void;
	private readonly _handlePeerConnectAbort: (peerInfo: P2PPeerInfo) => void;

	public constructor(config: P2PConfig) {
		super();
		this._config = config;
		this._isActive = false;
		this._newPeers = new Set();
		this._triedPeers = new Set();

		this._httpServer = http.createServer();
		this._scServer = attach(this._httpServer);

		// This needs to be an arrow function so that it can be used as a listener.
		this._handlePeerPoolRPC = (request: P2PRequest) => {
			// Re-emit the request for external use.
			this.emit(EVENT_REQUEST_RECEIVED, request);
		};

		// This needs to be an arrow function so that it can be used as a listener.
		this._handlePeerPoolMessage = (message: P2PMessagePacket) => {
			// Re-emit the message for external use.
			this.emit(EVENT_MESSAGE_RECEIVED, message);
		};

		this._handlePeerConnect = (peerInfo: P2PPeerInfo) => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			if (!this._triedPeers.has(peerInfo)) {
				this._triedPeers.add(peerInfo);
			}
			this.emit(EVENT_CONNECT_OUTBOUND);
		};
		this._handlePeerConnectAbort = (peerInfo: P2PPeerInfo) => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			if (this._triedPeers.has(peerInfo)) {
				this._triedPeers.delete(peerInfo);
			}
			this.emit(EVENT_CONNECT_ABORT_OUTBOUND);
		};

		this._peerPool = new PeerPool();
		this._bindHandlersToPeerPool(this._peerPool);

		this._nodeInfo = config.nodeInfo;
		this._peerPool.applyNodeInfo(this._nodeInfo);
	}

	public get config(): P2PConfig {
		return this._config;
	}

	public get isActive(): boolean {
		return this._isActive;
	}

	/**
	 * This is not a declared as a setter because this method will need
	 * invoke an async RPC on Peers to give them our new node status.
	 */
	public applyNodeInfo(nodeInfo: P2PNodeInfo): void {
		this._nodeInfo = {
			os: this._nodeInfo.os,
			version: this._nodeInfo.version,
			wsPort: this._nodeInfo.wsPort,
			height: nodeInfo.height,
			options: nodeInfo.options ? nodeInfo.options : {},
		};

		this._peerPool.applyNodeInfo(this._nodeInfo);
	}

	public get nodeInfo(): P2PNodeInfo {
		return this._nodeInfo;
	}

	/* tslint:disable:next-line: prefer-function-over-method */
	public applyPenalty(penalty: P2PPenalty): void {
		penalty;
	}

	public getNetworkStatus(): P2PNetworkStatus {
		return {
			newPeers: [...this._newPeers.values()],
			triedPeers: [...this._triedPeers.values()],
			connectedPeers: this._peerPool.getAllPeerInfos(),
		};
	}

	// TODO ASAP: Change selectPeers to return PeerInfo list and then make request on peerPool itself; pass peerInfo as argument.
	public async request(packet: P2PRequestPacket): Promise<P2PResponsePacket> {
		const response = await this._peerPool.requestPeer(packet);

		return response;
	}

	public send(message: P2PMessagePacket): void {
		this._peerPool.sendToPeers(message);
	}

	private async _startPeerServer(): Promise<void> {
		this._scServer.on(
			'connection',
			(socket: SCServerSocket): void => {
				if (!socket.request.url) {
					this.emit(EVENT_FAILED_TO_ADD_INBOUND_PEER);
					socket.disconnect(
						INVALID_CONNECTION_URL_CODE,
						INVALID_CONNECTION_URL_REASON,
					);

					return;
				}
				const queryObject = url.parse(socket.request.url, true).query;

				if (
					typeof queryObject.wsPort !== 'string' ||
					typeof queryObject.os !== 'string' ||
					typeof queryObject.version !== 'string'
				) {
					socket.disconnect(
						INVALID_CONNECTION_QUERY_CODE,
						INVALID_CONNECTION_QUERY_REASON,
					);
					this.emit(EVENT_FAILED_TO_ADD_INBOUND_PEER);
				} else {
					const wsPort: number = parseInt(queryObject.wsPort, BASE_10_RADIX);
					const peerId = Peer.constructPeerId(socket.remoteAddress, wsPort);

					const incomingPeerInfo: P2PPeerInfo = {
						...queryObject,
						ipAddress: socket.remoteAddress,
						wsPort,
						height: queryObject.height ? +queryObject.height : 0,
						os: queryObject.os,
						version: queryObject.version,
					};

					const isNewPeer = this._peerPool.addInboundPeer(
						peerId,
						incomingPeerInfo,
						socket,
					);

					if (isNewPeer) {
						this.emit(EVENT_NEW_INBOUND_PEER, incomingPeerInfo);
						this.emit(EVENT_NEW_PEER, incomingPeerInfo);

						if (!this._newPeers.has(incomingPeerInfo)) {
							this._newPeers.add(incomingPeerInfo);
						}
					}
				}
			},
		);
		this._httpServer.listen(this._nodeInfo.wsPort, NODE_HOST_IP);

		return new Promise<void>(resolve => {
			this._scServer.once('ready', () => {
				this._isActive = true;
				resolve();
			});
		});
	}

	private async _stopHTTPServer(): Promise<void> {
		return new Promise<void>(resolve => {
			this._httpServer.close(() => {
				this._isActive = false;
				resolve();
			});
		});
	}

	private async _stopWSServer(): Promise<void> {
		return new Promise<void>(resolve => {
			this._scServer.close(() => {
				this._isActive = false;
				resolve();
			});
		});
	}

	private async _stopPeerServer(): Promise<void> {
		await this._stopWSServer();
		await this._stopHTTPServer();
	}

	private async _runPeerDiscovery(
		peers: ReadonlyArray<P2PPeerInfo>,
	): Promise<ReadonlyArray<P2PPeerInfo>> {
		const discoveredPeers = await this._peerPool.runDiscovery(
			peers,
			this._config.blacklistedPeers,
		);
		discoveredPeers.forEach((peerInfo: P2PPeerInfo) => {
			if (!this._triedPeers.has(peerInfo) && !this._newPeers.has(peerInfo)) {
				this._newPeers.add(peerInfo);
			}
		});

		return discoveredPeers;
	}

	public async start(): Promise<void> {
		await this._startPeerServer();
		await this._runPeerDiscovery(this._config.seedPeers);
		this._peerPool.selectPeersAndConnect([...this._newPeers]);
	}

	public async stop(): Promise<void> {
		this._peerPool.removeAllPeers();
		await this._stopPeerServer();
	}

	private _bindHandlersToPeerPool(peerPool: PeerPool): void {
		peerPool.on(EVENT_REQUEST_RECEIVED, this._handlePeerPoolRPC);
		peerPool.on(EVENT_MESSAGE_RECEIVED, this._handlePeerPoolMessage);
		peerPool.on(EVENT_CONNECT_OUTBOUND, this._handlePeerConnect);
		peerPool.on(EVENT_CONNECT_ABORT_OUTBOUND, this._handlePeerConnectAbort);
	}
}
