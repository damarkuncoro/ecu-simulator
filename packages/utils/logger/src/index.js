"use strict";
/**
 * @ecu/logger
 * Structured logger with PCAP-style frame capture for replay.
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
exports.rootLogger = exports.Logger = void 0;
const fs = __importStar(require("fs"));
// ─── Logger ──────────────────────────────────────────────────────────────────
class Logger {
    constructor(tag) {
        this.captures = [];
        this.tag = tag;
    }
    static child(tag) {
        return new Logger(tag);
    }
    static setLevel(level) {
        Logger.level = level;
    }
    debug(message, data) {
        this.log("debug", message, data);
    }
    info(message, data) {
        this.log("info", message, data);
    }
    warn(message, data) {
        this.log("warn", message, data);
    }
    error(message, data) {
        this.log("error", message, data);
    }
    /** Capture a raw frame for PCAP-style replay */
    capture(direction, transport, raw) {
        this.captures.push({
            timestamp: Date.now(),
            direction,
            transport,
            raw: Buffer.from(raw), // clone
        });
    }
    /** Export captured frames as JSON (import into replay-runner) */
    exportCaptures(filepath) {
        const serialized = this.captures.map((c) => ({
            ...c,
            raw: c.raw.toString("hex"),
        }));
        fs.writeFileSync(filepath, JSON.stringify(serialized, null, 2));
    }
    /** Export as simple hex log for human reading */
    exportHexLog(filepath) {
        const lines = this.captures.map((c) => {
            const dir = c.direction === "tx" ? "→" : "←";
            const hex = [...c.raw]
                .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
                .join(" ");
            return `[${c.timestamp}] ${dir} [${c.transport}] ${hex}`;
        });
        fs.writeFileSync(filepath, lines.join("\n"));
    }
    clearCaptures() {
        this.captures = [];
    }
    log(level, message, data) {
        if (Logger.LEVELS[level] < Logger.LEVELS[Logger.level])
            return;
        const entry = {
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
        }
        else if (level === "warn") {
            console.warn(`${prefix} ${message}${suffix}`);
        }
        else {
            console.log(`${prefix} ${message}${suffix}`);
        }
    }
}
exports.Logger = Logger;
Logger.level = process.env["LOG_LEVEL"] ?? "info";
Logger.LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
// Singleton root logger
exports.rootLogger = new Logger("ecu-simulator");
//# sourceMappingURL=index.js.map