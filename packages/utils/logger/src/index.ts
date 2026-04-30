/**
 * @ecu/logger
 * Structured logger with PCAP-style frame capture for replay.
 */

import * as fs from "fs";

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

// ─── Logger ──────────────────────────────────────────────────────────────────

export class Logger {
  private captures: FrameCapture[] = [];
  private readonly tag: string;
  private static level: LogLevel =
    (process.env["LOG_LEVEL"] as LogLevel) ?? "info";

  private static readonly LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(tag: string) {
    this.tag = tag;
  }

  static child(tag: string): Logger {
    return new Logger(tag);
  }

  static setLevel(level: LogLevel): void {
    Logger.level = level;
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log("debug", message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log("info", message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log("warn", message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log("error", message, data);
  }

  /** Capture a raw frame for PCAP-style replay */
  capture(direction: "tx" | "rx", transport: string, raw: Buffer): void {
    this.captures.push({
      timestamp: Date.now(),
      direction,
      transport,
      raw: Buffer.from(raw), // clone
    });
  }

  /** Export captured frames as JSON (import into replay-runner) */
  exportCaptures(filepath: string): void {
    const serialized = this.captures.map((c) => ({
      ...c,
      raw: c.raw.toString("hex"),
    }));
    fs.writeFileSync(filepath, JSON.stringify(serialized, null, 2));
  }

  /** Export as simple hex log for human reading */
  exportHexLog(filepath: string): void {
    const lines = this.captures.map((c) => {
      const dir = c.direction === "tx" ? "→" : "←";
      const hex = [...c.raw]
        .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
        .join(" ");
      return `[${c.timestamp}] ${dir} [${c.transport}] ${hex}`;
    });
    fs.writeFileSync(filepath, lines.join("\n"));
  }

  clearCaptures(): void {
    this.captures = [];
  }

  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
  ): void {
    if (Logger.LEVELS[level] < Logger.LEVELS[Logger.level]) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      tag: this.tag,
      message,
      data,
    };

    const prefix = `[${new Date(entry.timestamp).toISOString()}] [${level.toUpperCase().padEnd(5)}] [${this.tag}]`;
    const suffix = data ? ` ${JSON.stringify(data, null, 2)}` : "";

    if (level === "error") {
      console.error(`${prefix} ${message}${suffix}`);
    } else if (level === "warn") {
      console.warn(`${prefix} ${message}${suffix}`);
    } else {
      console.log(`${prefix} ${message}${suffix}`);
    }
  }
}

// Singleton root logger
export const rootLogger = new Logger("ecu-simulator");
