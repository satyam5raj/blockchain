import Blockchain from "./Blockchain.js";
import Transaction from "./Transaction.js";
import Wallet, {
  createWalletWithPrivateKey,
  validateAddress,
} from "./Wallet.js";
import pkg from "elliptic";
const EC = pkg.ec;

const ec = new EC("secp256k1");

async function testBlockchain() {
  console.log("🚀 Starting SatyamCoin Blockchain Test\n");

  // Initialize blockchain
  const satyamCoin = new Blockchain();
  console.log("✅ Blockchain initialized");
  console.log(`   Genesis block hash: ${satyamCoin.chain[0].hash}\n`);

  // Create wallets
  console.log("👛 Creating wallets...");
  const wallet1 = createWalletWithPrivateKey();
  const wallet2 = createWalletWithPrivateKey();
  const wallet3 = createWalletWithPrivateKey();

  console.log(`   Wallet 1: ${wallet1.address.substring(0, 16)}...`);
  console.log(`   Wallet 2: ${wallet2.address.substring(0, 16)}...`);
  console.log(`   Wallet 3: ${wallet3.address.substring(0, 16)}...\n`);

  // Initial mining to give wallet1 some coins
  console.log("⛏️  Initial mining to get some coins...");
  satyamCoin.minePendingTransactions(wallet1.address);
  console.log(
    `   Wallet 1 balance: ${satyamCoin.getBalanceOfAddress(
      wallet1.address
    )} STC\n`
  );

  // Create and sign transactions
  console.log("💸 Creating transactions...");

  // Transaction 1: wallet1 -> wallet2
  const tx1 = new Transaction(wallet1.address, wallet2.address, 50);
  tx1.fee = 2;
  const key1 = ec.keyFromPrivate(wallet1.privateKey, "hex");
  tx1.signTransaction(key1);
  satyamCoin.addTransaction(tx1);

  // Transaction 2: wallet1 -> wallet3
  const tx2 = new Transaction(
    wallet1.address,
    wallet3.address,
    30,
    "Payment for services"
  );
  tx2.fee = 1;
  tx2.signTransaction(key1);
  satyamCoin.addTransaction(tx2);

  console.log(`   Created 2 transactions`);
  console.log(
    `   Pending transactions: ${satyamCoin.pendingTransactions.length}\n`
  );

  // Mine the transactions
  console.log("⛏️  Mining pending transactions...");
  satyamCoin.minePendingTransactions(wallet2.address); // wallet2 gets mining reward

  // Check balances after mining
  console.log("\n💰 Balances after mining:");
  console.log(
    `   Wallet 1: ${satyamCoin.getBalanceOfAddress(wallet1.address)} STC`
  );
  console.log(
    `   Wallet 2: ${satyamCoin.getBalanceOfAddress(wallet2.address)} STC`
  );
  console.log(
    `   Wallet 3: ${satyamCoin.getBalanceOfAddress(wallet3.address)} STC\n`
  );

  // Add more transactions for another block
  console.log("💸 Creating more transactions...");
  const tx3 = new Transaction(wallet2.address, wallet3.address, 25);
  tx3.fee = 1;
  const key2 = ec.keyFromPrivate(wallet2.privateKey, "hex");
  tx3.signTransaction(key2);
  satyamCoin.addTransaction(tx3);

  const tx4 = new Transaction(wallet3.address, wallet1.address, 10, "Refund");
  tx4.fee = 1;
  const key3 = ec.keyFromPrivate(wallet3.privateKey, "hex");
  tx4.signTransaction(key3);
  satyamCoin.addTransaction(tx4);

  // Mine second block
  console.log("⛏️  Mining second block...");
  satyamCoin.minePendingTransactions(wallet3.address);

  // Final balances
  console.log("\n💰 Final balances:");
  console.log(
    `   Wallet 1: ${satyamCoin.getBalanceOfAddress(wallet1.address)} STC`
  );
  console.log(
    `   Wallet 2: ${satyamCoin.getBalanceOfAddress(wallet2.address)} STC`
  );
  console.log(
    `   Wallet 3: ${satyamCoin.getBalanceOfAddress(wallet3.address)} STC\n`
  );

  // Show blockchain stats
  const stats = satyamCoin.getBlockchainStats();
  console.log("📊 Blockchain Statistics:");
  console.log(`   Total blocks: ${stats.totalBlocks}`);
  console.log(`   Total transactions: ${stats.totalTransactions}`);
  console.log(`   Total supply: ${stats.totalSupply} STC`);
  console.log(`   Current difficulty: ${stats.difficulty}`);
  console.log(`   Mining reward: ${stats.miningReward} STC\n`);

  // Show transaction history for wallet1
  console.log(`📝 Transaction history for Wallet 1:`);
  const history = satyamCoin.getTransactionHistory(wallet1.address);
  history.forEach((tx, index) => {
    const type = tx.fromAddress === wallet1.address ? "SENT" : "RECEIVED";
    const amount = tx.fromAddress === wallet1.address ? -tx.amount : tx.amount;
    const fee = tx.fromAddress === wallet1.address ? -tx.fee : 0;
    console.log(
      `   ${index + 1}. ${type}: ${amount} STC ${fee ? `(fee: ${fee})` : ""}`
    );
    if (tx.data) console.log(`      Note: ${tx.data}`);
  });

  // Validate blockchain
  console.log("\n🔍 Validating blockchain...");
  const isValid = satyamCoin.isChainValid();
  console.log(`   Blockchain is ${isValid ? "VALID ✅" : "INVALID ❌"}\n`);

  // Show each block
  console.log("🧱 Blockchain blocks:");
  satyamCoin.chain.forEach((block, index) => {
    console.log(`   Block ${index}:`);
    console.log(`     Hash: ${block.hash}`);
    console.log(`     Previous Hash: ${block.previousHash}`);
    console.log(
      `     Timestamp: ${new Date(block.timestamp).toLocaleString()}`
    );
    console.log(`     Transactions: ${block.transactions.length}`);
    console.log(`     Nonce: ${block.nonce}`);
    console.log(`     Merkle Root: ${block.merkleRoot.substring(0, 16)}...`);
    console.log("");
  });

  return satyamCoin;
}

