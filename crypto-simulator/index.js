import Block from './Block';

const testBlock = new Block(Date.now(), [{ from: "A", to: "B", amount: 100 }], "0");

console.log("⛏️ Mining block...");
testBlock.mineBlock(2); // Difficulty 2 (start with '00')

console.log(testBlock);



// import { ec as EC } from 'elliptic';
// import Transaction from './Transaction';
// const ec = new EC('secp256k1');

// // Create a key pair (wallet)
// const myKey = ec.genKeyPair();
// const myWalletAddress = myKey.getPublic('hex');

// // Create a new transaction
// const tx1 = new Transaction(myWalletAddress, 'recipient-address-123', 50);

// // Sign it with our private key
// tx1.signTransaction(myKey);

// // Verify it
// console.log('✅ Transaction valid?', tx1.isValid());



const EC = require('elliptic').ec;
const Blockchain = require('./Blockchain');
const Transaction = require('./Transaction');

const ec = new EC('secp256k1');
const myKey = ec.genKeyPair();
const myWalletAddress = myKey.getPublic('hex');

// Create your coin
const SatyamCoin = new Blockchain();
const saved = loadChain();
if (saved) {
  SatyamCoin.chain = saved;
}

// Create a transaction & sign it
const tx1 = new Transaction(myWalletAddress, 'receiver-address-abc', 10);
tx1.signTransaction(myKey);
SatyamCoin.addTransaction(tx1);

// Start mining
console.log('\n⛏️ Mining...');
SatyamCoin.minePendingTransactions(myWalletAddress);

console.log('\n💰 Balance:', SatyamCoin.getBalanceOfAddress(myWalletAddress));

// Try again to see mining reward in action
console.log('\n⛏️ Mining again...');
SatyamCoin.minePendingTransactions(myWalletAddress);

console.log('\n💰 Updated Balance:', SatyamCoin.getBalanceOfAddress(myWalletAddress));

