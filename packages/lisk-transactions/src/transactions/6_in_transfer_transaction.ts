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
import { IN_TRANSFER_FEE } from '../constants';
import { TransactionError, TransactionMultiError } from '../errors';
import { Account, Status, TransactionJSON } from '../transaction_types';
import { convertBeddowsToLSK } from '../utils';
import { validator } from '../utils/validation';
import {
	BaseTransaction,
	ENTITY_ACCOUNT,
	ENTITY_TRANSACTION,
	StateStore,
	StateStorePrepare,
} from './base';

const TRANSACTION_INTRANSFER_TYPE = 6;

export interface InTransferAsset {
	readonly inTransfer: {
		readonly dappId: string;
	};
}

export const inTransferAssetTypeSchema = {
	type: 'object',
	required: ['inTransfer'],
	properties: {
		inTransfer: {
			type: 'object',
			required: ['dappId'],
			properties: {
				dappId: {
					type: 'string',
				},
			},
		},
	},
};

export const inTransferAssetFormatSchema = {
	type: 'object',
	required: ['inTransfer'],
	properties: {
		inTransfer: {
			type: 'object',
			required: ['dappId'],
			properties: {
				dappId: {
					type: 'string',
					format: 'id',
				},
			},
		},
	},
};

export class InTransferTransaction extends BaseTransaction {
	public readonly asset: InTransferAsset;

	public constructor(tx: TransactionJSON) {
		super(tx);
		const typeValid = validator.validate(inTransferAssetTypeSchema, tx.asset);
		const errors = validator.errors
			? validator.errors.map(
					error =>
						new TransactionError(
							`'${error.dataPath}' ${error.message}`,
							tx.id,
							error.dataPath,
						),
			  )
			: [];
		if (!typeValid) {
			throw new TransactionMultiError('Invalid field types', tx.id, errors);
		}
		this.asset = tx.asset as InTransferAsset;
		this._fee = new BigNum(IN_TRANSFER_FEE);
	}

	public static fromJSON(tx: TransactionJSON): InTransferTransaction {
		const transaction = new InTransferTransaction(tx);
		const { errors, status } = transaction.validate();

		if (status === Status.FAIL && errors.length !== 0) {
			throw new TransactionMultiError(
				'Failed to validate schema.',
				tx.id,
				errors,
			);
		}

		return transaction;
	}

	protected getAssetBytes(): Buffer {
		return Buffer.from(this.asset.inTransfer.dappId, 'utf8');
	}

	public async prepareTransaction(store: StateStorePrepare): Promise<void> {
		const transactions = await store.prepare(ENTITY_TRANSACTION, {
			id_in: [this.asset.inTransfer.dappId],
		});

		const dappTransaction = (transactions as ReadonlyArray<
			TransactionJSON
		>).find(tx => tx.id === this.asset.inTransfer.dappId);

		const filterObject = dappTransaction
			? {
					address_in: [this.senderId, dappTransaction.senderId as string],
			  }
			: {
					address_in: [this.senderId],
			  };

		await store.prepare(ENTITY_ACCOUNT, filterObject);
	}

	public assetToJSON(): object {
		return {
			...this.asset,
		};
	}

	// tslint:disable-next-line prefer-function-over-method
	protected verifyAgainstTransactions(
		_: ReadonlyArray<TransactionJSON>,
	): ReadonlyArray<TransactionError> {
		return [];
	}

	protected validateAsset(): ReadonlyArray<TransactionError> {
		validator.validate(inTransferAssetFormatSchema, this.asset);
		const errors = validator.errors
			? validator.errors.map(
					error =>
						new TransactionError(
							`'${error.dataPath}' ${error.message}`,
							this.id,
							error.dataPath,
						),
			  )
			: [];

		if (this.type !== TRANSACTION_INTRANSFER_TYPE) {
			errors.push(new TransactionError('Invalid type', this.id, '.type'));
		}

		// Per current protocol, this recipientId and recipientPublicKey must be empty
		if (this.recipientId) {
			errors.push(
				new TransactionError(
					'Recipient id must be empty',
					this.id,
					'.recipientId',
				),
			);
		}

		if (this.recipientPublicKey) {
			errors.push(
				new TransactionError(
					'Recipient public key must be empty',
					this.id,
					'.recipientPublicKey',
				),
			);
		}

		if (this.amount.lte(0)) {
			errors.push(
				new TransactionError(
					'Amount must be greater than 0',
					this.id,
					'.amount',
				),
			);
		}

		if (!this.fee.eq(IN_TRANSFER_FEE)) {
			errors.push(
				new TransactionError(
					`Fee must be equal to ${IN_TRANSFER_FEE}`,
					this.id,
					'.fee',
				),
			);
		}

		return errors;
	}

	protected applyAsset(store: StateStore): ReadonlyArray<TransactionError> {
		const errors: TransactionError[] = [];
		const idExists = store.exists(
			ENTITY_TRANSACTION,
			'id',
			this.asset.inTransfer.dappId,
		);

		if (!idExists) {
			errors.push(
				new TransactionError(
					`Application not found: ${this.asset.inTransfer.dappId}`,
					this.id,
				),
			);
		}
		const sender = store.get<Account>(ENTITY_ACCOUNT, 'address', this.senderId);

		const updatedBalance = new BigNum(sender.balance).sub(this.amount);
		if (updatedBalance.lt(0)) {
			errors.push(
				new TransactionError(
					`Account does not have enough LSK: ${
						sender.address
					}, balance: ${convertBeddowsToLSK(sender.balance)}.`,
					this.id,
				),
			);
		}
		const updatedSender = { ...sender, balance: updatedBalance.toString() };

		store.set<Account>(ENTITY_ACCOUNT, updatedSender);

		const dappTransaction = store.get<TransactionJSON>(
			ENTITY_TRANSACTION,
			'id',
			this.asset.inTransfer.dappId,
		);

		const recipient = store.get<Account>(
			ENTITY_ACCOUNT,
			'address',
			dappTransaction.senderId as string,
		);

		const updatedRecipientBalance = new BigNum(recipient.balance).add(
			this.amount,
		);
		const updatedRecipient = {
			...recipient,
			balance: updatedRecipientBalance.toString(),
		};

		store.set<Account>(ENTITY_ACCOUNT, updatedRecipient);

		return errors;
	}

	protected undoAsset(store: StateStore): ReadonlyArray<TransactionError> {
		const errors = [];
		const sender = store.get<Account>(ENTITY_ACCOUNT, 'address', this.senderId);
		const updatedBalance = new BigNum(sender.balance).add(this.amount);
		const updatedSender = { ...sender, balance: updatedBalance.toString() };

		store.set<Account>(ENTITY_ACCOUNT, updatedSender);

		const dappTransaction = store.get<TransactionJSON>(
			ENTITY_TRANSACTION,
			'id',
			this.asset.inTransfer.dappId,
		);

		const recipient = store.get<Account>(
			ENTITY_ACCOUNT,
			'address',
			dappTransaction.senderId as string,
		);

		const updatedRecipientBalance = new BigNum(recipient.balance).sub(
			this.amount,
		);

		if (updatedRecipientBalance.lt(0)) {
			errors.push(
				new TransactionError(
					`Account does not have enough LSK: ${
						recipient.address
					}, balance: ${convertBeddowsToLSK(recipient.balance)}.`,
					this.id,
				),
			);
		}
		const updatedRecipient = {
			...recipient,
			balance: updatedRecipientBalance.toString(),
		};

		store.set<Account>(ENTITY_ACCOUNT, updatedRecipient);

		return errors;
	}
}
