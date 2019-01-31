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
// tslint:disable-next-line no-reference
/// <reference path="../../types/browserify-bignum/index.d.ts" />

import {
	bigNumberToBuffer,
	getAddressAndPublicKeyFromPassphrase,
	getAddressFromPublicKey,
	hash,
	hexToBuffer,
	signData,
} from '@liskhq/lisk-cryptography';
import BigNum from 'browserify-bignum';
import {
	BYTESIZES,
	MAX_TRANSACTION_AMOUNT,
	UNCONFIRMED_MULTISIG_TRANSACTION_TIMEOUT,
	UNCONFIRMED_TRANSACTION_TIMEOUT,
} from '../constants';
import {
	convertToTransactionError,
	TransactionError,
	TransactionMultiError,
} from '../errors';
import { createResponse, Status, TransactionResponse } from '../response';
import { Account, TransactionJSON } from '../transaction_types';
import {
	checkTypes,
	convertBeddowsToLSK,
	getId,
	getTimeWithOffset,
	isUnique,
	validateId,
	validateSenderIdAndPublicKey,
	validator,
	verifySignature,
} from '../utils';
import { isTypedObjectArrayWithKeys } from '../utils/validation';
import * as schemas from '../utils/validation/schema';
import {
	verifyFee,
	verifyMultiSignature,
	verifySecondSignature,
	verifySecondSignatureWhenNotNeeded,
	verifySenderId,
	verifySenderPublicKey,
} from '../utils/verify';

export interface Attributes {
	readonly [entity: string]: {
		readonly [property: string]: ReadonlyArray<string>;
	};
}

export enum MultisignatureStatus {
	UNKNOWN = 0,
	NONMULTISIGNATURE = 1,
	PENDING = 2,
	READY = 3,
	FAIL = 4,
}

export interface EntityMap {
	readonly [name: string]: ReadonlyArray<unknown> | undefined;
}

export interface RequiredState {
	readonly sender: Account;
}

export const ENTITY_ACCOUNT = 'account';
export const ENTITY_TRANSACTION = 'transaction';
export interface CreateBaseTransactionInput {
	readonly passphrase?: string;
	readonly secondPassphrase?: string;
	readonly timeOffset?: number;
}

export const createBaseTransaction = ({
	passphrase,
	timeOffset,
}: CreateBaseTransactionInput) => {
	const { address: senderId, publicKey: senderPublicKey } = passphrase
		? getAddressAndPublicKeyFromPassphrase(passphrase)
		: { address: undefined, publicKey: undefined };
	const timestamp = getTimeWithOffset(timeOffset);

	return {
		amount: '0',
		recipientId: '',
		senderId,
		senderPublicKey,
		timestamp,
	};
};

export abstract class BaseTransaction {
	public readonly amount: BigNum;
	public readonly recipientId: string;
	public readonly recipientPublicKey?: string;
	public readonly senderId: string;
	public readonly senderPublicKey: string;
	public readonly signatures: string[];
	public readonly timestamp: number;
	public readonly type: number;
	public readonly receivedAt: Date;
	public readonly containsUniqueData?: boolean;

	protected _fee: BigNum;
	private _id?: string;
	private _multisignatureStatus: MultisignatureStatus =
		MultisignatureStatus.UNKNOWN;
	private _signature?: string;
	private _signSignature?: string;

	public abstract assetToJSON(): object;
	public abstract verifyAgainstOtherTransactions(
		transactions: ReadonlyArray<TransactionJSON>,
	): TransactionResponse;
	protected abstract getAssetBytes(): Buffer;

	public constructor(rawTransaction: TransactionJSON) {
		const { valid, errors } = checkTypes(rawTransaction);
		if (!valid) {
			throw new TransactionMultiError(
				'Invalid field types',
				rawTransaction.id,
				errors,
			);
		}

		this.amount = new BigNum(rawTransaction.amount);
		this._fee = new BigNum(rawTransaction.fee);
		this._id = rawTransaction.id;
		this.recipientId = rawTransaction.recipientId;
		this.recipientPublicKey = rawTransaction.recipientPublicKey;
		this.senderId =
			rawTransaction.senderId ||
			getAddressFromPublicKey(rawTransaction.senderPublicKey);
		this.senderPublicKey = rawTransaction.senderPublicKey;
		this._signature = rawTransaction.signature;
		this.signatures = (rawTransaction.signatures as string[]) || [];
		this._signSignature = rawTransaction.signSignature;
		this.timestamp = rawTransaction.timestamp;
		this.type = rawTransaction.type;
		this.receivedAt = rawTransaction.receivedAt || new Date();
	}

