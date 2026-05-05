"use strict";
/**
 * @ecu/security-engine
 * ECU security access implementation with seed/key algorithms.
 * Supports SAE J2186 security access services.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityEngine = exports.SecurityEngine = void 0;
const crypto = __importStar(require("crypto"));
// ─── Security Levels ─────────────────────────────────────────────────────────
const SECURITY_LEVELS = {
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
class SecurityEngine {
    constructor() {
        this.unlockedLevels = new Set();
        this.seedHistory = new Map();
    }
    /** Generate seed for security level */
    generateSeed(level) {
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
    verifyKey(level, key) {
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
    unlockLevel(level) {
        this.unlockedLevels.add(level);
        // Clear the seed after successful unlock
        this.seedHistory.delete(level);
    }
    /** Check if security level is unlocked */
    isUnlocked(level) {
        return this.unlockedLevels.has(level);
    }
    /** Lock security level */
    lockLevel(level) {
        this.unlockedLevels.delete(level);
    }
    /** Lock all security levels */
    lockAll() {
        this.unlockedLevels.clear();
    }
    /** Get available security levels */
    getAvailableLevels() {
        return Object.values(SECURITY_LEVELS);
    }
    /** Get unlocked security levels */
    getUnlockedLevels() {
        return Array.from(this.unlockedLevels);
    }
    /** Compute key from seed using level-specific algorithm */
    computeKey(level, seed) {
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
    xorAlgorithm(seed) {
        const key = Buffer.alloc(seed.length);
        const constant = Buffer.from("ECU_SECURITY_KEY_2026"); // Constant for XOR
        for (let i = 0; i < seed.length; i++) {
            key[i] = (seed[i] ?? 0) ^ (constant[i % constant.length] ?? 0);
        }
        return key;
    }
    /** ADD algorithm: key = seed + incrementing values */
    addAlgorithm(seed) {
        const key = Buffer.alloc(seed.length);
        for (let i = 0; i < seed.length; i++) {
            key[i] = ((seed[i] ?? 0) + i + 1) & 0xff; // Add position + 1, wrap around
        }
        return key;
    }
    /** AES algorithm: key = AES-128(seed, level-specific key) */
    aesAlgorithm(seed, level) {
        const algorithm = seed.length === 16 ? "aes-128-ecb" : "aes-256-ecb";
        // Level-specific encryption key (would be ECU-specific in real implementation)
        const encKey = crypto.scryptSync(`ECU_LEVEL_${level}_KEY`, "salt", seed.length);
        const cipher = crypto.createCipher(algorithm, encKey);
        cipher.setAutoPadding(false); // No padding for fixed-size blocks
        let encrypted = cipher.update(seed);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return encrypted;
    }
}
exports.SecurityEngine = SecurityEngine;
// ─── Singleton Instance ──────────────────────────────────────────────────────
exports.securityEngine = new SecurityEngine();
//# sourceMappingURL=index.js.map