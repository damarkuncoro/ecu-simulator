/**
 * @ecu/security-engine
 * ECU security access implementation with seed/key algorithms.
 * Supports SAE J2186 security access services.
 */

import * as crypto from "crypto";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SecurityLevel {
  level: number;
  name: string;
  description: string;
  seedLength: number;
  keyLength: number;
  algorithm: "xor" | "add" | "aes" | "custom";
}

export interface SeedKeyPair {
  seed: Buffer;
  key: Buffer;
}

// ─── Security Levels ─────────────────────────────────────────────────────────

const SECURITY_LEVELS: Record<number, SecurityLevel> = {
  0x01: {
    level: 0x01,
    name: "Programming",
    description: "ECU programming access",
    seedLength: 4,
    keyLength: 4,
    algorithm: "xor",
  },
  0x03: {
    level: 0x03,
    name: "Extended Diagnostic",
    description: "Extended diagnostic functions",
    seedLength: 4,
    keyLength: 4,
    algorithm: "add",
  },
  0x05: {
    level: 0x05,
    name: "Calibration",
    description: "Calibration data access",
    seedLength: 8,
    keyLength: 8,
    algorithm: "aes",
  },
  0x07: {
    level: 0x07,
    name: "Bootloader",
    description: "Bootloader access",
    seedLength: 16,
    keyLength: 16,
    algorithm: "aes",
  },
};

// ─── Security Engine ─────────────────────────────────────────────────────────

export class SecurityEngine {
  private unlockedLevels = new Set<number>();
  private seedHistory = new Map<number, { seed: Buffer; expiresAt: Date }>();

  /** Generate seed for security level */
  generateSeed(level: number): Buffer {
    const securityLevel = SECURITY_LEVELS[level];
    if (!securityLevel) {
      throw new Error(`Unknown security level: ${level}`);
    }

    // Generate random seed
    const seed = crypto.randomBytes(securityLevel.seedLength);

    // Store seed with expiration (5 minutes)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    this.seedHistory.set(level, { seed: Buffer.from(seed), expiresAt });

    return seed;
  }

  /** Verify key against stored seed */
  verifyKey(level: number, key: Buffer): boolean {
    const securityLevel = SECURITY_LEVELS[level];
    if (!securityLevel) {
      throw new Error(`Unknown security level: ${level}`);
    }

    const seedData = this.seedHistory.get(level);
    if (!seedData) {
      return false; // No seed generated for this level
    }

    if (Date.now() > seedData.expiresAt.getTime()) {
      this.seedHistory.delete(level); // Expired
      return false;
    }

    const expectedKey = this.computeKey(level, seedData.seed);

    if (key.length !== expectedKey.length) {
      return false;
    }

    return crypto.timingSafeEqual(key, expectedKey);
  }

  /** Unlock security level after successful verification */
  unlockLevel(level: number): void {
    this.unlockedLevels.add(level);
    // Clear the seed after successful unlock
    this.seedHistory.delete(level);
  }

  /** Check if security level is unlocked */
  isUnlocked(level: number): boolean {
    return this.unlockedLevels.has(level);
  }

  /** Lock security level */
  lockLevel(level: number): void {
    this.unlockedLevels.delete(level);
  }

  /** Lock all security levels */
  lockAll(): void {
    this.unlockedLevels.clear();
  }

  /** Get available security levels */
  getAvailableLevels(): SecurityLevel[] {
    return Object.values(SECURITY_LEVELS);
  }

  /** Get unlocked security levels */
  getUnlockedLevels(): number[] {
    return Array.from(this.unlockedLevels);
  }

  /** Compute key from seed using level-specific algorithm */
  private computeKey(level: number, seed: Buffer): Buffer {
    const securityLevel = SECURITY_LEVELS[level];
    if (!securityLevel) {
      throw new Error(`Unknown security level: ${level}`);
    }

    switch (securityLevel.algorithm) {
      case "xor":
        return this.xorAlgorithm(seed);
      case "add":
        return this.addAlgorithm(seed);
      case "aes":
        return this.aesAlgorithm(seed, level);
      default:
        throw new Error(`Unsupported algorithm: ${securityLevel.algorithm}`);
    }
  }

  /** XOR algorithm: key = seed XOR constant */
  private xorAlgorithm(seed: Buffer): Buffer {
    const key = Buffer.alloc(seed.length);
    const constant = Buffer.from("ECU_SECURITY_KEY_2026"); // Constant for XOR

    for (let i = 0; i < seed.length; i++) {
      key[i] = (seed[i] ?? 0) ^ (constant[i % constant.length] ?? 0);
    }

    return key;
  }

  /** ADD algorithm: key = seed + incrementing values */
  private addAlgorithm(seed: Buffer): Buffer {
    const key = Buffer.alloc(seed.length);

    for (let i = 0; i < seed.length; i++) {
      key[i] = ((seed[i] ?? 0) + i + 1) & 0xff; // Add position + 1, wrap around
    }

    return key;
  }

  /** AES algorithm: key = AES-128(seed, level-specific key) */
  private aesAlgorithm(seed: Buffer, level: number): Buffer {
    const algorithm = seed.length === 16 ? "aes-128-ecb" : "aes-256-ecb";

    // Level-specific encryption key (would be ECU-specific in real implementation)
    const encKey = crypto.scryptSync(
      `ECU_LEVEL_${level}_KEY`,
      "salt",
      seed.length,
    );

    const cipher = crypto.createCipher(algorithm, encKey);
    cipher.setAutoPadding(false); // No padding for fixed-size blocks

    let encrypted = cipher.update(seed);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return encrypted;
  }
}

// ─── Singleton Instance ──────────────────────────────────────────────────────

export const securityEngine = new SecurityEngine();
