import { Transaction } from './transaction_pool';

export type transactionFilterableKeys = 'id' | 'recipientId' | 'senderId';

export const checkTransactionPropertyForValues = (
	values: ReadonlyArray<string>,
	propertyName: transactionFilterableKeys,
): ((transaction: Transaction) => boolean) => (transaction: Transaction) =>
	true;

export const checkTransactionForExpiryTime = (
	time: Date,
): ((transaction: Transaction) => boolean) => (transaction: Transaction) =>
	true;

export const returnTrueUntilLimit = (
	limit: number,
): ((transaction: Transaction) => boolean) => () => true;
