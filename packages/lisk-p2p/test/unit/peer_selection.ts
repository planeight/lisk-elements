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
import { expect } from 'chai';
import { initializePeerList } from '../utils/peers';
import {
	PeerOptions,
	selectForConnection,
	selectPeers,
} from '../../src/peer_selection';

describe('peer selector', () => {
	describe('#selectPeer', () => {
		let peerList = initializePeerList();
		const selectionParams: PeerOptions = {
			lastBlockHeight: 545777,
			netHash: '73458irc3yb7rg37r7326dbt7236',
		};

		// TODO ASAP: Consider updating failing test cases. The peer selector currently only returns Peer objects for tried peers for which we have complete info.
		// TODO ASAP: We need to decide if this filtering needs to happen at the level of the peer selector or if there are other ways.
		describe('get a list of n number of good peers', () => {
			beforeEach(async () => {
				peerList = initializePeerList();
			});

			it('should return an array without optional arguments', () => {
				return expect(selectPeers(peerList)).to.be.an('array');
			});

			it('should return an array', () => {
				return expect(selectPeers(peerList, selectionParams)).to.be.an('array');
			});

			it('returned array should contain good peers according to algorithm', () => {
				return expect(selectPeers(peerList, selectionParams))
					.and.be.an('array')
					.and.of.length(3);
			});

			it('return empty peer list for no peers as an argument', () => {
				return expect(selectPeers([], selectionParams))
					.and.be.an('array')
					.and.to.be.eql([]);
			});

			it('should return an array having one good peer', () => {
				return expect(selectPeers(peerList, selectionParams, 1))
					.and.be.an('array')
					.and.of.length(1);
			});

			it('should return an array having 2 good peers', () => {
				return expect(selectPeers(peerList, selectionParams, 2))
					.and.be.an('array')
					.and.of.length(2);
			});

			it('should return an array having all good peers', () => {
				return expect(selectPeers(peerList, selectionParams, 0))
					.and.be.an('array')
					.and.of.length(3);
			});

			it('should return an array having all good peers ignoring requested negative number of peers', () => {
				return expect(selectPeers(peerList, selectionParams, -1))
					.and.be.an('array')
					.and.of.length(3);
			});

			it('should return an array of equal length equal to requested number of peers', () => {
				return expect(selectPeers(peerList, selectionParams, 3))
					.and.be.an('array')
					.and.of.length(3);
			});

			it('should throw an error when requested peers are greater than available good peers', () => {
				return expect(
					selectPeers.bind(selectPeers, peerList, selectionParams, 4),
				)
					.to.throw(
						`Requested number of peers: '4' is more than the available number of good peers: '3'`,
					)
					.to.have.property('name')
					.eql('NotEnoughPeersError');
			});
		});

		describe('peers with lower blockheight', () => {
			beforeEach(async () => {
				peerList = initializePeerList();
			});
			const lowHeightPeers = peerList.filter(
				peer => peer.height < selectionParams.lastBlockHeight,
			);

			it('should return an array with 0 good peers', () => {
				return expect(selectPeers(lowHeightPeers, selectionParams, 2))
					.and.be.an('array')
					.and.of.length(0);
			});
		});
	});

	describe('#selectForConnection', () => {
		const peerList = initializePeerList();
		const numberOfPeers = peerList.length;

		describe('get all the peers for selection', () => {
			it('should return all the peers given as argument for connection', () => {
				return expect(selectForConnection(peerList))
					.be.an('array')
					.and.is.eql(peerList)
					.of.length(numberOfPeers);
			});
		});
	});
});
