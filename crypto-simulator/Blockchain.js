import Block from "./Block.js";
import Transaction from "./Transaction.js";

class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = 2;
    this.pendingTransactions = [];
    this.miningReward = 100;
    this.maxTransactionsPerBlock = 10;
    this.targetBlockTime = 30000; // 30 seconds in milliseconds
    this.difficultyAdjustmentInterval = 10; // Adjust every 10 blocks
  }

  createGenesisBlock() {
    const genesisBlock = new Block(Date.now(), [], "0");
    genesisBlock.hash = genesisBlock.calculateHash();
    return genesisBlock;
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  // Dynamic difficulty adjustment
  adjustDifficulty() {
    if (this.chain.length % this.difficultyAdjustmentInterval !== 0) {
      return;
    }

    const latestBlock = this.getLatestBlock();
    const prevAdjustmentBlock =
      this.chain[this.chain.length - this.difficultyAdjustmentInterval];

    const timeExpected =
      this.targetBlockTime * this.difficultyAdjustmentInterval;
    const timeTaken = latestBlock.timestamp - prevAdjustmentBlock.timestamp;

    if (timeTaken < timeExpected / 2) {
      this.difficulty++;
      console.log(`📈 Difficulty increased to ${this.difficulty}`);
    } else if (timeTaken > timeExpected * 2) {
      this.difficulty = Math.max(1, this.difficulty - 1);
      console.log(`📉 Difficulty decreased to ${this.difficulty}`);
    }
  }

  minePendingTransactions(miningRewardAddress) {
    // Allow mining even with no pending transactions (empty block with just reward)
    let transactionsToMine = [];
    let totalFees = 0;

    if (this.pendingTransactions.length > 0) {
      // Take only the first maxTransactionsPerBlock transactions
      transactionsToMine = this.pendingTransactions.splice(
        0,
        this.maxTransactionsPerBlock
      );

      // Calculate total fees collected
      totalFees = transactionsToMine.reduce((sum, tx) => sum + tx.fee, 0);
    }

    // Create mining reward transaction (reward + fees)
    const rewardTx = new Transaction(
      null,
      miningRewardAddress,
      this.miningReward + totalFees
    );
    transactionsToMine.push(rewardTx);

    const block = new Block(
      Date.now(),
      transactionsToMine,
      this.getLatestBlock().hash
    );
    block.mineBlock(this.difficulty);

    console.log("🧱 Block successfully mined!");
    console.log(
      `   Transactions in block: ${transactionsToMine.length - 1} + 1 reward`
    );
    console.log(`   Mining reward: ${this.miningReward + totalFees} STC`);

    this.chain.push(block);

    // Adjust difficulty after adding block
    this.adjustDifficulty();

    return block;
  }

  addTransaction(transaction) {
    if (!transaction.areAddressesValid()) {
      throw new Error("Transaction must include valid from and to addresses");
    }

    if (!transaction.isAmountValid()) {
      throw new Error("Transaction amount must be positive and valid");
    }

    if (!transaction.isValid()) {
      throw new Error("Cannot add invalid transaction to chain");
    }

    // Check if sender has sufficient balance
    const senderBalance = this.getBalanceOfAddress(transaction.fromAddress);
    if (senderBalance < transaction.amount + transaction.fee) {
      throw new Error("Insufficient balance for transaction and fee");
    }

    // Check for double spending (same transaction hash already exists)
    if (this.transactionExists(transaction.calculateHash())) {
      throw new Error("Transaction already exists in the blockchain");
    }

    this.pendingTransactions.push(transaction);
    console.log(
      `💸 Transaction added: ${
        transaction.amount
      } coins from ${transaction.fromAddress.substring(
        0,
        8
      )}... to ${transaction.toAddress.substring(0, 8)}...`
    );
  }

  transactionExists(txHash) {
    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.calculateHash() === txHash) {
          return true;
        }
      }
    }
    return false;
  }

  getBalanceOfAddress(address) {
    let balance = 0;

    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.fromAddress === address) {
          balance -= tx.amount + tx.fee;
        }

        if (tx.toAddress === address) {
          balance += tx.amount;
        }
      }
    }

    return balance;
  }

  getTransactionHistory(address) {
    const transactions = [];

    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.fromAddress === address || tx.toAddress === address) {
          transactions.push({
            ...tx,
            blockTimestamp: block.timestamp,
            blockHash: block.hash,
          });
        }
      }
    }

    return transactions.sort((a, b) => b.blockTimestamp - a.blockTimestamp);
  }

  // Get blockchain statistics
  getBlockchainStats() {
    const totalBlocks = this.chain.length;
    const totalTransactions = this.chain.reduce(
      (sum, block) => sum + block.transactions.length,
      0
    );
    const totalSupply = this.chain.reduce((sum, block) => {
      return (
        sum +
        block.transactions.reduce((blockSum, tx) => {
          return tx.fromAddress === null ? blockSum + tx.amount : blockSum;
        }, 0)
      );
    }, 0);

    return {
      totalBlocks,
      totalTransactions,
      totalSupply,
      difficulty: this.difficulty,
      pendingTransactions: this.pendingTransactions.length,
      miningReward: this.miningReward,
    };
  }

  // Get mempool (pending transactions)
  getMempool() {
    return this.pendingTransactions.map((tx) => ({
      ...tx.toJSON(),
      hash: tx.calculateHash(),
    }));
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // Check if all transactions in the block are valid
      if (!currentBlock.hasValidTransactions()) {
        console.error(`Invalid transactions in block ${i}`);
        return false;
      }

      // Check if current block's hash is correct
      if (currentBlock.hash !== currentBlock.calculateHash()) {
        console.error(`Invalid hash in block ${i}`);
        return false;
      }

      // Check if current block points to previous block
      if (currentBlock.previousHash !== previousBlock.hash) {
        console.error(`Invalid previous hash in block ${i}`);
        return false;
      }

      // Check if block meets difficulty requirement
      if (
        currentBlock.hash.substring(0, this.difficulty) !==
        Array(this.difficulty + 1).join("0")
      ) {
        console.error(`Block ${i} doesn't meet difficulty requirement`);
        return false;
      }
    }

    return true;
  }

  // Get block by hash
  getBlockByHash(hash) {
    return this.chain.find((block) => block.hash === hash);
  }

  // Get transaction by hash
  getTransactionByHash(hash) {
    for (const block of this.chain) {
      const transaction = block.transactions.find(
        (tx) => tx.calculateHash() === hash
      );
      if (transaction) {
        return {
          transaction,
          blockHash: block.hash,
          blockTimestamp: block.timestamp,
        };
      }
    }
    return null;
  }

  toJSON() {
    return {
      chain: this.chain.map((block) => block.toJSON()),
      difficulty: this.difficulty,
      pendingTransactions: this.pendingTransactions.map((tx) => tx.toJSON()),
      miningReward: this.miningReward,
    };
  }
}

export default Blockchain;