// Test error scenarios
async function testErrorScenarios() {
  console.log("🧪 Testing error scenarios...\n");

  const blockchain = new Blockchain();
  const wallet1 = createWalletWithPrivateKey();
  const wallet2 = createWalletWithPrivateKey();

  console.log("1. Testing insufficient balance...");
  try {
    const tx = new Transaction(wallet1.address, wallet2.address, 1000); // More than balance
    tx.fee = 1;
    const key = ec.keyFromPrivate(wallet1.privateKey, "hex");
    tx.signTransaction(key);
    blockchain.addTransaction(tx);
    console.log("   ❌ Should have failed!");
  } catch (error) {
    console.log(`   ✅ Correctly caught: ${error.message}`);
  }

  console.log("\n2. Testing invalid signature...");
  try {
    const tx = new Transaction(wallet1.address, wallet2.address, 10);
    const wrongKey = ec.keyFromPrivate(wallet2.privateKey, "hex"); // Wrong key
    tx.signTransaction(wrongKey);
    console.log("   ❌ Should have failed!");
  } catch (error) {
    console.log(`   ✅ Correctly caught: ${error.message}`);
  }

  console.log("\n3. Testing invalid address...");
  try {
    const isValid = validateAddress("invalid_address");
    console.log(
      `   Address validation result: ${
        isValid ? "❌ Should be false!" : "✅ Correctly false"
      }`
    );
  } catch (error) {
    console.log(`   ✅ Correctly caught: ${error.message}`);
  }

  console.log("\n4. Testing negative amount...");
  try {
    const tx = new Transaction(wallet1.address, wallet2.address, -10);
    console.log(
      `   Amount valid: ${
        tx.isAmountValid() ? "❌ Should be false!" : "✅ Correctly false"
      }`
    );
  } catch (error) {
    console.log(`   ✅ Correctly caught: ${error.message}`);
  }
}

// Performance test
async function performanceTest() {
  console.log("⚡ Performance testing...\n");

  const blockchain = new Blockchain();
  const wallets = [];

  // Create multiple wallets
  console.log("Creating 10 wallets...");
  for (let i = 0; i < 10; i++) {
    wallets.push(createWalletWithPrivateKey());
  }

  // Initial mining for first wallet
  blockchain.minePendingTransactions(wallets[0].address);

  // Create many transactions
  console.log("Creating 50 transactions...");
  const startTime = Date.now();

  for (let i = 0; i < 50; i++) {
    const fromWallet = wallets[i % wallets.length];
    const toWallet = wallets[(i + 1) % wallets.length];

    // Skip if sender has no balance
    if (blockchain.getBalanceOfAddress(fromWallet.address) <= 1) {
      continue;
    }

    try {
      const tx = new Transaction(fromWallet.address, toWallet.address, 1);
      tx.fee = 0.1;
      const key = ec.keyFromPrivate(fromWallet.privateKey, "hex");
      tx.signTransaction(key);
      blockchain.addTransaction(tx);
    } catch (error) {
      // Skip transactions that fail (insufficient balance, etc.)
      continue;
    }
  }

  const txCreationTime = Date.now() - startTime;
  console.log(
    `   Created ${blockchain.pendingTransactions.length} valid transactions in ${txCreationTime}ms`
  );

  // Mine transactions
  console.log("Mining transactions...");
  const miningStartTime = Date.now();

  while (blockchain.pendingTransactions.length > 0) {
    blockchain.minePendingTransactions(wallets[0].address);
  }

  const miningTime = Date.now() - miningStartTime;
  console.log(`   Mining completed in ${miningTime}ms`);
  console.log(`   Total blocks: ${blockchain.chain.length}`);
  console.log(
    `   Total transactions: ${
      blockchain.getBlockchainStats().totalTransactions
    }`
  );
}

// Main execution
async function main() {
  try {
    console.log("=" * 60);
    console.log("🪙 SATYAMCOIN BLOCKCHAIN SIMULATOR");
    console.log("=" * 60);
    console.log("");

    // Basic functionality test
    await testBlockchain();

    console.log("\n" + "=" * 60);
    await testErrorScenarios();

    console.log("\n" + "=" * 60);
    await performanceTest();

    console.log("\n" + "=" * 60);
    console.log("🎉 All tests completed successfully!");
    console.log("✨ You can now start the server with: node server.js");
    console.log("📖 Visit http://localhost:3000 for the API documentation");
    console.log("=" * 60);
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { testBlockchain, testErrorScenarios, performanceTest };
