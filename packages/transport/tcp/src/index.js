"use strict";
/**
 * @ecu/transport-tcp
 * TCP socket transport — primary for dev, CI, and cloud gateway.
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
exports.TcpTransport = void 0;
const net = __importStar(require("net"));
const transport_abstract_1 = require("@ecu/transport-abstract");
class TcpTransport extends transport_abstract_1.AbstractTransport {
    constructor(config) {
        super();
        this.socket = null;
        this.receiveBuffer = Buffer.alloc(0);
        this.config = config;
    }
    get mode() { return 'tcp'; }
    get isConnected() {
        return this.socket !== null && !this.socket.destroyed;
    }
    async connect() {
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            const timeout = setTimeout(() => {
                socket.destroy();
                reject(new transport_abstract_1.TransportTimeoutError('tcp', this.config.connectTimeoutMs));
            }, this.config.connectTimeoutMs);
            socket.connect(this.config.port, this.config.host, () => {
                clearTimeout(timeout);
                this.socket = socket;
                this._stats.connectedAt = new Date();
                this.emit({ type: 'connected' });
                resolve();
            });
            socket.on('data', (data) => {
                this.receiveBuffer = Buffer.concat([this.receiveBuffer, data]);
                this.trackReceive(data.length);
                this.emit({ type: 'data', payload: data });
            });
            socket.on('close', () => {
                this.socket = null;
                this.emit({ type: 'disconnected', reason: 'socket closed' });
            });
            socket.on('error', (err) => {
                clearTimeout(timeout);
                this._stats.errors++;
                this.emit({ type: 'error', error: new transport_abstract_1.TransportError(err.message, 'tcp', err) });
                reject(err);
            });
        });
    }
    async disconnect() {
        return new Promise((resolve) => {
            if (!this.socket || this.socket.destroyed) {
                resolve();
                return;
            }
            this.socket.end(() => {
                this.socket = null;
                resolve();
            });
        });
    }
    async send(data) {
        if (!this.isConnected || !this.socket) {
            throw new transport_abstract_1.TransportNotConnectedError('tcp');
        }
        return new Promise((resolve, reject) => {
            this.socket.write(data, (err) => {
                if (err) {
                    this._stats.errors++;
                    reject(new transport_abstract_1.TransportError(err.message, 'tcp', err));
                }
                else {
                    this.trackSend(data.length);
                    resolve();
                }
            });
        });
    }
    async read(expectedBytes, timeoutMs) {
        const timeout = timeoutMs ?? this.config.readTimeoutMs;
        if (this.receiveBuffer.length >= expectedBytes) {
            const result = this.receiveBuffer.subarray(0, expectedBytes);
            this.receiveBuffer = this.receiveBuffer.subarray(expectedBytes);
            return result;
        }
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                cleanup();
                reject(new transport_abstract_1.TransportTimeoutError('tcp', timeout));
            }, timeout);
            const onData = () => {
                if (this.receiveBuffer.length >= expectedBytes) {
                    cleanup();
                    const result = this.receiveBuffer.subarray(0, expectedBytes);
                    this.receiveBuffer = this.receiveBuffer.subarray(expectedBytes);
                    resolve(result);
                }
            };
            const cleanup = () => {
                clearTimeout(timer);
                this.socket?.off('data', onData);
            };
            this.socket?.on('data', onData);
        });
    }
}
exports.TcpTransport = TcpTransport;
//# sourceMappingURL=index.js.map