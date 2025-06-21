import SHA256 from "crypto-js/sha256.js";
import pkg from "elliptic";
const EC = pkg.ec;

const ec = new EC("secp256k1");

class Wallet {
  constructor(privateKey = null) {
    if (privateKey) {
      this.keyPair = ec.keyFromPrivate(privateKey, "hex");
    } else {
      this.keyPair = ec.genKeyPair();
    }

    this.publicKey = this.keyPair.getPublic("hex");
    this.privateKey = this.keyPair.getPrivate("hex");
  }

  // Sign a message/transaction
  sign(message) {
    const msgHash = SHA256(message).toString();
    return this.keyPair.sign(msgHash, "base64").toDER("hex");
  }

  // Verify a signature
  verify(message, signature, publicKey = null) {
    const msgHash = SHA256(message).toString();
    const key = publicKey ? ec.keyFromPublic(publicKey, "hex") : this.keyPair;
    return key.verify(msgHash, signature);
  }

  // Get wallet info (safe to share)
  getWalletInfo() {
    return {
      publicKey: this.publicKey,
      address: this.publicKey, // In this simple implementation, address = public key
    };
  }

  // Get private key (dangerous - keep secret!)
  getPrivateKey() {
    return this.privateKey;
  }

  // Create a wallet from mnemonic would go here in a real implementation
  static fromMnemonic(mnemonic) {
    // This would implement BIP39 mnemonic to private key conversion
    // For now, just create random wallet
    console.warn("Mnemonic import not implemented, creating random wallet");
    return new Wallet();
  }

  // Export wallet (encrypted would be better in production)
  export() {
    return {
      privateKey: this.privateKey,
      publicKey: this.publicKey,
      address: this.publicKey,
    };
  }
}

// Utility functions
export function createWallet() {
  const wallet = new Wallet();
  return wallet.getWalletInfo();
}

export function createWalletWithPrivateKey() {
  const wallet = new Wallet();
  return wallet.export();
}

export function importWallet(privateKey) {
  try {
    const wallet = new Wallet(privateKey);
    return wallet.getWalletInfo();
  } catch (error) {
    throw new Error("Invalid private key format");
  }
}

export function validateAddress(address) {
  try {
    // Basic validation - check if it's a valid hex string of correct length
    return /^[0-9a-fA-F]{130}$/.test(address);
  } catch (error) {
    return false;
  }
}

export default Wallet;
