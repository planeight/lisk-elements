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
import crypto from 'crypto';
import cryptography from 'lisk-cryptography';
import passphraseModule from 'lisk-passphrase';
import transactionsUtil from 'lisk-transactions';

const {
	utils: { prepareTransaction, getTransactionBytes },
} = transactionsUtil;
const {
	hexToBuffer,
	hash,
	signData,
	getFirstEightBytesReversed,
	bufferToBigNumberString,
	getAddressAndPublicKeyFromPassphrase,
} = cryptography;

const getId = blockHash => {
	const bufferFromFirstEntriesReversed = getFirstEightBytesReversed(blockHash);
	const firstEntriesToNumber = bufferToBigNumberString(
		bufferFromFirstEntriesReversed,
	);

	return firstEntriesToNumber;
};

const createAccount = () => {
	const passphrase = passphraseModule.Mnemonic.generateMnemonic();
	const { publicKey, address } = getAddressAndPublicKeyFromPassphrase(
		passphrase,
	);
	return {
		passphrase,
		publicKey,
		address,
	};
};

const transfer = ({
	amount,
	senderId,
	senderPublicKey,
	recipientId,
	recipientPublicKey,
	passphrase,
}) => {
	const transaction = {
		type: 0,
		fee: '0',
		timestamp: 0,
		amount,
		senderId,
		senderPublicKey,
		recipientId,
		recipientPublicKey,
		asset: {},
	};
	return prepareTransaction(transaction, passphrase);
};

const registerDelegate = ({
	username,
	senderId,
	senderPublicKey,
	passphrase,
}) => {
	const transaction = {
		type: 2,
		fee: '0',
		amount: '0',
		senderId,
		senderPublicKey,
		timestamp: 0,
		asset: {
			delegate: {
				username,
			},
		},
	};
	return prepareTransaction(transaction, passphrase);
};

const vote = ({ publicKeys, senderId, senderPublicKey, passphrase }) => {
	const votes = publicKeys.map(key => `+${key}`);
	const transaction = {
		type: 3,
		fee: '0',
		amount: '0',
		senderId,
		senderPublicKey,
		timestamp: 0,
		asset: {
			votes,
		},
	};
	return prepareTransaction(transaction, passphrase);
};

const getTransactionPayloadInfo = transactions => {
	const { payloadLength, hash } = transactions.reduce(
		(accumulated, current) => {
			const txBytes = getTransactionBytes(current);
			accumulated.hash.update(txBytes);
			return {
				payloadLength: accumulated.payloadLength + txBytes.length,
				hash: accumulated.hash,
			};
		},
		{ payloadLength: 0, hash: crypto.createHash('sha256') },
	);
	const payloadHash = hash.digest().toString('hex');
	return {
		payloadHash,
		payloadLength,
	};
};

const getBlockBytes = block => {
	const versionBuffer = Buffer.alloc(4, block.version);
	const timestampBuffer = Buffer.alloc(4, block.timestamp);
	const prevBlockBuffer = Buffer.alloc(8);
	const numTxBuffer = Buffer.alloc(4, block.numberOfTransactions);
	const totalAmountBuffer = Buffer.alloc(8, block.totalAmount);
	const totalFeeBuffer = Buffer.alloc(8, block.totalFee);
	const rewardBuffer = Buffer.alloc(8, block.reward);
	const payloadLengthBuffer = Buffer.alloc(4, block.payloadLength);
	const payloadHashBuffer = hexToBuffer(block.payloadHash);
	const generatorPublicKeyBuffer = hexToBuffer(block.generatorPublicKey);

	return Buffer.concat([
		versionBuffer,
		timestampBuffer,
		prevBlockBuffer,
		numTxBuffer,
		totalAmountBuffer,
		totalFeeBuffer,
		rewardBuffer,
		payloadLengthBuffer,
		payloadHashBuffer,
		generatorPublicKeyBuffer,
	]);
};

const signBlock = (rawBlock, passphrase) => {
	const transactionPayloadInfo = getTransactionPayloadInfo(
		rawBlock.transactions,
	);
	const blockWithPayloadInfo = {
		...rawBlock,
		...transactionPayloadInfo,
	};
	const blockBytes = getBlockBytes(blockWithPayloadInfo);
	const blockHash = hash(blockBytes);
	const id = getId(blockHash);
	const signature = signData(blockHash, passphrase);
	return {
		...blockWithPayloadInfo,
		id,
		blockSignature: signature,
	};
};

const generateGenesisBlock = ({
	totalAmount = '10000000000000000',
	numberOfDelegates = 101,
	initAccounts = [],
} = {}) => {
	const genesisSender = createAccount();
	const genesisReceiver = createAccount();
	const genesisTx = transfer({
		amount: totalAmount,
		senderId: genesisSender.address,
		senderPublicKey: genesisSender.publicKey,
		recipientId: genesisReceiver.address,
		recipientPublicKey: genesisReceiver.publicKey,
		passphrase: genesisSender.passphrase,
	});
	const delegateAccounts = Array(numberOfDelegates)
		.fill()
		.map(() => createAccount());
	const registerDelegateTxs = delegateAccounts.map((account, i) =>
		registerDelegate({
			senderId: account.address,
			senderPublicKey: account.publicKey,
			passphrase: account.passphrase,
			username: `genesis_${i}`,
		}),
	);
	const voteTx = vote({
		senderId: genesisReceiver.address,
		senderPublicKey: genesisReceiver.publicKey,
		publicKeys: delegateAccounts.map(account => account.publicKey),
		passphrase: genesisReceiver.passphrase,
	});
	const initAccountTxs = initAccounts.map(account =>
		transfer({
			amount: account.amount,
			senderId: genesisReceiver.address,
			senderPublicKey: genesisReceiver.publicKey,
			recipientId: account.address,
			recipientPublicKey: account.publicKey,
			passphrase: genesisReceiver.passphrase,
		}),
	);
	const transactions = [
		genesisTx,
		...registerDelegateTxs,
		voteTx,
		...initAccountTxs,
	];
	const rawBlock = {
		version: 0,
		totalAmount,
		totalFee: '0',
		reward: '0',
		previousBlock: null,
		numberOfTransactions: transactions.length,
		generatorPublicKey: genesisSender.publicKey,
		timestamp: 0,
		height: 1,
		transactions,
	};
	const block = signBlock(rawBlock, genesisSender.passphrase);
	return {
		block,
		accounts: [genesisReceiver, ...delegateAccounts],
	};
};

export default generateGenesisBlock;
