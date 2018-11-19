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
import { flatMap } from 'lodash';
import { Queue } from './queue';
import { checkTransactionForExpiryTime, checkTransactionPropertyForValues, returnTrueUntilLimit, transactionFilterableKeys } from './utils';

export interface TransactionObject {
	readonly id: string;
	readonly recipientId: string;
	readonly senderId: string;
	// tslint:disable-next-line
	receivedAt?: Date;
}

export interface TransactionFunctions {
	verifyTransactionAgainstOtherTransactions?(transaction: Transaction, otherTransactions: ReadonlyArray<Transaction>): boolean;
}

export type Transaction = TransactionObject & TransactionFunctions; 

interface Block {
	readonly transactions: ReadonlyArray<Transaction>;
}

interface Queues {
	readonly [queue: string]: Queue;
}

interface ProcessTransactionsResponse {
	readonly errors: ReadonlyArray<Error>
	readonly invalidTransactions: ReadonlyArray<Transaction>;
	readonly validTransactions: ReadonlyArray<Transaction>;
}

type processTransactions = (transactions: ReadonlyArray<Transaction>) => ProcessTransactionsResponse;

export class TransactionPool {
	private applyTransactions: processTransactions;
	private queues: Queues;
	private validateTransactions: processTransactions;
	private verifyTransactions: processTransactions;

	public constructor (validateTransactions:processTransactions, verifyTransactions: processTransactions, applyTransactions: processTransactions) {
		this.queues = {
			received: new Queue(),
			validated: new Queue(),
			verified: new Queue(),
			pending: new Queue(),
			ready: new Queue(),
		};
		this.validateTransactions = validateTransactions;
		this.verifyTransactions =  verifyTransactions;
		this.applyTransactions = applyTransactions;
	}

	public addTransactions(transactions: ReadonlyArray<Transaction>): void {
		transactions.forEach((transaction: Transaction) => {
			if (this.existsInTransactionPool(transaction)) {
				this.queues.received.enqueueOne(transaction);
			}
		});
	}

	public getProcessableTransactions(limit: number): ReadonlyArray<Transaction> {
		return this.queues.ready.dequeueUntil(returnTrueUntilLimit(limit));
	}

	public onDeleteBlock(block: Block): void {
		// Move transactions from the verified, multisignature and ready queues to the validated queue where account was a receipient in the delete block
		const transactionsRecipient = block.transactions.map(transaction => transaction.recipientId);
		const receipientProperty: transactionFilterableKeys = 'recipientId';
		const {
			received,
			validated,
			...otherQueues
		} = this.queues;

		const transactionsToAffectedAccounts = flatMap(Object.keys(otherQueues).map(queueName => 
			this.queues[queueName].removeFor(checkTransactionPropertyForValues(transactionsRecipient, receipientProperty))
		));

		this.queues.validated.enqueueMany(transactionsToAffectedAccounts);

		// Add transactions to the verfied queue which were included in the deleted block
		this.queues.verified.enqueueMany(block.transactions);
	}

	public onNewBlock(block: Block): void {
		// Remove transactions in the transaction pool which were included in the new block
		const idProperty: transactionFilterableKeys = 'id';
		const transactionIds = block.transactions.map(transaction => transaction[idProperty]);
		Object.keys(this.queues).forEach(queueName => this.queues[queueName].removeFor(checkTransactionPropertyForValues(transactionIds, idProperty)));

		// Move transactions from the verified, multisignature and ready queues to validated queue which were sent from the accounts in the new block 
		const senderProperty: transactionFilterableKeys = 'senderId';
		const transactionsSenders = block.transactions.map(transaction => transaction[senderProperty]);
		const {
			received,
			validated,
			...otherQueues
		} = this.queues;
		const transactionsFromAffectedAccounts = flatMap(Object.keys(otherQueues).map(queueName => 
				this.queues[queueName].removeFor(checkTransactionPropertyForValues(transactionsSenders, senderProperty))
		));

		this.queues.validated.enqueueMany(transactionsFromAffectedAccounts);
	}

	public onRoundRollback(delegates: ReadonlyArray<string>): void {
		// Move transactions from the verified, multisignature and ready queues to the validated queue which were sent from delegate accounts
		const {
			received,
			validated,
			...otherQueues
		} = this.queues;
		const senderProperty: transactionFilterableKeys = 'senderId';
		const transactionsFromAffectedAccounts = flatMap(Object.keys(otherQueues).map(queueName => 
				this.queues[queueName].removeFor(checkTransactionPropertyForValues(delegates, senderProperty))
		));

		this.queues.validated.enqueueMany(transactionsFromAffectedAccounts);
	}

	public verifyTransaction(): Queues {
		return this.queues;
	}

	private existsInTransactionPool(transaction: Transaction): boolean {
		return Object.keys(this.queues).reduce((previousValue, currentValue) => previousValue || this.queues[currentValue].exists(transaction), false);
	}

	private expireTransactions(): void {
		const expiryTime = new Date();
		Object.keys(this.queues).forEach(queueName => {
			this.queues[queueName].removeFor(checkTransactionForExpiryTime(expiryTime));
		});
	}

	private processVerifiedTransactions(): void {
		const numberOfTransactionsToVerify = 100;
		const transactionsToValidate = this.queues.validated.dequeueUntil(returnTrueUntilLimit(numberOfTransactionsToVerify));
		this.applyTransactions(transactionsToValidate);
	}

	private validateReceivedTransactions(): void {
		const numberOfTransactionsToValidate = 100;
		const transactionsToValidate = this.queues.received.dequeueUntil(returnTrueUntilLimit(numberOfTransactionsToValidate));
		this.validateTransactions(transactionsToValidate);
	}

	private verifyValidatedTransactions(transactions: ReadonlyArray<Transaction>): void {
		const numberOfTransactionsToVerify = 100;
		const transactionsToVerify = this.queues.validated.dequeueUntil(returnTrueUntilLimit(numberOfTransactionsToVerify));
		this.verifyTransactions(transactionsToVerify);
	}
}