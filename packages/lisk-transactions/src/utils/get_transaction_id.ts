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
import * as cryptography from '@liskhq/lisk-cryptography';
import { TransactionJSON } from '../transaction_types';
import { getTransactionBytes } from './get_transaction_bytes';

export const getId = (transactionBytes: Buffer): string => {
	const transactionHash = cryptography.hash(transactionBytes);
	const bufferFromFirstEntriesReversed = cryptography.getFirstEightBytesReversed(
		transactionHash,
	);
	const transactionId = cryptography.bufferToBigNumberString(
		bufferFromFirstEntriesReversed,
	);

	return transactionId;
};

// FIXME: Deprecated
export const getTransactionId = (transaction: TransactionJSON): string => {
	const transactionBytes = getTransactionBytes(transaction);
	const transactionHash = cryptography.hash(transactionBytes);
	const bufferFromFirstEntriesReversed = cryptography.getFirstEightBytesReversed(
		transactionHash,
	);
	const firstEntriesToNumber = cryptography.bufferToBigNumberString(
		bufferFromFirstEntriesReversed,
	);

	return firstEntriesToNumber;
};
