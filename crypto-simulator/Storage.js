import { writeFileSync, existsSync, readFileSync, mkdirSync } from "fs";
import { dirname } from "path";

const CHAIN_DATA_PATH = "./data/chain-data.json";
const WALLETS_PATH = "./data/wallets.json";
const CONFIG_PATH = "./data/config.json";

// Ensure data directory exists
function ensureDataDirectory() {
  const dataDir = dirname(CHAIN_DATA_PATH);
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
    console.log("📁 Created data directory");
  }
}

// Blockchain data functions
export function saveChain(chain) {
  try {
    ensureDataDirectory();
    const data = {
      chain: chain,
      timestamp: Date.now(),
      version: "1.0.0",
    };
    writeFileSync(CHAIN_DATA_PATH, JSON.stringify(data, null, 2));
    console.log("💾 Blockchain saved successfully");
  } catch (error) {
    console.error("❌ Error saving blockchain:", error.message);
    throw error;
  }
}

export function loadChain() {
  try {
    if (existsSync(CHAIN_DATA_PATH)) {
      const raw = readFileSync(CHAIN_DATA_PATH, "utf8");
      const data = JSON.parse(raw);
      console.log("📖 Blockchain loaded successfully");
      return data.chain || data; // Handle both old and new format
    }
    console.log("📄 No existing blockchain found, will create new one");
    return null;
  } catch (error) {
    console.error("❌ Error loading blockchain:", error.message);
    return null;
  }
}

// Wallet management functions
export function saveWallet(address, walletData) {
  try {
    ensureDataDirectory();
    let wallets = {};

    if (existsSync(WALLETS_PATH)) {
      const raw = readFileSync(WALLETS_PATH, "utf8");
      wallets = JSON.parse(raw);
    }

    wallets[address] = {
      ...walletData,
      createdAt: Date.now(),
    };

    writeFileSync(WALLETS_PATH, JSON.stringify(wallets, null, 2));
    console.log(`💳 Wallet saved for address: ${address.substring(0, 8)}...`);
  } catch (error) {
    console.error("❌ Error saving wallet:", error.message);
    throw error;
  }
}

export function loadWallet(address) {
  try {
    if (existsSync(WALLETS_PATH)) {
      const raw = readFileSync(WALLETS_PATH, "utf8");
      const wallets = JSON.parse(raw);
      return wallets[address] || null;
    }
    return null;
  } catch (error) {
    console.error("❌ Error loading wallet:", error.message);
    return null;
  }
}

export function getAllWallets() {
  try {
    if (existsSync(WALLETS_PATH)) {
      const raw = readFileSync(WALLETS_PATH, "utf8");
      return JSON.parse(raw);
    }
    return {};
  } catch (error) {
    console.error("❌ Error loading wallets:", error.message);
    return {};
  }
}

// Configuration functions
export function saveConfig(config) {
  try {
    ensureDataDirectory();
    const configData = {
      ...config,
      lastUpdated: Date.now(),
    };
    writeFileSync(CONFIG_PATH, JSON.stringify(configData, null, 2));
    console.log("⚙️ Configuration saved");
  } catch (error) {
    console.error("❌ Error saving configuration:", error.message);
    throw error;
  }
}

export function loadConfig() {
  try {
    if (existsSync(CONFIG_PATH)) {
      const raw = readFileSync(CONFIG_PATH, "utf8");
      return JSON.parse(raw);
    }
    return {
      difficulty: 2,
      miningReward: 100,
      maxTransactionsPerBlock: 10,
    };
  } catch (error) {
    console.error("❌ Error loading configuration:", error.message);
    return {
      difficulty: 2,
      miningReward: 100,
      maxTransactionsPerBlock: 10,
    };
  }
}

// Backup functions
export function createBackup(suffix = "") {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupSuffix = suffix ? `-${suffix}` : "";
    const backupPath = `./data/backup-${timestamp}${backupSuffix}.json`;

    const backupData = {
      chain: loadChain(),
      wallets: getAllWallets(),
      config: loadConfig(),
      createdAt: Date.now(),
    };

    writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    console.log(`📦 Backup created: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error("❌ Error creating backup:", error.message);
    throw error;
  }
}

export function restoreFromBackup(backupPath) {
  try {
    if (!existsSync(backupPath)) {
      throw new Error("Backup file not found");
    }

    const raw = readFileSync(backupPath, "utf8");
    const backupData = JSON.parse(raw);

    if (backupData.chain) {
      saveChain(backupData.chain);
    }

    if (backupData.config) {
      saveConfig(backupData.config);
    }

    console.log(`🔄 Restored from backup: ${backupPath}`);
    return true;
  } catch (error) {
    console.error("❌ Error restoring from backup:", error.message);
    throw error;
  }
}

// Utility functions
export function getDataStats() {
  try {
    const stats = {
      chainExists: existsSync(CHAIN_DATA_PATH),
      walletsCount: Object.keys(getAllWallets()).length,
      configExists: existsSync(CONFIG_PATH),
    };

    if (stats.chainExists) {
      const chain = loadChain();
      stats.blocksCount = chain ? chain.length : 0;
    }

    return stats;
  } catch (error) {
    console.error("❌ Error getting data stats:", error.message);
    return { error: error.message };
  }
}

export default {
  saveChain,
  loadChain,
  saveWallet,
  loadWallet,
  getAllWallets,
  saveConfig,
  loadConfig,
  createBackup,
  restoreFromBackup,
  getDataStats,
};
