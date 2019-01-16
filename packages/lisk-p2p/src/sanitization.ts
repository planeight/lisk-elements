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
import { valid as isValidVersion } from 'semver';
import { isAlpha, isIP, isNumeric, isPort } from 'validator';
import { InvalidPeer, InvalidRPCResponse } from './errors';
import { ProtocolPeerInfo } from './p2p_types';
import { PeerInfo } from './peer';

const IPV4_NUMBER = 4;
const IPV6_NUMBER = 6;

interface RPCPeerListResponse {
	readonly peers: ReadonlyArray<object>;
	readonly success?: boolean; // Could be used in future
}

export const validatePeerAddress = (ip: string, wsPort: string): boolean => {
	if ((!isIP(ip, IPV4_NUMBER) && !isIP(ip, IPV6_NUMBER)) || !isPort(wsPort)) {
		return false;
	}

	return true;
};

export const sanitizePeerInfo = (rawPeerInfo: unknown): PeerInfo => {
	if (!rawPeerInfo) {
		throw new InvalidPeer(`Invalid peer object`);
	}

	const protocolPeer = rawPeerInfo as ProtocolPeerInfo;

	if (
		!protocolPeer.ip ||
		!protocolPeer.wsPort ||
		!validatePeerAddress(protocolPeer.ip, protocolPeer.wsPort)
	) {
		throw new InvalidPeer(`Invalid peer ip or port`);
	}

	if (!protocolPeer.version || !isValidVersion(protocolPeer.version)) {
		throw new InvalidPeer(`Invalid peer version`);
	}

	const version = protocolPeer.version;
	const wsPort = +protocolPeer.wsPort;
	const os =
		protocolPeer.os && isAlpha(protocolPeer.os.toString())
			? protocolPeer.os
			: '';
	const height =
		protocolPeer.height && isNumeric(protocolPeer.height.toString())
			? +protocolPeer.height
			: 0;

	const peerInfo: PeerInfo = {
		ipAddress: protocolPeer.ip,
		wsPort,
		height,
		os,
		version,
	};

	return peerInfo;
};

export const sanitizePeerInfoList = (
	rawPeerInfoList: unknown,
): ReadonlyArray<PeerInfo> => {
	if (!rawPeerInfoList) {
		throw new InvalidRPCResponse('Invalid response type');
	}

	const { peers } = rawPeerInfoList as RPCPeerListResponse;

	if (Array.isArray(peers)) {
		const peerList = peers.map<PeerInfo>(sanitizePeerInfo);

		return peerList;
	} else {
		throw new InvalidRPCResponse('Invalid response type');
	}
};
