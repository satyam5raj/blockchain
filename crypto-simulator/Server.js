import express from "express";
import cors from "cors";
import { ec as EC } from "elliptic";
import Blockchain from "./Blockchain.js";
import Transaction from "./Transaction.js";
import Wallet, {
  createWallet,
  createWalletWithPrivateKey,
  importWallet,
  validateAddress,
} from "./Wallet.js";
import {
  saveChain,
  loadChain,
  saveWallet,
  loadWallet,
  getAllWallets,
  saveConfig,
  loadConfig,
  createBackup,
  getDataStats,
} from "./storage.js";

const ec = new EC("secp256k1");
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(cors());
app.use(express.static("public")); // Serve static files

// Initialize blockchain
let SatyamCoin;
try {
  const savedChain = loadChain();
  SatyamCoin = new Blockchain();
  if (savedChain && savedChain.length > 1) {
    SatyamCoin.chain = savedChain;
    console.log(
      `🔗 Loaded existing blockchain with ${savedChain.length} blocks`
    );
  }
} catch (error) {
  console.error("Error loading blockchain:", error);
  SatyamCoin = new Blockchain();
}

// Load configuration
const config = loadConfig();
SatyamCoin.difficulty = config.difficulty || 2;
SatyamCoin.miningReward = config.miningReward || 100;

// Demo wallet (in production, this would be more secure)
const myKey = ec.genKeyPair();
const myWalletAddress = myKey.getPublic("hex");

console.log(`💼 Demo wallet address: ${myWalletAddress}`);

// === BASIC ROUTES ===

app.get("/", (req, res) => {
  res.json({
    message: "🪙 Welcome to the SatyamCoin API!",
    version: "2.0.0",
    endpoints: [
      "GET /",
      "GET /chain",
      "GET /stats",
      "GET /balance/:address",
      "GET /transaction/:hash",
      "GET /block/:hash",
      "GET /transactions/:address",
      "GET /mempool",
      "POST /transaction",
      "POST /transaction/batch",
      "GET /mine",
      "POST /mine",
      "GET /wallet/new",
      "POST /wallet/import",
      "GET /wallet/:address",
      "GET /wallets",
      "POST /config",
      "GET /config",
      "POST /backup",
      "GET /validate",
    ],
  });
});

// === BLOCKCHAIN ROUTES ===

app.get("/chain", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const paginatedChain = SatyamCoin.chain.slice(startIndex, endIndex);

  res.json({
    blocks: paginatedChain,
    totalBlocks: SatyamCoin.chain.length,
    page,
    limit,
    hasMore: endIndex < SatyamCoin.chain.length,
  });
});

app.get("/stats", (req, res) => {
  const stats = SatyamCoin.getBlockchainStats();
  res.json(stats);
});

app.get("/validate", (req, res) => {
  const isValid = SatyamCoin.isChainValid();
  res.json({
    isValid,
    message: isValid ? "Blockchain is valid" : "Blockchain is invalid",
    totalBlocks: SatyamCoin.chain.length,
  });
});

// === BLOCK ROUTES ===

app.get("/block/:hash", (req, res) => {
  const block = SatyamCoin.getBlockByHash(req.params.hash);
  if (!block) {
    return res.status(404).json({ error: "Block not found" });
  }
  res.json(block);
});

// === TRANSACTION ROUTES ===

app.get("/transaction/:hash", (req, res) => {
  const txData = SatyamCoin.getTransactionByHash(req.params.hash);
  if (!txData) {
    return res.status(404).json({ error: "Transaction not found" });
  }
  res.json(txData);
});

app.get("/transactions/:address", (req, res) => {
  if (!validateAddress(req.params.address)) {
    return res.status(400).json({ error: "Invalid address format" });
  }

  const transactions = SatyamCoin.getTransactionHistory(req.params.address);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const paginatedTxs = transactions.slice(startIndex, endIndex);

  res.json({
    address: req.params.address,
    transactions: paginatedTxs,
    totalTransactions: transactions.length,
    page,
    limit,
    hasMore: endIndex < transactions.length,
  });
});

app.get("/mempool", (req, res) => {
  const mempool = SatyamCoin.getMempool();
  res.json({
    pendingTransactions: mempool,
    count: mempool.length,
  });
});

