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
/* tslint:disable:interface-name no-empty-interface */
export interface IP2PMessagePacket {}

export interface IP2PRequestPacket {}

export interface IP2PResponsePacket {}

export interface IP2PNodeStatus {}

export interface IP2PConfig {}

export interface IP2PPenalty {}

export interface INetworkStatus {}

export interface ILogger {
	readonly error: (message: string) => void;
	readonly info: (message: string) => void;
	readonly log: (message: string) => void;
	readonly trace: (message: string) => void;
	readonly warn: (message: string) => void;
}

export enum PeerState {
	BANNED = 0,
	DISCONNECTED = 1,
	CONNECTED = 2,
}

export interface IPeer {
	readonly getClock?: () => Date;
	readonly getHttpPort?: () => number;
	readonly getId: () => string;
	readonly getIp: () => string;
	readonly getNonce?: () => string;
	readonly getOS?: () => string;
	readonly getState?: () => PeerState;
	readonly getVersion?: () => string;
	readonly getWsPort: () => number;
	readonly setClock?: (clock: Date) => void;
	readonly setHttpPort?: (httpPort: number) => void;
	readonly setNonce?: (nonce: string) => void;
	readonly setOS?: (os: string) => void;
	readonly setVersion?: (version: string) => void;
}

export interface IP2P {
	readonly applyPenalty: (penalty: IP2PPenalty) => void;
	readonly getNetworkStatus: () => INetworkStatus;
	readonly getNodeStatus: () => IP2PNodeStatus;
	readonly request: (packet: IP2PRequestPacket) => Promise<IP2PResponsePacket>;
	readonly send: (message: IP2PMessagePacket) => void;
	readonly setNodeStatus: (nodeStatus: IP2PNodeStatus) => void;
	readonly start: () => Promise<void>;
	readonly stop: () => PromiseConstructorLike;
}
