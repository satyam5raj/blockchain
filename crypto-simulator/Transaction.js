import SHA256 from "crypto-js/sha256.js";
import pkg from "elliptic";
const EC = pkg.ec;

const ec = new EC("secp256k1");

class Transaction {
  constructor(fromAddress, toAddress, amount, data = null) {
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
    this.data = data; // Additional data field for smart contracts, memos, etc.
    this.timestamp = Date.now();
    this.signature = null;
    this.fee = 0; // Transaction fee
  }

  calculateHash() {
    return SHA256(
      this.fromAddress +
        this.toAddress +
        this.amount +
        this.timestamp +
        (this.data || "") +
        this.fee
    ).toString();
  }

  signTransaction(signingKey) {
    if (signingKey.getPublic("hex") !== this.fromAddress) {
      throw new Error("You cannot sign transactions for other wallets!");
    }

    const hashTx = this.calculateHash();
    const sig = signingKey.sign(hashTx, "base64");
    this.signature = sig.toDER("hex");
  }

  isValid() {
    // Mining reward transactions don't need signatures
    if (this.fromAddress === null) return true;

    if (!this.signature || this.signature.length === 0) {
      throw new Error("No signature in this transaction");
    }

    try {
      const publicKey = ec.keyFromPublic(this.fromAddress, "hex");
      return publicKey.verify(this.calculateHash(), this.signature);
    } catch (error) {
      console.error("Transaction validation error:", error);
      return false;
    }
  }

  // Check if transaction amount is valid (positive and not excessive)
  isAmountValid() {
    return this.amount > 0 && this.amount <= Number.MAX_SAFE_INTEGER;
  }

  // Check if addresses are valid format
  areAddressesValid() {
    // For mining rewards, fromAddress can be null
    if (this.fromAddress === null)
      return this.toAddress && this.toAddress.length === 130;

    return (
      this.fromAddress &&
      this.toAddress &&
      this.fromAddress.length === 130 &&
      this.toAddress.length === 130 &&
      this.fromAddress !== this.toAddress
    );
  }

  // Get transaction size in bytes (approximate)
  getSize() {
    return JSON.stringify(this).length;
  }

  // Calculate recommended fee based on transaction size
  calculateRecommendedFee() {
    const sizeInBytes = this.getSize();
    return Math.max(1, Math.ceil(sizeInBytes / 100)); // 1 coin per 100 bytes minimum
  }

  toJSON() {
    return {
      fromAddress: this.fromAddress,
      toAddress: this.toAddress,
      amount: this.amount,
      data: this.data,
      timestamp: this.timestamp,
      signature: this.signature,
      fee: this.fee,
    };
  }
}

export default Transaction;
