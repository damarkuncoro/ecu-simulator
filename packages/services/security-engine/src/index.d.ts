/**
 * @ecu/security-engine
 * ECU security access implementation with seed/key algorithms.
 * Supports SAE J2186 security access services.
 */
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
export declare class SecurityEngine {
    private unlockedLevels;
    private seedHistory;
    /** Generate seed for security level */
    generateSeed(level: number): Buffer;
    /** Verify key against stored seed */
    verifyKey(level: number, key: Buffer): boolean;
    /** Unlock security level after successful verification */
    unlockLevel(level: number): void;
    /** Check if security level is unlocked */
    isUnlocked(level: number): boolean;
    /** Lock security level */
    lockLevel(level: number): void;
    /** Lock all security levels */
    lockAll(): void;
    /** Get available security levels */
    getAvailableLevels(): SecurityLevel[];
    /** Get unlocked security levels */
    getUnlockedLevels(): number[];
    /** Compute key from seed using level-specific algorithm */
    private computeKey;
    /** XOR algorithm: key = seed XOR constant */
    private xorAlgorithm;
    /** ADD algorithm: key = seed + incrementing values */
    private addAlgorithm;
    /** AES algorithm: key = AES-128(seed, level-specific key) */
    private aesAlgorithm;
}
export declare const securityEngine: SecurityEngine;
//# sourceMappingURL=index.d.ts.map