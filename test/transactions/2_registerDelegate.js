/*
 * Copyright © 2017 Lisk Foundation
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
import registerDelegate from '../../src/transactions/2_registerDelegate';
import cryptoModule from '../../src/crypto';

const time = require('../../src/transactions/utils/time');

describe('#registerDelegate transaction', () => {
	const fixedPoint = 10 ** 8;
	const secret = 'secret';
	const secondSecret = 'second secret';
	const publicKey =
		'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const secondPublicKey =
		'0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f';
	const username = 'test_delegate_1@\\';
	const fee = (25 * fixedPoint).toString();
	const timeWithOffset = 38350076;

	let getTimeWithOffsetStub;
	let registerDelegateTransaction;

	beforeEach(() => {
		getTimeWithOffsetStub = sandbox
			.stub(time, 'getTimeWithOffset')
			.returns(timeWithOffset);
	});

	describe('with one secret', () => {
		beforeEach(() => {
			registerDelegateTransaction = registerDelegate({ secret, username });
		});

		it('should create a register delegate transaction', () => {
			registerDelegateTransaction.should.be.ok();
		});

		it('should use time.getTimeWithOffset to calculate the timestamp', () => {
			getTimeWithOffsetStub.calledWithExactly(undefined).should.be.true();
		});

		it('should use time.getTimeWithOffset with an offset of -10 seconds to calculate the timestamp', () => {
			const offset = -10;
			registerDelegate({ secret, username, timeOffset: offset });

			getTimeWithOffsetStub.calledWithExactly(offset).should.be.true();
		});

		it('should be an object', () => {
			registerDelegateTransaction.should.be.type('object');
		});

		it('should have an id string', () => {
			registerDelegateTransaction.should.have
				.property('id')
				.and.be.type('string');
		});

		it('should have type number equal to 2', () => {
			registerDelegateTransaction.should.have
				.property('type')
				.and.be.type('number')
				.and.equal(2);
		});

		it('should have amount string equal to 0', () => {
			registerDelegateTransaction.should.have
				.property('amount')
				.and.be.type('string')
				.and.equal('0');
		});

		it('should have fee string equal to 25 LSK', () => {
			registerDelegateTransaction.should.have
				.property('fee')
				.and.be.type('string')
				.and.equal(fee);
		});

		it('should have recipientId equal to null', () => {
			registerDelegateTransaction.should.have
				.property('recipientId')
				.and.be.null();
		});

		it('should have senderPublicKey hex string equal to sender public key', () => {
			registerDelegateTransaction.should.have
				.property('senderPublicKey')
				.and.be.hexString()
				.and.equal(publicKey);
		});

		it('should have timestamp number equal to result of time.getTimeWithOffset', () => {
			registerDelegateTransaction.should.have
				.property('timestamp')
				.and.be.type('number')
				.and.equal(timeWithOffset);
		});

		it('should have signature hex string', () => {
			registerDelegateTransaction.should.have
				.property('signature')
				.and.be.hexString();
		});

		it('should not have the second signature property', () => {
			registerDelegateTransaction.should.not.have.property('signSignature');
		});

		it('should be signed correctly', () => {
			const result = cryptoModule.verifyTransaction(
				registerDelegateTransaction,
			);
			result.should.be.ok();
		});

		it('should not be signed correctly if modified', () => {
			registerDelegateTransaction.amount = 100;
			const result = cryptoModule.verifyTransaction(
				registerDelegateTransaction,
			);
			result.should.be.not.ok();
		});

		it('should have asset', () => {
			registerDelegateTransaction.should.have
				.property('asset')
				.and.not.be.empty();
		});

		describe('delegate asset', () => {
			it('should be an object', () => {
				registerDelegateTransaction.asset.should.have
					.property('delegate')
					.and.be.type('object');
			});

			it('should have the provided username as a string', () => {
				registerDelegateTransaction.asset.delegate.should.have
					.property('username')
					.and.be.type('string')
					.and.equal(username);
			});
		});
	});

	describe('with second secret', () => {
		beforeEach(() => {
			registerDelegateTransaction = registerDelegate({
				secret,
				username,
				secondSecret,
			});
		});

		it('should have the second signature property as hex string', () => {
			registerDelegateTransaction.should.have
				.property('signSignature')
				.and.be.hexString();
		});

		describe('verification of the created transaction', () => {
			it('should return true on a correctly signed transaction', () => {
				const result = cryptoModule.verifyTransaction(
					registerDelegateTransaction,
					secondPublicKey,
				);
				result.should.be.true();
			});

			it('should return false when modified', () => {
				registerDelegateTransaction.amount = 100;
				const result = cryptoModule.verifyTransaction(
					registerDelegateTransaction,
					secondPublicKey,
				);
				result.should.be.false();
			});
		});
	});
});