	public get fee(): BigNum {
		if (!this._fee) {
			throw new Error('fee is required to be set before use');
		}

		return this._fee;
	}

	public get id(): string {
		if (!this._id) {
			throw new Error('id is required to be set before use');
		}

		return this._id;
	}

	public get signature(): string {
		if (!this._signature) {
			throw new Error('signature is required to be set before use');
		}

		return this._signature;
	}

	public get signSignature(): string | undefined {
		return this._signSignature;
	}

	public toJSON(): TransactionJSON {
		const transaction = {
			id: this.id,
			amount: this.amount.toString(),
			type: this.type,
			timestamp: this.timestamp,
			senderPublicKey: this.senderPublicKey,
			senderId: this.senderId,
			recipientId: this.recipientId,
			recipientPublicKey: this.recipientPublicKey,
			fee: this.fee.toString(),
			signature: this.signature,
			signSignature: this.signSignature ? this.signSignature : undefined,
			signatures: this.signatures,
			asset: this.assetToJSON(),
			receivedAt: this.receivedAt,
		};

		return transaction;
	}

	public isReady(): boolean {
		return (
			this._multisignatureStatus === MultisignatureStatus.READY ||
			this._multisignatureStatus === MultisignatureStatus.NONMULTISIGNATURE
		);
	}

	public getBytes(): Buffer {
		const transactionBytes = Buffer.concat([
			this.getBasicBytes(),
			this._signature ? hexToBuffer(this._signature) : Buffer.alloc(0),
			this._signSignature ? hexToBuffer(this._signSignature) : Buffer.alloc(0),
		]);

		return transactionBytes;
	}

	public validateSchema(): TransactionResponse {
		const transaction = this.toJSON();
		validator.validate(schemas.baseTransaction, transaction);
		const errors = convertToTransactionError(
			this.id,
			validator.errors,
		) as TransactionError[];

		if (!errors.find(err => err.dataPath === '.senderPublicKey')) {
			// `senderPublicKey` passed format check, safely check equality to senderId
			const senderIdError = validateSenderIdAndPublicKey(
				this.id,
				this.senderId,
				this.senderPublicKey,
			);
			if (senderIdError) {
				errors.push(senderIdError);
			}
		}
		const idError = validateId(this.id, this.getBytes());
		if (idError) {
			errors.push(idError);
		}

		return createResponse(this.id, errors);
	}

	public validate(): TransactionResponse {
		const errors: TransactionError[] = [];
		const transactionBytes = this.getBasicBytes();

		const {
			verified: signatureVerified,
			error: verificationError,
		} = verifySignature(
			this.senderPublicKey,
			this.signature,
			transactionBytes,
			this.id,
		);

		if (!signatureVerified && verificationError) {
			errors.push(verificationError);
		}

		if (!isUnique(this.signatures)) {
			errors.push(
				new TransactionError(
					'Encountered duplicate signature in transaction',
					this.id,
					'.signatures',
				),
			);
		}

		return createResponse(this.id, errors);
	}

	public getRequiredAttributes(): Attributes {
		return {
			[ENTITY_ACCOUNT]: {
				address: [getAddressFromPublicKey(this.senderPublicKey)],
			},
		};
	}

	public processRequiredState(state: EntityMap): RequiredState {
		const accounts = state[ENTITY_ACCOUNT];
		if (!accounts) {
			throw new Error('Entity account is required.');
		}
		if (
			!isTypedObjectArrayWithKeys<Account>(accounts, ['address', 'publicKey'])
		) {
			throw new Error('Required state does not have valid account type.');
		}

		const sender = accounts.find(acct => acct.address === this.senderId);
		if (!sender) {
			throw new Error('No sender account is found.');
		}

		return {
			sender,
		};
	}

