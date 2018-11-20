import { generateMnemonic } from 'bip39';
import { expect } from 'chai';
import transaction from '@liskhq/lisk-transactions'
import cryptography from '@liskhq/lisk-cryptography';
import { Transaction, TransactionPool } from '../src/transaction_pool';
import * as sinon from 'sinon';
// Require is used for stubbing
const Queue = require('../src/queue').Queue;
const utils = require('../src/utils');

function createRandomTransaction(): Transaction {
    const senderPassphrase = generateMnemonic();
    const receipientAccount = cryptography.getAddressAndPublicKeyFromPassphrase(generateMnemonic())

    // tslint:disable-next-line
    return transaction.transfer({
        amount: (Math.floor(Math.random() * 100000)).toString(),
        passphrase: senderPassphrase,
        recipientId: receipientAccount.address
    }) as Transaction;
}

describe('transaction pool', () => {
    let transactionPool: TransactionPool;
    let stubs: {
        [key: string]: sinon.SinonStub
    };

    beforeEach('add transactions in the transaction pool', () => {
        console.log('before -- Queue');
        console.log(Queue);
        const stubbedQueue = sinon.createStubInstance(Queue);
        console.log('stubbedQueue');
        console.log(stubbedQueue.prototype);
        console.log(Queue);
        stubs = {
            // queueRemoveForStub: sandbox.stub(Queue.prototype, 'removeFor'),
            queueDequeueUntilStub: sandbox.stub(Queue.prototype, 'dequeueUntil'),
            queueEnqueueOneStub: sandbox.stub(Queue.prototype, 'enqueueOne'),
            queueEnqueueManyStub:  sandbox.stub(Queue.prototype, 'enqueueMany'),
            checkTransactionPropertyForValuesStub: sandbox.stub(utils, 'checkTransactionPropertyForValues'),
            validateTransactionsStub: sandbox.stub(),
            verifyTransactionsStub: sandbox.stub(),
            readyTransactionsStub: sandbox.stub(),
        };

        transactionPool = new TransactionPool(stubs.validateTransactionsStub, stubs.verifyTransactionsStub, stubs.readyTransactionsStub);
    });

    afterEach(() => {
        return sandbox.restore();
    });
    
	describe('addTransactions', () => {});
	describe('getProcessableTransactions', () => {});
	describe('onNewBlock', () => {
        const block = {
            transactions: [createRandomTransaction(), createRandomTransaction(), createRandomTransaction()]
        };

        it('should call checkTransactionForProperty with block transaction ids and "id" property', () => {
            transactionPool.onNewBlock(block);
            const transactionIds = block.transactions.map(transaction => transaction.id);
            const idProperty = 'id';
            expect(stubs.checkTransactionPropertyForValuesStub.calledWithExactly(transactionIds, idProperty)).to.equal(true);
        });

        it('should call checkTransactionForProperty with block sender addresses and "senderId" property', () => {
            transactionPool.onNewBlock(block);
            const senderIds = block.transactions.map(transaction => transaction.senderId);
            const senderProperty = 'senderId';
            expect(stubs.checkTransactionPropertyForValuesStub.calledWithExactly(senderIds, senderProperty)).to.equal(true);
        });

        it('should call removeFor for all queues in the transaction pool', () => {
            transactionPool.onNewBlock(block);
            Object.keys(transactionPool.queues).forEach(queueName => {
                console.log('queueName')
                console.log(queueName)
                expect(transactionPool.queues[queueName].removeFor).to.be.calledTwice;
                // console.log((transactionPool.queues[queueName].removeFor.calledOnce));
            });
        });

        it('should move transactions where sender account is same for transactions in queues and new block', () => {});
        it('should not move transactions where sender account is not same for transactions in queues and new block', () => {});
    });

	describe('onRoundRollback', () => {});
	describe('verifyTransaction', () => {});
	describe('existsInTransactionPool', () => {});
	describe('expireTransactions', () => {});
	describe('processVerifiedTransactions', () => {});
	describe('validateReceivedTransactions', () => {});
	describe('verifyValidatedTransactions', () => {});
});