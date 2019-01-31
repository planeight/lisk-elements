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
import BigNum from 'browserify-bignum';
import { TransactionError, TransactionPendingError } from '../errors';
import { Account } from '../transaction_types';
import { MultisignatureStatus } from '../transactions/base';
import {
	convertBeddowsToLSK,
	verifyMultisignatures,
	verifySignature,
} from '../utils';

export const verifySenderPublicKey = (
	id: string,
	sender: Account,
	publicKey: string,
): TransactionError | undefined =>
	sender.publicKey !== publicKey
		? new TransactionError('Invalid sender publicKey', id, '.senderPublicKey')
		: undefined;

export const verifySenderId = (
	id: string,
	sender: Account,
	address: string,
): TransactionError | undefined =>
	sender.address.toUpperCase() !== address.toUpperCase()
		? new TransactionError('Invalid sender address', id, '.senderId')
		: undefined;

export const verifyFee = (
	id: string,
	sender: Account,
	fee: BigNum,
): TransactionError | undefined =>
	new BigNum(sender.balance).lt(new BigNum(fee))
		? new TransactionError(
				id,
				`Account does not have enough LSK: ${
					sender.address
				}, balance: ${convertBeddowsToLSK(sender.balance.toString())}`,
				'.fee',
		  )
		: undefined;

export const verifySecondSignatureWhenNotNeeded = (
	id: string,
	sender: Account,
	signSignature?: string,
): TransactionError | undefined =>
	!sender.secondPublicKey && signSignature
		? new TransactionError(
				'Sender does not have a secondPublicKey',
				id,
				'.signSignature',
		  )
		: undefined;

export const verifySecondSignature = (
	id: string,
	sender: Account,
	signSignature: string | undefined,
	transactionBytes: Buffer,
): TransactionError | undefined => {
	if (!sender.secondPublicKey) {
		return undefined;
	}
	if (!signSignature) {
		return new TransactionError('Missing signSignature', id, '.signSignature');
	}
	const { verified, error } = verifySignature(
		sender.secondPublicKey,
		signSignature,
		transactionBytes,
		id,
	);
	if (verified) {
		return undefined;
	}

	return error;
};

interface VerifyMultiSignatureResult {
	readonly status: MultisignatureStatus;
	readonly errors: ReadonlyArray<TransactionError>;
}

export const verifyMultiSignature = (
	id: string,
	sender: Account,
	signatures: ReadonlyArray<string>,
	transactionBytes: Buffer,
): VerifyMultiSignatureResult => {
	if (
		!(
			sender.multisignatures &&
			sender.multisignatures.length > 0 &&
			sender.multimin
		)
	) {
		return {
			status: MultisignatureStatus.NONMULTISIGNATURE,
			errors: [],
		};
	}

	const { verified, errors } = verifyMultisignatures(
		sender.multisignatures,
		signatures,
		sender.multimin,
		transactionBytes,
		id,
	);

	if (verified) {
		return {
			status: MultisignatureStatus.READY,
			errors: [],
		};
	}

	if (
		errors &&
		errors.length === 1 &&
		errors[0] instanceof TransactionPendingError
	) {
		return {
			status: MultisignatureStatus.PENDING,
			errors,
		};
	}

	return {
		status: MultisignatureStatus.FAIL,
		errors: errors || [],
	};
};
