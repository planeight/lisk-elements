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

import { getBlockBytes, getBlockId } from '../src/generate_genesis_block';
import defaultBlock from '../fixtures/block.json';

describe('Generate genesis block', () => {
	const defaultBlockHash =
		'00000000c0b21900848f52d212fb9f261500000083c9d5ef000000008058840c000000000065cd1d00000000d90e000040aa7dc0114977bb3b8b04ec0a5a7a298212ce1fbbd15038e39f0ac4f53f118f4f12f49ee704d8554dc3dc392ba3ecf7a6e6f700b291fd77f75181cb48e34ad6';
	const defaultBlockHashWithSignature =
		'00000000c0b21900848f52d212fb9f261500000083c9d5ef000000008058840c000000000065cd1d00000000d90e000040aa7dc0114977bb3b8b04ec0a5a7a298212ce1fbbd15038e39f0ac4f53f118f4f12f49ee704d8554dc3dc392ba3ecf7a6e6f700b291fd77f75181cb48e34ad6c9c8a9a0d0ba1c8ee519792f286d751071de588448eb984ddd9fe4ea0fe34db474692407004047068dee785abca22a744203fb0342b5404349fa9d6abab1480d';

	it('should have the correct block hash', () => {
		return expect(getBlockBytes(defaultBlock).toString('hex')).to.be.eql(
			defaultBlockHash,
		);
	});

	it('should have the correct block id', () => {
		return expect(
			getBlockId(Buffer.from(defaultBlockHashWithSignature, 'hex')),
		).to.be.eql(defaultBlock.id);
	});
});
