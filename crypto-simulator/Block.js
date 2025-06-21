import SHA256 from "crypto-js/sha256.js";

class Block {
  constructor(timestamp, transactions, previousHash = "") {
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = this.calculateHash();
    this.merkleRoot = this.calculateMerkleRoot();
  }

  calculateHash() {
    return SHA256(
      this.previousHash +
        this.timestamp +
        JSON.stringify(this.transactions) +
        this.nonce +
        this.merkleRoot
    ).toString();
  }

  calculateMerkleRoot() {
    if (this.transactions.length === 0) return "";

    const txHashes = this.transactions.map((tx) =>
      SHA256(JSON.stringify(tx)).toString()
    );

    return this.getMerkleRoot(txHashes);
  }

  getMerkleRoot(hashes) {
    if (hashes.length === 1) return hashes[0];

    const newLevel = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = hashes[i + 1] || hashes[i]; // duplicate last hash if odd number
      newLevel.push(SHA256(left + right).toString());
    }

    return this.getMerkleRoot(newLevel);
  }

  mineBlock(difficulty) {
    const target = Array(difficulty + 1).join("0");
    const startTime = Date.now();

    console.log(`⛏️  Mining block with difficulty ${difficulty}...`);

    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();

      // Show progress every 100k attempts
      if (this.nonce % 100000 === 0) {
        console.log(`   Attempts: ${this.nonce.toLocaleString()}`);
      }
    }

    const endTime = Date.now();
    const timeTaken = (endTime - startTime) / 1000;

    console.log(
      `🪙 Block mined in ${timeTaken}s with ${this.nonce.toLocaleString()} attempts`
    );
    console.log(`   Hash: ${this.hash}`);
  }

  hasValidTransactions() {
    return this.transactions.every((tx) => tx.isValid());
  }

  toJSON() {
    return {
      timestamp: this.timestamp,
      transactions: this.transactions,
      previousHash: this.previousHash,
      nonce: this.nonce,
      hash: this.hash,
      merkleRoot: this.merkleRoot,
    };
  }
}

export default Block;