app.post("/transaction", (req, res) => {
  try {
    const { fromAddress, toAddress, amount, privateKey, data, fee } = req.body;

    if (!fromAddress || !toAddress || !amount || !privateKey) {
      return res.status(400).json({
        error:
          "Missing required fields: fromAddress, toAddress, amount, privateKey",
      });
    }

    if (!validateAddress(fromAddress) || !validateAddress(toAddress)) {
      return res.status(400).json({ error: "Invalid address format" });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: "Amount must be positive" });
    }

    // Create transaction
    const tx = new Transaction(fromAddress, toAddress, amount, data);

    // Set fee if provided, otherwise calculate recommended fee
    tx.fee = fee || tx.calculateRecommendedFee();

    // Sign transaction
    const key = ec.keyFromPrivate(privateKey, "hex");
    if (key.getPublic("hex") !== fromAddress) {
      return res
        .status(400)
        .json({ error: "Private key does not match from address" });
    }

    tx.signTransaction(key);
    SatyamCoin.addTransaction(tx);

    res.json({
      message: "Transaction added successfully",
      transactionHash: tx.calculateHash(),
      fee: tx.fee,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/transaction/batch", (req, res) => {
  try {
    const { transactions } = req.body;

    if (!Array.isArray(transactions)) {
      return res.status(400).json({ error: "Transactions must be an array" });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < transactions.length; i++) {
      try {
        const { fromAddress, toAddress, amount, privateKey, data, fee } =
          transactions[i];

        const tx = new Transaction(fromAddress, toAddress, amount, data);
        tx.fee = fee || tx.calculateRecommendedFee();

        const key = ec.keyFromPrivate(privateKey, "hex");
        tx.signTransaction(key);
        SatyamCoin.addTransaction(tx);

        results.push({
          index: i,
          transactionHash: tx.calculateHash(),
          status: "success",
        });
      } catch (error) {
        errors.push({
          index: i,
          error: error.message,
        });
      }
    }

    res.json({
      message: `Processed ${transactions.length} transactions`,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// === BALANCE ROUTES ===

app.get("/balance/:address", (req, res) => {
  if (!validateAddress(req.params.address)) {
    return res.status(400).json({ error: "Invalid address format" });
  }

  const balance = SatyamCoin.getBalanceOfAddress(req.params.address);
  res.json({
    address: req.params.address,
    balance,
    formatted: `${balance} STC`, // SatyamCoin
  });
});

// === MINING ROUTES ===

app.get("/mine", (req, res) => {
  try {
    if (SatyamCoin.pendingTransactions.length === 0) {
      return res.status(400).json({ error: "No pending transactions to mine" });
    }

    const block = SatyamCoin.minePendingTransactions(myWalletAddress);
    saveChain(SatyamCoin.chain);

    res.json({
      message: "Block mined successfully!",
      block: block,
      reward: SatyamCoin.miningReward,
      minerAddress: myWalletAddress,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/mine", (req, res) => {
  try {
    const { minerAddress } = req.body;

    if (!minerAddress) {
      return res.status(400).json({ error: "Miner address is required" });
    }

    if (!validateAddress(minerAddress)) {
      return res.status(400).json({ error: "Invalid miner address format" });
    }

    if (SatyamCoin.pendingTransactions.length === 0) {
      return res.status(400).json({ error: "No pending transactions to mine" });
    }

    const block = SatyamCoin.minePendingTransactions(minerAddress);
    saveChain(SatyamCoin.chain);

    res.json({
      message: "Block mined successfully!",
      block: block,
      reward: SatyamCoin.miningReward,
      minerAddress: minerAddress,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// === WALLET ROUTES ===

app.get("/wallet/new", (req, res) => {
  try {
    const includePrivateKey = req.query.includePrivateKey === "true";

    const wallet = includePrivateKey
      ? createWalletWithPrivateKey()
      : createWallet();

    // Optionally save wallet (in production, you might not want to save private keys)
    if (includePrivateKey && req.query.save === "true") {
      saveWallet(wallet.address, wallet);
    }

    res.json({
      message: "New wallet created",
      wallet: wallet,
      warning: includePrivateKey
        ? "Keep your private key safe and never share it!"
        : null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/wallet/import", (req, res) => {
  try {
    const { privateKey } = req.body;

    if (!privateKey) {
      return res.status(400).json({ error: "Private key is required" });
    }

    const wallet = importWallet(privateKey);

    res.json({
      message: "Wallet imported successfully",
      wallet: wallet,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/wallet/:address", (req, res) => {
  try {
    const address = req.params.address;

    if (!validateAddress(address)) {
      return res.status(400).json({ error: "Invalid address format" });
    }

    const balance = SatyamCoin.getBalanceOfAddress(address);
    const transactions = SatyamCoin.getTransactionHistory(address);
    const walletData = loadWallet(address);

    res.json({
      address: address,
      balance: balance,
      transactionCount: transactions.length,
      recentTransactions: transactions.slice(0, 5),
      walletExists: !!walletData,
      createdAt: walletData?.createdAt || null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/wallets", (req, res) => {
  try {
    const wallets = getAllWallets();
    const walletsWithBalances = Object.keys(wallets).map((address) => ({
      address,
      balance: SatyamCoin.getBalanceOfAddress(address),
      createdAt: wallets[address].createdAt,
    }));

    res.json({
      wallets: walletsWithBalances,
      totalWallets: walletsWithBalances.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === CONFIGURATION ROUTES ===

app.get("/config", (req, res) => {
  res.json({
    difficulty: SatyamCoin.difficulty,
    miningReward: SatyamCoin.miningReward,
    maxTransactionsPerBlock: SatyamCoin.maxTransactionsPerBlock,
    targetBlockTime: SatyamCoin.targetBlockTime,
    difficultyAdjustmentInterval: SatyamCoin.difficultyAdjustmentInterval,
  });
});

app.post("/config", (req, res) => {
  try {
    const { difficulty, miningReward, maxTransactionsPerBlock } = req.body;

    if (difficulty !== undefined) {
      if (difficulty < 1 || difficulty > 10) {
        return res
          .status(400)
          .json({ error: "Difficulty must be between 1 and 10" });
      }
      SatyamCoin.difficulty = difficulty;
    }

    if (miningReward !== undefined) {
      if (miningReward < 0) {
        return res
          .status(400)
          .json({ error: "Mining reward must be non-negative" });
      }
      SatyamCoin.miningReward = miningReward;
    }

    if (maxTransactionsPerBlock !== undefined) {
      if (maxTransactionsPerBlock < 1) {
        return res
          .status(400)
          .json({ error: "Max transactions per block must be at least 1" });
      }
      SatyamCoin.maxTransactionsPerBlock = maxTransactionsPerBlock;
    }

    // Save configuration
    saveConfig({
      difficulty: SatyamCoin.difficulty,
      miningReward: SatyamCoin.miningReward,
      maxTransactionsPerBlock: SatyamCoin.maxTransactionsPerBlock,
    });

    res.json({
      message: "Configuration updated successfully",
      config: {
        difficulty: SatyamCoin.difficulty,
        miningReward: SatyamCoin.miningReward,
        maxTransactionsPerBlock: SatyamCoin.maxTransactionsPerBlock,
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// === BACKUP ROUTES ===

app.post("/backup", (req, res) => {
  try {
    const { suffix } = req.body;
    const backupPath = createBackup(suffix);

    res.json({
      message: "Backup created successfully",
      backupPath: backupPath,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/data-stats", (req, res) => {
  try {
    const stats = getDataStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === ERROR HANDLING ===

app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    availableEndpoints: "/",
  });
});

app.use((error, req, res, next) => {
  console.error("Server error:", error);
  res.status(500).json({
    error: "Internal server error",
    message: error.message,
  });
});

// === START SERVER ===

process.on("SIGINT", () => {
  console.log("\n🔄 Saving blockchain before exit...");
  saveChain(SatyamCoin.chain);
  console.log("✅ Blockchain saved. Goodbye!");
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 SatyamCoin server running at http://localhost:${PORT}`);
  console.log(`💼 Demo wallet address: ${myWalletAddress.substring(0, 16)}...`);
  console.log(`🔗 Blockchain loaded with ${SatyamCoin.chain.length} blocks`);
  console.log(`⚡ Current difficulty: ${SatyamCoin.difficulty}`);
  console.log(`🎁 Mining reward: ${SatyamCoin.miningReward} STC`);
});

export default app;