	public apply({ sender }: RequiredState): TransactionResponse {
		const secondSignatureTxBytes = Buffer.concat([
			this.getBasicBytes(),
			hexToBuffer(this.signature),
		]);
		const multiSignatureTxBytes = this.signSignature
			? secondSignatureTxBytes
			: this.getBasicBytes();

		// Verify Basic state
		const errors = [
			verifySenderPublicKey(this.id, sender, this.senderPublicKey),
			verifySenderId(this.id, sender, this.senderId),
			verifyFee(this.id, sender, this.fee),
			verifySecondSignatureWhenNotNeeded(this.id, sender, this.signSignature),
			verifySecondSignature(
				this.id,
				sender,
				this.signSignature,
				secondSignatureTxBytes,
			),
		];

		// Verify MultiSignature
		const {
			status: multiSigStatus,
			errors: multiSigError,
		} = verifyMultiSignature(
			this.id,
			sender,
			this.signatures,
			multiSignatureTxBytes,
		);
		this._multisignatureStatus = multiSigStatus;
		if (multiSigError) {
			errors.push(...multiSigError);
		}
		const filteredError = errors.filter(
			err => err !== undefined,
		) as TransactionError[];
		if (
			this._multisignatureStatus === MultisignatureStatus.PENDING &&
			filteredError.length === 0
		) {
			return {
				id: this.id,
				status: Status.PENDING,
				errors: [],
			};
		}

		if (!sender) {
			throw new Error('Sender is required.');
		}
		const updatedBalance = new BigNum(sender.balance).sub(this.fee);
		const updatedAccount = { ...sender, balance: updatedBalance.toString() };
		if (updatedBalance.lt(0)) {
			filteredError.push(
				new TransactionError(
					`Account does not have enough LSK: ${
						sender.address
					}, balance: ${convertBeddowsToLSK(sender.balance)}`,
					this.id,
				),
			);
		}

		return createResponse(this.id, filteredError);
	}

	public undo({ sender }: RequiredState): TransactionResponse {
		if (!sender) {
			throw new Error('Sender is required.');
		}
		const updatedBalance = new BigNum(sender.balance).add(this.fee);
		const updatedAccount = { ...sender, balance: updatedBalance.toString() };
		const errors = updatedBalance.lte(MAX_TRANSACTION_AMOUNT)
			? []
			: [new TransactionError('Invalid balance amount', this.id)];

		return createResponse(this.id, errors);
	}

	public addVerifiedMultisignature(signature: string): TransactionResponse {
		if (!this.signatures.includes(signature)) {
			this.signatures.push(signature);

			return createResponse(this.id);
		}

		return createResponse(this.id, [
			new TransactionError('Failed to add signature.', this.id, '.signatures'),
		]);
	}

	public processMultisignatures({
		sender,
	}: RequiredState): TransactionResponse {
		const transactionBytes = this.signSignature
			? Buffer.concat([this.getBasicBytes(), hexToBuffer(this.signature)])
			: this.getBasicBytes();

		const { status, errors } = verifyMultiSignature(
			this.id,
			sender,
			this.signatures,
			transactionBytes,
		);
		this._multisignatureStatus = status;
		if (
			this._multisignatureStatus === MultisignatureStatus.PENDING &&
			!errors
		) {
			return {
				id: this.id,
				status: Status.PENDING,
				errors: [],
			};
		}

		return createResponse(this.id, errors);
	}

	public isExpired(date: Date = new Date()): boolean {
		const MS = 1000;
		const timeNow = Math.floor(date.getTime() / MS);
		const timeOut =
			this._multisignatureStatus === MultisignatureStatus.PENDING ||
			this._multisignatureStatus === MultisignatureStatus.READY
				? UNCONFIRMED_MULTISIG_TRANSACTION_TIMEOUT
				: UNCONFIRMED_TRANSACTION_TIMEOUT;
		const timeElapsed = timeNow - Math.floor(this.receivedAt.getTime() / MS);

		return timeElapsed > timeOut;
	}

	public sign(passphrase: string, secondPassphrase?: string): void {
		this._signature = undefined;
		this._signSignature = undefined;
		this._signature = signData(hash(this.getBytes()), passphrase);
		if (secondPassphrase) {
			this._signSignature = signData(hash(this.getBytes()), secondPassphrase);
		}
		this._id = getId(this.getBytes());
	}

	protected getBasicBytes(): Buffer {
		const transactionType = Buffer.alloc(BYTESIZES.TYPE, this.type);
		const transactionTimestamp = Buffer.alloc(BYTESIZES.TIMESTAMP);
		transactionTimestamp.writeIntLE(this.timestamp, 0, BYTESIZES.TIMESTAMP);

		const transactionSenderPublicKey = hexToBuffer(this.senderPublicKey);

		const transactionRecipientID = this.recipientId
			? bigNumberToBuffer(this.recipientId.slice(0, -1), BYTESIZES.RECIPIENT_ID)
			: Buffer.alloc(BYTESIZES.RECIPIENT_ID);

		const transactionAmount = this.amount.toBuffer({
			endian: 'little',
			size: BYTESIZES.AMOUNT,
		});

		return Buffer.concat([
			transactionType,
			transactionTimestamp,
			transactionSenderPublicKey,
			transactionRecipientID,
			transactionAmount,
			this.getAssetBytes(),
		]);
	}

	public verify(_: RequiredState): TransactionResponse {
		return {
			id: this.id,
			status: Status.FAIL,
			errors: [],
		};
	}
}
