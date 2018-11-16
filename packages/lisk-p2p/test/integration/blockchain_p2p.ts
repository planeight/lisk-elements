// TODO: Rename P2PBlockchain to BlockchainP2P.
import { P2PBlockchain } from '../../src/index';

const NETWORK_PEER_COUNT: Number = 10;

describe('Integration tests for BlockchainP2P', () => {
	let blockchainP2PList: Array<P2PBlockchain> = [];

	describe('Start and stop network', () => {
		beforeEach(async () => {
			blockchainP2PList = [...Array(NETWORK_PEER_COUNT).keys()].map(index => {
				return new P2PBlockchain({
					ip: '127.0.0.1',
					wsPort: 8000 + index,
				});
			});

			let peerStartPromises: Array<Promise> = blockchainP2PList.map(
				blockchainP2P => {
					return blockchainP2P.start();
				},
			);
			await Promise.all(peerStartPromises);
		});

		it('should launch a network of peers locally', () => {
			// TODO: Check that nodes are running.
		});
	});
});
