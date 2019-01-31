import { TransactionError } from './errors';

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

export enum Status {
	FAIL = 0,
	OK = 1,
	PENDING = 2,
}

export interface TransactionResponse {
	readonly id: string;
	readonly status: Status;
	readonly errors: ReadonlyArray<TransactionError>;
	// TODO: Remove state
	// tslint:disable-next-line no-any
	readonly state?: any;
}

export const createResponse = (
	id: string,
	errors?: ReadonlyArray<TransactionError>,
) => ({
	id,
	status: errors && errors.length > 0 ? Status.FAIL : Status.OK,
	errors: errors ? errors : [],
});
