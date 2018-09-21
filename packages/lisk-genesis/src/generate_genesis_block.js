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
import bignum from 'browserify-bignum';
import cryptography from 'lisk-cryptography';
import passphraseModule from 'lisk-passphrase';
import transactionModule from 'lisk-transactions';

export const getBlockBytes = block => {
	const versionBuffer = Buffer.alloc(4);
	versionBuffer.writeInt32LE(block.version);
	const timestampBuffer = Buffer.alloc(4);
	timestampBuffer.writeInt32LE(block.timestamp);
	const prevBlockBuffer = block.previousBlock
		? bignum(block.previousBlock).toBuffer({ endian: 'big', size: 8 })
		: Buffer.alloc(8);
	const numTxBuffer = Buffer.alloc(4);
	numTxBuffer.writeInt32LE(block.numberOfTransactions);
	const totalAmountBuffer = bignum(block.totalAmount).toBuffer({
		endian: 'little',
		size: 8,
	});
	const totalFeeBuffer = bignum(block.totalFee).toBuffer({
		endian: 'little',
		size: 8,
	});
	const rewardBuffer = bignum(block.reward).toBuffer({
		endian: 'little',
		size: 8,
	});
	const payloadLengthBuffer = Buffer.alloc(4);
	payloadLengthBuffer.writeInt32LE(block.payloadLength);
	const payloadHashBuffer = cryptography.hexToBuffer(block.payloadHash);
	const generatorPublicKeyBuffer = cryptography.hexToBuffer(
		block.generatorPublicKey,
	);

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

export const getBlockId = blockBytes => {
	const blockHash = cryptography.hash(blockBytes);
	const bufferFromFirstEntriesReversed = cryptography.getFirstEightBytesReversed(
		blockHash,
	);
	const firstEntriesToNumber = cryptography.bufferToBigNumberString(
		bufferFromFirstEntriesReversed,
	);
	return firstEntriesToNumber;
};

export const createAccount = () => {
	const passphrase = passphraseModule.Mnemonic.generateMnemonic();
	const {
		publicKey,
		address,
	} = cryptography.getAddressAndPublicKeyFromPassphrase(passphrase);
	return {
		passphrase,
		publicKey,
		address,
	};
};

export const createTransferTx = ({
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
	return transactionModule.utils.prepareTransaction(transaction, passphrase);
};

export const createSecondSignatureTx = ({
	senderId,
	senderPublicKey,
	passphrase,
	secondPublicKey,
}) => {
	const transaction = {
		type: 1,
		fee: '0',
		timestamp: 0,
		amount: '0',
		senderId,
		senderPublicKey,
		recipientId: senderId,
		recipientPublicKey: senderPublicKey,
		asset: {
			signature: {
				publicKey: secondPublicKey,
			},
		},
	};
	return transactionModule.utils.prepareTransaction(transaction, passphrase);
};

export const createRegisterDelegateTx = ({
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
		recipientId: senderId,
		recipientPublicKey: senderPublicKey,
		timestamp: 0,
		asset: {
			delegate: {
				username,
			},
		},
	};
	return transactionModule.utils.prepareTransaction(transaction, passphrase);
};

export const createVoteTx = ({
	publicKeys,
	senderId,
	senderPublicKey,
	passphrase,
}) => {
	const votes = publicKeys.map(key => `+${key}`);
	const transaction = {
		type: 3,
		fee: '0',
		amount: '0',
		senderId,
		senderPublicKey,
		recipientId: senderId,
		recipientPublicKey: senderPublicKey,
		timestamp: 0,
		asset: {
			votes,
		},
	};
	return transactionModule.utils.prepareTransaction(transaction, passphrase);
};

export const getTransactionPayloadInfo = transactions => {
	const { payloadLength, calculatedHash } = transactions.reduce(
		(accumulated, current) => {
			const txBytes = transactionModule.utils.getTransactionBytes(current);
			accumulated.calculatedHash.update(txBytes);
			return {
				payloadLength: accumulated.payloadLength + txBytes.length,
				calculatedHash: accumulated.calculatedHash,
			};
		},
		{ payloadLength: 0, calculatedHash: crypto.createHash('sha256') },
	);
	const payloadHash = calculatedHash.digest().toString('hex');
	return {
		payloadHash,
		payloadLength,
	};
};

export const sortTransactions = transactions =>
	transactions.sort((a, b) => {
		if (a.type === 1) return 1;
		if (a.type < b.type) return -1;
		if (a.type > b.type) return 1;
		if (a.amount < b.amount) return -1;
		if (a.amount > b.amount) return 1;
		return 0;
	});

export const signBlock = (rawBlock, passphrase) => {
	const transactionPayloadInfo = getTransactionPayloadInfo(
		rawBlock.transactions,
	);
	const blockWithPayloadInfo = {
		...rawBlock,
		...transactionPayloadInfo,
	};
	const blockBytes = getBlockBytes(blockWithPayloadInfo);
	const blockHash = cryptography.hash(blockBytes);
	const signature = cryptography.signData(blockHash, passphrase);
	return {
		...blockWithPayloadInfo,
		blockSignature: signature,
	};
};

export const generateGenesisBlock = ({
	totalAmount = '10000000000000000',
	numberOfDelegates = 101,
	initAccounts = [],
} = {}) => {
	const genesisSender = createAccount();
	const genesisReceiver = createAccount();
	const genesisTx = createTransferTx({
		amount: totalAmount,
		senderId: genesisSender.address,
		senderPublicKey: genesisSender.publicKey,
		recipientId: genesisReceiver.address,
		recipientPublicKey: genesisReceiver.publicKey,
		passphrase: genesisSender.passphrase,
	});
	const delegateAccounts = new Array(numberOfDelegates)
		.fill()
		.map(() => createAccount());

	const registerDelegateTxs = delegateAccounts.map((account, i) =>
		createRegisterDelegateTx({
			senderId: account.address,
			senderPublicKey: account.publicKey,
			passphrase: account.passphrase,
			username: `genesis_${i + 1}`,
		}),
	);

	const voteTx = createVoteTx({
		senderId: genesisReceiver.address,
		senderPublicKey: genesisReceiver.publicKey,
		publicKeys: delegateAccounts.map(account => account.publicKey),
		passphrase: genesisReceiver.passphrase,
	});

	const initAccountTxs = initAccounts.map(account =>
		createTransferTx({
			amount: account.amount,
			senderId: genesisReceiver.address,
			senderPublicKey: genesisReceiver.publicKey,
			recipientId: account.address,
			recipientPublicKey: account.publicKey,
			passphrase: genesisReceiver.passphrase,
		}),
	);

	const initAccountSecondSignatureTxs = initAccounts
		.filter(account => account.secondPublicKey)
		.map(account =>
			createSecondSignatureTx({
				senderId: account.address,
				senderPublicKey: account.publicKey,
				secondPublicKey: account.secondPublicKey,
				passphrase: genesisReceiver.passphrase,
			}),
		);

	const transactions = [
		genesisTx,
		...registerDelegateTxs,
		voteTx,
		...initAccountTxs,
		...initAccountSecondSignatureTxs,
	];
	const sortedTransactions = sortTransactions(transactions);
	const rawBlock = {
		version: 0,
		totalAmount,
		totalFee: '0',
		reward: '0',
		previousBlock: null,
		numberOfTransactions: sortedTransactions.length,
		generatorPublicKey: genesisSender.publicKey,
		timestamp: 0,
		height: 1,
		transactions: sortedTransactions,
	};
	const signedBlock = signBlock(rawBlock, genesisSender.passphrase);
	const id = getBlockId(
		Buffer.concat([
			getBlockBytes(signedBlock),
			cryptography.hexToBuffer(signedBlock.blockSignature),
		]),
	);
	const blockWithId = {
		id,
		...signedBlock,
	};
	return {
		block: blockWithId,
		accounts: [genesisReceiver, ...delegateAccounts],
	};
};

export default generateGenesisBlock;
