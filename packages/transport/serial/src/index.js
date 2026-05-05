"use strict";
/**
 * @ecu/transport-serial
 * Serial (K-Line) transport — for hardware-in-loop testing.
 * Wraps node-serialport with 5-baud init support.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SerialTransport = void 0;
const serialport_1 = require("serialport");
const transport_abstract_1 = require("@ecu/transport-abstract");
class SerialTransport extends transport_abstract_1.AbstractTransport {
    constructor(config) {
        super();
        this.port = null;
        this.receiveBuffer = Buffer.alloc(0);
        this.config = config;
    }
    get mode() {
        return "serial";
    }
    get isConnected() {
        return this.port?.isOpen ?? false;
    }
    async connect() {
        return new Promise((resolve, reject) => {
            const port = new serialport_1.SerialPort({
                path: this.config.path,
                baudRate: this.config.baudRate,
                dataBits: 8,
                parity: "none",
                stopBits: 1,
                autoOpen: false,
            });
            const timeout = setTimeout(() => {
                port.close();
                reject(new transport_abstract_1.TransportTimeoutError("serial", this.config.connectTimeoutMs));
            }, this.config.connectTimeoutMs);
            port.open((err) => {
                clearTimeout(timeout);
                if (err) {
                    reject(new transport_abstract_1.TransportError(err.message, "serial", err));
                    return;
                }
                this.port = port;
                this._stats.connectedAt = new Date();
                this.emit({ type: "connected" });
                resolve();
            });
            port.on("data", (data) => {
                this.receiveBuffer = Buffer.concat([this.receiveBuffer, data]);
                this.trackReceive(data.length);
                this.emit({ type: "data", payload: data });
            });
            port.on("close", () => {
                this.port = null;
                this.emit({ type: "disconnected", reason: "port closed" });
            });
            port.on("error", (err) => {
                this._stats.errors++;
                this.emit({
                    type: "error",
                    error: new transport_abstract_1.TransportError(err.message, "serial", err),
                });
            });
        });
    }
    async disconnect() {
        return new Promise((resolve, reject) => {
            if (!this.isConnected || !this.port) {
                resolve();
                return;
            }
            this.port.close((err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    async send(data) {
        if (!this.isConnected || !this.port) {
            throw new transport_abstract_1.TransportNotConnectedError("serial");
        }
        return new Promise((resolve, reject) => {
            this.port.write(data, (err) => {
                if (err) {
                    this._stats.errors++;
                    reject(new transport_abstract_1.TransportError(err.message, "serial", err));
                    return;
                }
                this.port.drain((drainErr) => {
                    if (drainErr)
                        reject(drainErr);
                    else {
                        this.trackSend(data.length);
                        resolve();
                    }
                });
            });
        });
    }
    async read(expectedBytes, timeoutMs) {
        const timeout = timeoutMs ?? this.config.readTimeoutMs;
        if (this.receiveBuffer.length >= expectedBytes) {
            return this.drainBuffer(expectedBytes);
        }
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                cleanup();
                reject(new transport_abstract_1.TransportTimeoutError("serial", timeout));
            }, timeout);
            const onData = () => {
                if (this.receiveBuffer.length >= expectedBytes) {
                    cleanup();
                    resolve(this.drainBuffer(expectedBytes));
                }
            };
            const cleanup = () => {
                clearTimeout(timer);
                this.port?.removeListener("data", onData);
            };
            this.port?.on("data", onData);
        });
    }
    /**
     * K-Line 5-baud initialization sequence.
     * Bit-bangs the address byte at 5 baud before switching to 10400.
     * Call this BEFORE connect() on real hardware.
     */
    async fiveBaudInit(ecuAddress = 0x10) {
        // 5-baud = 200ms per bit
        const BIT_DURATION_MS = 200;
        // Open at low baud for bit-banging (not all drivers support this)
        const initPort = new serialport_1.SerialPort({
            path: this.config.path,
            baudRate: 5,
            dataBits: 8,
            parity: "none",
            stopBits: 1,
        });
        await new Promise((resolve, reject) => {
            initPort.write(Buffer.from([ecuAddress]), (err) => {
                if (err)
                    reject(err);
                else
                    setTimeout(() => {
                        initPort.close();
                        resolve();
                    }, BIT_DURATION_MS * 10 + 100); // 10 bits + margin
            });
        });
    }
    drainBuffer(bytes) {
        const result = this.receiveBuffer.subarray(0, bytes);
        this.receiveBuffer = this.receiveBuffer.subarray(bytes);
        return result;
    }
}
exports.SerialTransport = SerialTransport;
// TypeScript helper — avoids shadow variable lint errors
function expectedCount(n) {
    return n;
}
//# sourceMappingURL=index.js.map