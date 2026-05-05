"use strict";
/**
 * @ecu/transport-abstract
 * Core transport interface — all physical/virtual transports implement this.
 * Supports hybrid: TCP for dev/CI, Serial for real K-Line hardware.
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
exports.TransportNotConnectedError = exports.TransportTimeoutError = exports.TransportError = exports.AbstractTransport = void 0;
exports.createTransport = createTransport;
/**
 * Abstract transport interface.
 * Implement this for each physical medium.
 */
class AbstractTransport {
    constructor() {
        this.listeners = new Set();
        this._stats = {
            bytesReceived: 0,
            bytesSent: 0,
            errors: 0,
            connectedAt: new Date(),
        };
    }
    on(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    get stats() {
        return { ...this._stats };
    }
    emit(event) {
        for (const listener of this.listeners) {
            listener(event);
        }
    }
    trackSend(bytes) {
        this._stats.bytesSent += bytes;
    }
    trackReceive(bytes) {
        this._stats.bytesReceived += bytes;
    }
}
exports.AbstractTransport = AbstractTransport;
// ─── Error Types ─────────────────────────────────────────────────────────────
class TransportError extends Error {
    constructor(message, mode, cause) {
        super(message);
        this.mode = mode;
        this.name = "TransportError";
        this.cause = cause;
    }
}
exports.TransportError = TransportError;
class TransportTimeoutError extends TransportError {
    constructor(mode, timeoutMs) {
        super(`Transport timeout after ${timeoutMs}ms`, mode);
        this.name = "TransportTimeoutError";
    }
}
exports.TransportTimeoutError = TransportTimeoutError;
class TransportNotConnectedError extends TransportError {
    constructor(mode) {
        super(`Transport [${mode}] not connected`, mode);
        this.name = "TransportNotConnectedError";
    }
}
exports.TransportNotConnectedError = TransportNotConnectedError;
// ─── Factory ─────────────────────────────────────────────────────────────────
/**
 * Factory to instantiate the correct transport from config or env.
 * Priority: explicit config > ECU_TRANSPORT env var > default (tcp)
 */
async function createTransport(config) {
    const mode = config?.mode ??
        process.env["ECU_TRANSPORT"] ??
        "tcp";
    switch (mode) {
        case "tcp": {
            const { TcpTransport } = await Promise.resolve().then(() => __importStar(require("@ecu/transport-tcp")));
            const tcpConfig = {
                host: config?.host ?? process.env["ECU_HOST"] ?? "127.0.0.1",
                port: config?.port ?? Number(process.env["ECU_PORT"] ?? 20000),
                connectTimeoutMs: config?.connectTimeoutMs ?? 5000,
                readTimeoutMs: config?.readTimeoutMs ?? 2000,
            };
            return new TcpTransport(tcpConfig);
        }
        case "serial": {
            const { SerialTransport } = await Promise.resolve().then(() => __importStar(require("@ecu/transport-serial")));
            const serialConfig = {
                path: config?.path ??
                    process.env["ECU_SERIAL_PORT"] ??
                    (() => {
                        throw new Error("ECU_SERIAL_PORT not set for serial transport");
                    })(),
                baudRate: config?.baudRate ?? Number(process.env["ECU_BAUD_RATE"] ?? 10400),
                connectTimeoutMs: config?.connectTimeoutMs ?? 3000,
                readTimeoutMs: config?.readTimeoutMs ?? 2000,
            };
            return new SerialTransport(serialConfig);
        }
        case "websocket": {
            const { WebSocketTransport } = await Promise.resolve().then(() => __importStar(require("@ecu/transport-ws")));
            const wsConfig = {
                host: config?.host ?? "localhost",
                port: config?.port ?? 8080,
                connectTimeoutMs: config?.connectTimeoutMs ?? 5000,
                readTimeoutMs: config?.readTimeoutMs ?? 2000,
            };
            return new WebSocketTransport(wsConfig);
        }
        default:
            throw new Error(`Unknown transport mode: ${String(mode)}`);
    }
}
//# sourceMappingURL=index.js.map