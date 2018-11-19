import { Transaction } from './transaction_pool';

export type transactionFilterableKeys = 'id' | 'recipientId' | 'senderId';

export const checkTransactionPropertyForValues = (values: ReadonlyArray<string>, propertyName: transactionFilterableKeys): (transaction: Transaction) => boolean =>
	(transaction: Transaction) => values.indexOf(transaction[propertyName]) !== -1;

export const checkTransactionForExpiryTime = (time: Date): (transaction: Transaction) => boolean => 
	(transaction: Transaction) => !!transaction.receivedAt && time.getTime() >= transaction.receivedAt.getTime()

export const returnTrueUntilLimit = (limit: number): (transaction: Transaction) => boolean => {
	// tslint:disable-next-line
	let current = 0;

	return (_) => ++current < limit;
}