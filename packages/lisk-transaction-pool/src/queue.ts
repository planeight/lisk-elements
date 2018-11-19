import { takeRightWhile } from 'lodash';
import { Transaction } from './transaction_pool';

// tslint:disable
interface QueueIndex {
	// tslint:disable-next-line
	[index: string]: Transaction;
}

export class Queue {
	// tslint:disable-next-line
	private _transactions: ReadonlyArray<Transaction>;
	// tslint:disable-next-line
	private _index: QueueIndex;

	public get transactions(): ReadonlyArray<Transaction> {
		return this._transactions;
	}

	public get index(): QueueIndex {
		return this._index;
	}

	public constructor() {
		this._transactions = [];
		this._index = {};
	}

	public dequeueUntil(
		condition: (transaction: Transaction) => boolean,
	): ReadonlyArray<Transaction> {
		return this.transactions;
	}

	public enqueueMany(transactions: ReadonlyArray<Transaction>): void {
		return;
	}

	public enqueueOne(transaction: Transaction): void {
		return;
	}

	public exists(transaction: Transaction): boolean {
		return !!this._index[transaction.id];
	}

	public removeFor(
		condition: (transaction: Transaction) => boolean,
	): ReadonlyArray<Transaction> {
		return this._transactions;
	}
}
