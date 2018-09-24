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
import {
	getBlockBytes,
	getBlockId,
	createAccount,
	createTransferTx,
	createSecondSignatureTx,
	createRegisterDelegateTx,
	createVoteTx,
	getTransactionPayloadInfo,
} from '../src/generate_genesis_block';
import defaultBlock from '../fixtures/block.json';
// Required for stubbing
const cryptographyModule = require('lisk-cryptography');
const transactionModule = require('lisk-transactions');
const passphraseModule = require('lisk-passphrase');

describe('Generate genesis block', () => {
	const defaultBlockHash =
		'00000000c6ed1f04d75d75ef8fb87d31190000004e1a1a6c0000000080b2e60e000000000084d717000000006d0b000032993aa2513354be689acf6eb5dbc683653313126d727da489a3c84c0c9a4a0f2e334da068a75c4ee5e7d82092ef30f70209b24fd29a008c2cf753bec091b04a';
	const defaultBlockHashWithSignature =
		'00000000c6ed1f04d75d75ef8fb87d31190000004e1a1a6c0000000080b2e60e000000000084d717000000006d0b000032993aa2513354be689acf6eb5dbc683653313126d727da489a3c84c0c9a4a0f2e334da068a75c4ee5e7d82092ef30f70209b24fd29a008c2cf753bec091b04a6f48350e72fca55965b1c1cbe401942a90ade42dbff1db116e93f1e3ae8593cbf10689a92ea9a01691590b6c561dd9241e2b9f1999ddf87afc07ac486dd51a06';

	describe('#getBlockBytes', () => {
		it('should have the correct block hash', () => {
			return expect(getBlockBytes(defaultBlock).toString('hex')).to.be.eql(
				defaultBlockHash,
			);
		});
	});

	describe('#getBlockId', () => {
		it('should have the correct block id', () => {
			return expect(
				getBlockId(Buffer.from(defaultBlockHashWithSignature, 'hex')),
			).to.be.eql(defaultBlock.id);
		});
	});

	describe('#createAccount', () => {
		const defaultPassphrase =
			'lab mirror fetch tuna village sell sphere truly excite manual planet capable';
		const defaultKeys = {
			publicKey:
				'88b182d9f2d8a7c3b481a8962ae7d445b7a118fbb6a6f3afcedf4e0e8c46ecac',
			address: '14389576228799148035L',
		};

		beforeEach(() => {
			sandbox
				.stub(passphraseModule.default.Mnemonic, 'generateMnemonic')
				.returns(defaultPassphrase);
			return sandbox
				.stub(
					cryptographyModule.default,
					'getAddressAndPublicKeyFromPassphrase',
				)
				.withArgs(defaultPassphrase)
				.returns(defaultKeys);
		});

		it('should create an account', () => {
			const account = createAccount();
			expect(passphraseModule.default.Mnemonic.generateMnemonic).to.be.called;
			expect(
				cryptographyModule.default.getAddressAndPublicKeyFromPassphrase,
			).to.be.calledWithExactly(defaultPassphrase);
			return expect(account).to.be.eql({
				passphrase: defaultPassphrase,
				address: defaultKeys.address,
				publicKey: defaultKeys.publicKey,
			});
		});
	});

	describe('#createTransferTx', () => {
		const defaultAmount = '100';
		const defaultSenderId = '14389576228799148035L';
		const defaultSenderPublicKey =
			'88b182d9f2d8a7c3b481a8962ae7d445b7a118fbb6a6f3afcedf4e0e8c46ecac';
		const defaultRecipientId = '10498496668550693658L';
		const defaultRecipientPublicKey =
			'90215077294ac1c727b357978df9291b77a8a700e6e42545dc0e6e5ba9582f13';
		const defaultPassphrase =
			'lab mirror fetch tuna village sell sphere truly excite manual planet capable';

		beforeEach(() => {
			transactionModule.default.utils = {
				...transactionModule.default.utils,
				prepareTransaction: sandbox.stub(),
			};
			return Promise.resolve();
		});

		it('should call prepareTransaction with the correct input', () => {
			createTransferTx({
				amount: defaultAmount,
				senderId: defaultSenderId,
				senderPublicKey: defaultSenderPublicKey,
				recipientId: defaultRecipientId,
				recipientPublicKey: defaultRecipientPublicKey,
				passphrase: defaultPassphrase,
			});
			return expect(
				transactionModule.default.utils.prepareTransaction,
			).to.be.calledWithExactly(
				{
					type: 0,
					fee: '0',
					timestamp: 0,
					amount: defaultAmount,
					senderId: defaultSenderId,
					senderPublicKey: defaultSenderPublicKey,
					recipientId: defaultRecipientId,
					recipientPublicKey: defaultRecipientPublicKey,
					asset: {},
				},
				defaultPassphrase,
			);
		});
	});

	describe('#createSecondSignatureTx', () => {
		const defaultSenderId = '14389576228799148035L';
		const defaultSenderPublicKey =
			'88b182d9f2d8a7c3b481a8962ae7d445b7a118fbb6a6f3afcedf4e0e8c46ecac';
		const defaultSecondPublicKey =
			'90215077294ac1c727b357978df9291b77a8a700e6e42545dc0e6e5ba9582f13';
		const defaultPassphrase =
			'lab mirror fetch tuna village sell sphere truly excite manual planet capable';

		beforeEach(() => {
			transactionModule.default.utils = {
				...transactionModule.default.utils,
				prepareTransaction: sandbox.stub(),
			};
			return Promise.resolve();
		});

		it('should call prepareTransaction with the correct input', () => {
			createSecondSignatureTx({
				senderId: defaultSenderId,
				senderPublicKey: defaultSenderPublicKey,
				secondPublicKey: defaultSecondPublicKey,
				passphrase: defaultPassphrase,
			});
			return expect(
				transactionModule.default.utils.prepareTransaction,
			).to.be.calledWithExactly(
				{
					type: 1,
					fee: '0',
					timestamp: 0,
					amount: '0',
					senderId: defaultSenderId,
					senderPublicKey: defaultSenderPublicKey,
					recipientId: defaultSenderId,
					recipientPublicKey: defaultSenderPublicKey,
					asset: {
						signature: {
							publicKey: defaultSecondPublicKey,
						},
					},
				},
				defaultPassphrase,
			);
		});
	});

	describe('#createRegisterDelegateTx', () => {
		const defaultUsername = 'user1';
		const defaultSenderId = '14389576228799148035L';
		const defaultSenderPublicKey =
			'88b182d9f2d8a7c3b481a8962ae7d445b7a118fbb6a6f3afcedf4e0e8c46ecac';
		const defaultPassphrase =
			'lab mirror fetch tuna village sell sphere truly excite manual planet capable';

		beforeEach(() => {
			transactionModule.default.utils = {
				...transactionModule.default.utils,
				prepareTransaction: sandbox.stub(),
			};
			return Promise.resolve();
		});

		it('should call prepareTransaction with the correct input', () => {
			createRegisterDelegateTx({
				username: defaultUsername,
				senderId: defaultSenderId,
				senderPublicKey: defaultSenderPublicKey,
				passphrase: defaultPassphrase,
			});
			return expect(
				transactionModule.default.utils.prepareTransaction,
			).to.be.calledWithExactly(
				{
					type: 2,
					fee: '0',
					timestamp: 0,
					amount: '0',
					senderId: defaultSenderId,
					senderPublicKey: defaultSenderPublicKey,
					recipientId: defaultSenderId,
					recipientPublicKey: defaultSenderPublicKey,
					asset: {
						delegate: {
							username: defaultUsername,
						},
					},
				},
				defaultPassphrase,
			);
		});
	});

	describe('#createVoteTx', () => {
		const defaultPublicKeys = [
			'ee130982fccc345f4a8d89ca7764ddd946d317d5212a77c97ad9b4fa28e8b541',
			'fa3d76794aeebf94da2a9c8e6aac2b323632bed7fe56fd85487cf6e09eff023a',
		];
		const defaultPublicKeysWithSign = [
			'+ee130982fccc345f4a8d89ca7764ddd946d317d5212a77c97ad9b4fa28e8b541',
			'+fa3d76794aeebf94da2a9c8e6aac2b323632bed7fe56fd85487cf6e09eff023a',
		];
		const defaultSenderId = '14389576228799148035L';
		const defaultSenderPublicKey =
			'88b182d9f2d8a7c3b481a8962ae7d445b7a118fbb6a6f3afcedf4e0e8c46ecac';
		const defaultPassphrase =
			'lab mirror fetch tuna village sell sphere truly excite manual planet capable';

		beforeEach(() => {
			transactionModule.default.utils = {
				...transactionModule.default.utils,
				prepareTransaction: sandbox.stub(),
			};
			return Promise.resolve();
		});

		it('should call prepareTransaction with the correct input', () => {
			createVoteTx({
				publicKeys: defaultPublicKeys,
				senderId: defaultSenderId,
				senderPublicKey: defaultSenderPublicKey,
				passphrase: defaultPassphrase,
			});
			return expect(
				transactionModule.default.utils.prepareTransaction,
			).to.be.calledWithExactly(
				{
					type: 3,
					fee: '0',
					timestamp: 0,
					amount: '0',
					senderId: defaultSenderId,
					senderPublicKey: defaultSenderPublicKey,
					recipientId: defaultSenderId,
					recipientPublicKey: defaultSenderPublicKey,
					asset: {
						votes: defaultPublicKeysWithSign,
					},
				},
				defaultPassphrase,
			);
		});
	});

	describe('#getTransactionPayloadInfo', () => {
		it('should result in the same payload hash and length of the fixture', () => {
			return expect(
				getTransactionPayloadInfo(defaultBlock.transactions),
			).to.be.eql({
				payloadHash: defaultBlock.payloadHash,
				payloadLength: defaultBlock.payloadLength,
			});
		});
	});
});
