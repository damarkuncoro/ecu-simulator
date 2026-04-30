"use strict";
/**
 * @ecu/transport-abstract
 * Core transport interface — all physical/virtual transports implement this.
 * Supports hybrid: TCP for dev/CI, Serial for real K-Line hardware.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransportNotConnectedError = exports.TransportTimeoutError = exports.TransportError = exports.AbstractTransport = void 0;
exports.createTransport = createTransport;
/**
 * Abstract transport interface.
 * Implement this for each physical medium.
 */
var AbstractTransport = /** @class */ (function () {
    function AbstractTransport() {
        this.listeners = new Set();
        this._stats = {
            bytesReceived: 0,
            bytesSent: 0,
            errors: 0,
            connectedAt: new Date(),
        };
    }
    AbstractTransport.prototype.on = function (listener) {
        var _this = this;
        this.listeners.add(listener);
        return function () { return _this.listeners.delete(listener); };
    };
    Object.defineProperty(AbstractTransport.prototype, "stats", {
        get: function () {
            return __assign({}, this._stats);
        },
        enumerable: false,
        configurable: true
    });
    AbstractTransport.prototype.emit = function (event) {
        for (var _i = 0, _a = this.listeners; _i < _a.length; _i++) {
            var listener = _a[_i];
            listener(event);
        }
    };
    AbstractTransport.prototype.trackSend = function (bytes) {
        this._stats.bytesSent += bytes;
    };
    AbstractTransport.prototype.trackReceive = function (bytes) {
        this._stats.bytesReceived += bytes;
    };
    return AbstractTransport;
}());
exports.AbstractTransport = AbstractTransport;
// ─── Error Types ─────────────────────────────────────────────────────────────
var TransportError = /** @class */ (function (_super) {
    __extends(TransportError, _super);
    function TransportError(message, mode, cause) {
        var _this = _super.call(this, message) || this;
        _this.mode = mode;
        _this.cause = cause;
        _this.name = "TransportError";
        return _this;
    }
    return TransportError;
}(Error));
exports.TransportError = TransportError;
var TransportTimeoutError = /** @class */ (function (_super) {
    __extends(TransportTimeoutError, _super);
    function TransportTimeoutError(mode, timeoutMs) {
        var _this = _super.call(this, "Transport timeout after ".concat(timeoutMs, "ms"), mode) || this;
        _this.name = "TransportTimeoutError";
        return _this;
    }
    return TransportTimeoutError;
}(TransportError));
exports.TransportTimeoutError = TransportTimeoutError;
var TransportNotConnectedError = /** @class */ (function (_super) {
    __extends(TransportNotConnectedError, _super);
    function TransportNotConnectedError(mode) {
        var _this = _super.call(this, "Transport [".concat(mode, "] not connected"), mode) || this;
        _this.name = "TransportNotConnectedError";
        return _this;
    }
    return TransportNotConnectedError;
}(TransportError));
exports.TransportNotConnectedError = TransportNotConnectedError;
// ─── Factory ─────────────────────────────────────────────────────────────────
/**
 * Factory to instantiate the correct transport from config or env.
 * Priority: explicit config > ECU_TRANSPORT env var > default (tcp)
 */
function createTransport(config) {
    return __awaiter(this, void 0, void 0, function () {
        var mode, _a, TcpTransport, SerialTransport, WebSocketTransport;
        var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
        return __generator(this, function (_t) {
            switch (_t.label) {
                case 0:
                    mode = (_c = (_b = config === null || config === void 0 ? void 0 : config.mode) !== null && _b !== void 0 ? _b : process.env["ECU_TRANSPORT"]) !== null && _c !== void 0 ? _c : "tcp";
                    _a = mode;
                    switch (_a) {
                        case "tcp": return [3 /*break*/, 1];
                        case "serial": return [3 /*break*/, 3];
                        case "websocket": return [3 /*break*/, 5];
                    }
                    return [3 /*break*/, 7];
                case 1: return [4 /*yield*/, Promise.resolve().then(function () { return require("@ecu/transport-tcp"); })];
                case 2:
                    TcpTransport = (_t.sent()).TcpTransport;
                    return [2 /*return*/, new TcpTransport({
                            host: (_e = (_d = config === null || config === void 0 ? void 0 : config.host) !== null && _d !== void 0 ? _d : process.env["ECU_HOST"]) !== null && _e !== void 0 ? _e : "127.0.0.1",
                            port: (_f = config === null || config === void 0 ? void 0 : config.port) !== null && _f !== void 0 ? _f : Number((_g = process.env["ECU_PORT"]) !== null && _g !== void 0 ? _g : 20000),
                            connectTimeoutMs: (_h = config === null || config === void 0 ? void 0 : config.connectTimeoutMs) !== null && _h !== void 0 ? _h : 5000,
                            readTimeoutMs: (_j = config === null || config === void 0 ? void 0 : config.readTimeoutMs) !== null && _j !== void 0 ? _j : 2000,
                        })];
                case 3: return [4 /*yield*/, Promise.resolve().then(function () { return require("@ecu/transport-serial"); })];
                case 4:
                    SerialTransport = (_t.sent()).SerialTransport;
                    return [2 /*return*/, new SerialTransport({
                            path: (_l = (_k = config === null || config === void 0 ? void 0 : config.path) !== null && _k !== void 0 ? _k : process.env["ECU_SERIAL_PORT"]) !== null && _l !== void 0 ? _l : (function () {
                                throw new Error("ECU_SERIAL_PORT not set for serial transport");
                            })(),
                            baudRate: (_m = config === null || config === void 0 ? void 0 : config.baudRate) !== null && _m !== void 0 ? _m : Number((_o = process.env["ECU_BAUD_RATE"]) !== null && _o !== void 0 ? _o : 10400),
                            connectTimeoutMs: (_p = config === null || config === void 0 ? void 0 : config.connectTimeoutMs) !== null && _p !== void 0 ? _p : 3000,
                            readTimeoutMs: (_q = config === null || config === void 0 ? void 0 : config.readTimeoutMs) !== null && _q !== void 0 ? _q : 2000,
                        })];
                case 5: return [4 /*yield*/, Promise.resolve().then(function () { return require("@ecu/transport-ws"); })];
                case 6:
                    WebSocketTransport = (_t.sent()).WebSocketTransport;
                    return [2 /*return*/, new WebSocketTransport({
                            host: (_r = config === null || config === void 0 ? void 0 : config.host) !== null && _r !== void 0 ? _r : "localhost",
                            port: (_s = config === null || config === void 0 ? void 0 : config.port) !== null && _s !== void 0 ? _s : 8080,
                        })];
                case 7: throw new Error("Unknown transport mode: ".concat(String(mode)));
            }
        });
    });
}
