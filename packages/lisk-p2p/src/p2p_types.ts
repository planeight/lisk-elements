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
/* tslint:disable:no-empty-interface*/

export interface P2PRequestPacket {
	readonly data?: unknown;
	readonly procedure: string;
}

export interface P2PResponsePacket {
	readonly data: unknown;
}

export interface P2PMessagePacket {
	readonly data?: unknown;
	readonly event: string;
}

export interface P2PPenalty {}

export interface P2PPeerInfo {
	readonly ipAddress: string;
	readonly wsPort: number;
	readonly height: number;
	readonly os?: string;
	readonly version?: string;
	// Add support for custom fields like broadhash or nonce.
	// This is done to keep the P2P library general-purpose since not all P2P applications need a nonce or broadhash.
	/* tslint:disable-next-line:no-mixed-interface */
	readonly options?: P2PInfoOptions;
	// This is necessary because PeerInfo for a tried peer will likely have more properties.
	/* tslint:disable-next-line:no-mixed-interface */
	readonly isTriedPeer?: boolean;
}

// Allows the user to provide custom fields.
export interface P2PInfoOptions {
	readonly [key: string]: unknown;
}

export interface P2PNodeInfo {
	readonly os: string;
	readonly version: string;
	readonly wsPort: number;
	readonly height: number;
	readonly options?: P2PInfoOptions;
}

export interface P2PConfig {
	readonly blacklistedPeers: ReadonlyArray<P2PPeerInfo>;
	readonly connectTimeout: number;
	readonly hostAddress?: string;
	readonly seedPeers: ReadonlyArray<P2PPeerInfo>;
	readonly nodeInfo: P2PNodeInfo;
	readonly wsEngine?: string;
}

// Network info exposed by the P2P library.
export interface P2PNetworkStatus {
	readonly newPeers: ReadonlyArray<P2PPeerInfo>;
	readonly triedPeers: ReadonlyArray<P2PPeerInfo>;
	readonly connectedPeers: ReadonlyArray<P2PPeerInfo>;
}

// This is a representation of the peer object according to the current protocol.
// TODO later: Switch to LIP protocol format.
export interface ProtocolPeerInfo {
	readonly broadhash: string;
	readonly height: number;
	readonly ip: string;
	readonly nonce: string;
	readonly os?: string;
	readonly version: string;
	readonly wsPort: number;
}

// This is a representation of the peer list according to the current protocol.
// TODO later: Switch to LIP protocol format.
export interface ProtocolPeerInfoList {
	readonly peers: ReadonlyArray<ProtocolPeerInfo>;
	readonly success: boolean;
}

// TODO later: Switch to LIP protocol format.
export interface ProtocolRPCRequestPacket {
	readonly data: unknown;
	readonly procedure: string;
	readonly type: string;
}

// TODO later: Switch to LIP protocol format.
export interface ProtocolMessagePacket {
	readonly data: unknown;
	readonly event: string;
}
