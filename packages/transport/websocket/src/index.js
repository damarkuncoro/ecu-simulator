"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketTransport = exports.PKG = void 0;
/** @ecu/transport-ws — stub implementation */
const transport_abstract_1 = require("@ecu/transport-abstract");
exports.PKG = "@ecu/transport-ws";
class WebSocketTransport extends transport_abstract_1.AbstractTransport {
    constructor(config = {}) {
        super();
        this.config = {
            host: config.host ?? "localhost",
            port: config.port ?? 8080,
            connectTimeoutMs: config.connectTimeoutMs ?? 5000,
            readTimeoutMs: config.readTimeoutMs ?? 2000,
        };
    }
    get mode() {
        return "websocket";
    }
    get isConnected() {
        return false;
    }
    async connect() {
        throw new transport_abstract_1.TransportError("WebSocket transport not implemented yet", "websocket");
    }
    async disconnect() {
        throw new transport_abstract_1.TransportError("WebSocket transport not implemented yet", "websocket");
    }
    async send(data) {
        throw new transport_abstract_1.TransportNotConnectedError("websocket");
    }
    async read(expectedBytes, timeoutMs) {
        throw new transport_abstract_1.TransportNotConnectedError("websocket");
    }
    on(listener) {
        return () => { };
    }
}
exports.WebSocketTransport = WebSocketTransport;
//# sourceMappingURL=index.js.map