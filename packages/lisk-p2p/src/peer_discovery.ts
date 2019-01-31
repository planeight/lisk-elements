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
import { P2PPeerInfo } from './p2p_types';
import { Peer } from './peer';
// For Lips, this will be used for fixed and white lists
export interface FilterPeerOptions {
	readonly blacklist: ReadonlyArray<string>;
}
// TODO: Implement LIPS to handle fixed and white list
export const discoverPeers = async (
	peers: ReadonlyArray<Peer>,
	filterPeerOptions: FilterPeerOptions = { blacklist: [] },
): Promise<ReadonlyArray<P2PPeerInfo>> => {
	const peersOfPeer: ReadonlyArray<
		ReadonlyArray<P2PPeerInfo>
	> = await Promise.all(peers.map(async peer => peer.fetchPeers()));

	const peersOfPeerFlat = peersOfPeer.reduce(
		(flattenedPeersList: ReadonlyArray<P2PPeerInfo>, peersList) =>
			Array.isArray(peersList)
				? [...flattenedPeersList, ...peersList]
				: flattenedPeersList,
		[],
	);

	// Remove duplicates
	const discoveredPeers = peersOfPeerFlat.reduce(
		(uniquePeersArray: ReadonlyArray<P2PPeerInfo>, peer: P2PPeerInfo) => {
			const found = uniquePeersArray.find(
				findPeer => Peer.constructPeerIdFromPeerInfo(findPeer) === Peer.constructPeerIdFromPeerInfo(peer),
			);

			return found ? uniquePeersArray : [...uniquePeersArray, peer];
		},
		[],
	);

	if (filterPeerOptions.blacklist.length === 0) {
		return discoveredPeers;
	}
	// Remove blacklist ids
	const discoveredPeersFiltered = discoveredPeers.filter(
		(peer: P2PPeerInfo) =>
			!filterPeerOptions.blacklist.includes(peer.ipAddress),
	);

	return discoveredPeersFiltered;
};
