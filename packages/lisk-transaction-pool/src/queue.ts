import { takeRightWhile } from 'lodash';
import { Transaction } from  './transaction_pool';

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
		return this._index
	}

	public constructor() {
		this._transactions = [];
		this._index = {};
	}

	public enqueueMany(transactions: ReadonlyArray<Transaction>): void {
		this._transactions = [...transactions, ...this._transactions];

		transactions.forEach((transaction: Transaction) => {
			this._index[transaction.id] = transaction;
		});
	}

	public enqueueOne(transaction: Transaction): void {
		this._transactions = [transaction, ...this._transactions];
		this._index[transaction.id] = transaction;
	}

	public exists(transaction: Transaction): boolean {
		return !!this._index[transaction.id];
	}

	public removeFor(condition: (transaction: Transaction) => boolean): ReadonlyArray<Transaction> {
	 	// tslint:disable
		interface ReduceObjectInterface {
			effected: Array<Transaction>;
			uneffected: Array<Transaction>;
		}

		const { uneffected, effected } = this._transactions.reduce(({effected, uneffected}: ReduceObjectInterface, transaction: Transaction) => {
			if (condition(transaction)) {
				 effected.push(transaction)
				 delete this._index[transaction.id];
			} else {
				uneffected.push(transaction);
			}

			return {effected, uneffected};
		}, {uneffected: [], effected: []});
		this._transactions = uneffected;

		return effected;
	}

	public dequeueUntil(condition: (transaction: Transaction) => boolean): ReadonlyArray<Transaction> {
		// Take transactions from the end as long as the condtion passes for transactions in queue
		const dequeuedTransactions = takeRightWhile(this._transactions, condition); 
		// Remove transactions which pass the condition from the queue
		this._transactions = this._transactions.slice(0, this.transactions.length - dequeuedTransactions.length);
		dequeuedTransactions.forEach((transaction: Transaction) => {
			delete this._index[transaction.id];
		});

		return dequeuedTransactions;
	}
}