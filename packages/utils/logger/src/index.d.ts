/**
 * @ecu/logger
 * Structured logger with PCAP-style frame capture for replay.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";
export interface LogEntry {
    timestamp: number;
    level: LogLevel;
    tag: string;
    message: string;
    data?: Record<string, unknown> | undefined;
}
export interface FrameCapture {
    timestamp: number;
    direction: "tx" | "rx";
    transport: string;
    raw: Buffer;
}
export declare class Logger {
    private captures;
    private readonly tag;
    private static level;
    private static readonly LEVELS;
    constructor(tag: string);
    static child(tag: string): Logger;
    static setLevel(level: LogLevel): void;
    debug(message: string, data?: Record<string, unknown>): void;
    info(message: string, data?: Record<string, unknown>): void;
    warn(message: string, data?: Record<string, unknown>): void;
    error(message: string, data?: Record<string, unknown>): void;
    /** Capture a raw frame for PCAP-style replay */
    capture(direction: "tx" | "rx", transport: string, raw: Buffer): void;
    /** Export captured frames as JSON (import into replay-runner) */
    exportCaptures(filepath: string): void;
    /** Export as simple hex log for human reading */
    exportHexLog(filepath: string): void;
    clearCaptures(): void;
    private log;
}
export declare const rootLogger: Logger;
//# sourceMappingURL=index.d.ts.map