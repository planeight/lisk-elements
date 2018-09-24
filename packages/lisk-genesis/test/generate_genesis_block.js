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
} from '../src/generate_genesis_block';
import defaultBlock from '../fixtures/block.json';
// Required for stubbing
const cryptographyModule = require('lisk-cryptography');
const transactionModule = require('lisk-transactions');
const passphraseModule = require('lisk-passphrase');

describe('Generate genesis block', () => {
	const defaultBlockHash =
		'00000000c0b21900848f52d212fb9f261500000083c9d5ef000000008058840c000000000065cd1d00000000d90e000040aa7dc0114977bb3b8b04ec0a5a7a298212ce1fbbd15038e39f0ac4f53f118f4f12f49ee704d8554dc3dc392ba3ecf7a6e6f700b291fd77f75181cb48e34ad6';
	const defaultBlockHashWithSignature =
		'00000000c0b21900848f52d212fb9f261500000083c9d5ef000000008058840c000000000065cd1d00000000d90e000040aa7dc0114977bb3b8b04ec0a5a7a298212ce1fbbd15038e39f0ac4f53f118f4f12f49ee704d8554dc3dc392ba3ecf7a6e6f700b291fd77f75181cb48e34ad6c9c8a9a0d0ba1c8ee519792f286d751071de588448eb984ddd9fe4ea0fe34db474692407004047068dee785abca22a744203fb0342b5404349fa9d6abab1480d';

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
				prepareTransaction: sandbox.stub(),
			};
			return Promise.resolve();
		});

		it('should call prepareTransaction with the correct input', () => {
			const transactionInput = {
				amount: defaultAmount,
				senderId: defaultSenderId,
				senderPublicKey: defaultSenderPublicKey,
				recipientId: defaultRecipientId,
				recipientPublicKey: defaultRecipientPublicKey,
			};
			createTransferTx({
				...transactionInput,
				passphrase: defaultPassphrase,
			});
			return expect(
				transactionModule.default.utils.prepareTransaction,
			).to.be.calledWithExactly(
				{
					type: 0,
					fee: '0',
					timestamp: 0,
					...transactionInput,
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
				prepareTransaction: sandbox.stub(),
			};
			return Promise.resolve();
		});

		it('should call prepareTransaction with the correct input', () => {
			const transactionInput = {
				senderId: defaultSenderId,
				senderPublicKey: defaultSenderPublicKey,
			};
			createSecondSignatureTx({
				...transactionInput,
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
					...transactionInput,
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
});
