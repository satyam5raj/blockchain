import express from 'express';
import { json } from 'body-parser';
import { ec as EC } from 'elliptic';
import Blockchain from './Blockchain';
import Transaction from './Transaction';
import { createWallet } from './Wallet';
import { saveChain, loadChain } from './storage';

const ec = new EC('secp256k1');
const app = express();
const PORT = 3000;

app.use(json());

// TEMP: Generate a wallet for demo (normally you'd store this securely)
const myKey = ec.genKeyPair();
const myWalletAddress = myKey.getPublic('hex');

const SatyamCoin = new Blockchain();

// === ROUTES ===

app.get('/', (req, res) => {
  res.send('🪙 Welcome to the SatyamCoin API!');
});

app.get('/chain', (req, res) => {
  res.json(SatyamCoin.chain);
});

app.get('/balance/:address', (req, res) => {
  const balance = SatyamCoin.getBalanceOfAddress(req.params.address);
  res.json({ address: req.params.address, balance });
});

app.post('/transaction', (req, res) => {
  const { toAddress, amount } = req.body;

  if (!toAddress || !amount) {
    return res.status(400).send('Missing toAddress or amount');
  }

  const tx = new Transaction(myWalletAddress, toAddress, amount);
  tx.signTransaction(myKey);
  SatyamCoin.addTransaction(tx);

  res.send('Transaction added and signed successfully.');
});

app.get('/mine', (req, res) => {
  SatyamCoin.minePendingTransactions(myWalletAddress);
  saveChain(SatyamCoin.chain); // 🔐 Save after mining
  res.send('Block mined and saved!');
});

app.get('/wallet/new', (req, res) => {
  const wallet = createWallet();
  res.json(wallet);
});

app.get('/transactions/:address', (req, res) => {
  const address = req.params.address;
  const txs = [];

  for (const block of SatyamCoin.chain) {
    for (const tx of block.transactions) {
      if (tx.fromAddress === address || tx.toAddress === address) {
        txs.push(tx);
      }
    }
  }

  res.json({ address, transactions: txs });
});


// Start server
app.listen(PORT, () => {
  console.log(`🚀 SatyamCoin server running at http://localhost:${PORT}`);
  console.log(`💼 Wallet address: ${myWalletAddress}`);
});
