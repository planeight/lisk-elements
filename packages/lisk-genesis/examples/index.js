import generateGenesisBlock from '../src';

const { block, accounts } = generateGenesisBlock();
console.log(block);
console.log(accounts);
