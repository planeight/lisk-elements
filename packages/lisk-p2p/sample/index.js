const {
	P2P,
	EVENT_REQUEST_RECEIVED,
	EVENT_MESSAGE_RECEIVED,
	EVENT_NEW_PEER,
	EVENT_FAILED_TO_ADD_INBOUND_PEER,
} = require('../dist-node');
const os = require('os');
const crypto = require('crypto');

const p2p = new P2P({
	connectTimeout: 5000,
	blacklistedPeers: [],
	wsEngine: 'ws',
	seedPeers: [
		{
			ipAddress: '94.237.29.221',
			wsPort: 7001,
		},
	],
	nodeInfo: {
		os: os.platform(),
		wsPort: 5001,
		height: 1,
		version: '1.4.0-rc.1',
		options: {
			httpPort: 5000,
			nonce: crypto.randomBytes(8).toString('hex'),
			nethash:
				'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
		},
	},
});

const run = async () => {
	await p2p.start();
	p2p.on(EVENT_REQUEST_RECEIVED, req => {
		console.log(EVENT_REQUEST_RECEIVED, req);
	});

	p2p.on(EVENT_MESSAGE_RECEIVED, req => {
		console.log(EVENT_MESSAGE_RECEIVED, req);
	});

	p2p.on(EVENT_NEW_PEER, req => {
		console.log(EVENT_NEW_PEER, req);
	});

	p2p.on(EVENT_FAILED_TO_ADD_INBOUND_PEER, req => {
		console.log(EVENT_FAILED_TO_ADD_INBOUND_PEER, req);
	});

	const { data: blockData } = await p2p.request({ procedure: 'blocks' });
	console.log(blockData);
	const { data: txData } = await p2p.request({ procedure: 'getTransactions' });
	console.log(txData);
	const { data: signData } = await p2p.request({ procedure: 'getSignatures' });
	console.log(signData);
};

run().catch(console.error);
