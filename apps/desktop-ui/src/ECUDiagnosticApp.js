"use strict";
/**
 * ECU Diagnostic Dashboard Application
 * Electron + React-based diagnostic interface for ECU Simulator
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ECUDiagnosticApp = void 0;
const transport_abstract_1 = require("@ecu/transport-abstract");
const did_registry_1 = require("@ecu/did-registry");
const security_engine_1 = require("@ecu/security-engine");
const timing_engine_1 = require("@ecu/timing-engine");
const fault_injector_1 = require("@ecu/fault-injector");
const logger_1 = require("@ecu/logger");
class ECUDiagnosticApp {
    constructor() {
        this.isInitialized = false;
        this.logger = new logger_1.Logger("desktop-ui");
        this.transport = null;
        this.session = null;
        this.ipcHandlers = new Map();
    }
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        this.logger.info("Initializing ECU Diagnostic Dashboard...");
        try {
            // Initialize core diagnostic systems
            await this.initializeTransport();
            await this.initializeServices();
            await this.setupIPCHandlers();
            this.isInitialized = true;
            this.logger.info("ECU Diagnostic Dashboard initialized successfully");
        }
        catch (error) {
            this.logger.error("Failed to initialize ECU Diagnostic Dashboard", {
                error: String(error),
            });
            throw error;
        }
    }
    start() {
        if (!this.isInitialized) {
            throw new Error("Application must be initialized before starting");
        }
        this.logger.info("Starting ECU Diagnostic Dashboard...");
        // Start diagnostic session
        this.session = {
            id: this.generateSessionId(),
            connected: false,
            protocol: "kwp2000",
            lastActivity: new Date(),
            stats: {
                requestsSent: 0,
                responsesReceived: 0,
                errors: 0,
            },
        };
        this.logger.info("ECU Diagnostic Dashboard is running", {
            sessionId: this.session.id,
        });
    }
    stop() {
        this.logger.info("Stopping ECU Diagnostic Dashboard...");
        if (this.transport) {
            this.transport
                .disconnect()
                .catch((err) => this.logger.warn("Error disconnecting transport", {
                error: String(err),
            }));
        }
        this.session = null;
        this.isInitialized = false;
    }
    // ─── Transport Management ───────────────────────────────────────────────────
    async initializeTransport() {
        try {
            this.transport = await (0, transport_abstract_1.createTransport)({
                mode: "tcp",
                host: process.env["ECU_HOST"] || "127.0.0.1",
                port: Number(process.env["ECU_PORT"] || 20000),
            });
            this.transport.on((event) => {
                this.handleTransportEvent(event);
            });
            this.logger.info("Transport layer initialized");
        }
        catch (error) {
            this.logger.error("Failed to initialize transport", {
                error: String(error),
            });
            throw error;
        }
    }
    async initializeServices() {
        // Register standard DIDs
        did_registry_1.didRegistry.getAllDefinitions().forEach((def) => {
            this.logger.debug("Registered DID", {
                id: def.id.toString(16),
                name: def.name,
            });
        });
        // Configure timing engine
        timing_engine_1.timingEngine.updateConfig({
            protocol: "kwp2000",
            baudRate: 10400,
            adaptive: true,
        });
        this.logger.info("Diagnostic services initialized");
    }
    handleTransportEvent(event) {
        switch (event.type) {
            case "connected":
                if (this.session) {
                    this.session.connected = true;
                    this.session.lastActivity = new Date();
                }
                this.logger.info("Transport connected");
                break;
            case "disconnected":
                if (this.session) {
                    this.session.connected = false;
                }
                this.logger.info("Transport disconnected", { reason: event.reason });
                break;
            case "data":
                if (this.session) {
                    this.session.stats.responsesReceived++;
                    this.session.lastActivity = new Date();
                }
                this.handleIncomingData(event.payload);
                break;
            case "error":
                if (this.session) {
                    this.session.stats.errors++;
                }
                this.logger.error("Transport error", { error: String(event.error) });
                break;
        }
    }
    handleIncomingData(data) {
        this.logger.debug("Received data", {
            length: data.length,
            hex: data.toString("hex"),
        });
        // In full implementation, this would parse protocol messages
    }
    // ─── IPC Communication ─────────────────────────────────────────────────────
    setupIPCHandlers() {
        // Connection management
        this.ipcHandlers.set("connect", async () => {
            try {
                await this.transport.connect();
                return { success: true };
            }
            catch (error) {
                return { success: false, error: String(error) };
            }
        });
        this.ipcHandlers.set("disconnect", async () => {
            try {
                await this.transport.disconnect();
                return { success: true };
            }
            catch (error) {
                return { success: false, error: String(error) };
            }
        });
        // DID operations
        this.ipcHandlers.set("read-did", async (params) => {
            try {
                const value = did_registry_1.didRegistry.getValue(params.id);
                return { success: true, value };
            }
            catch (error) {
                return { success: false, error: String(error) };
            }
        });
        this.ipcHandlers.set("write-did", async (params) => {
            try {
                did_registry_1.didRegistry.setValue(params.id, params.data);
                return { success: true };
            }
            catch (error) {
                return { success: false, error: String(error) };
            }
        });
        // Security operations
        this.ipcHandlers.set("security-seed", async (params) => {
            try {
                const seed = security_engine_1.securityEngine.generateSeed(params.level);
                return { success: true, seed: seed.toString("hex") };
            }
            catch (error) {
                return { success: false, error: String(error) };
            }
        });
        this.ipcHandlers.set("security-key", async (params) => {
            try {
                const keyBuffer = Buffer.from(params.key, "hex");
                const valid = security_engine_1.securityEngine.verifyKey(params.level, keyBuffer);
                if (valid) {
                    security_engine_1.securityEngine.unlockLevel(params.level);
                }
                return { success: valid };
            }
            catch (error) {
                return { success: false, error: String(error) };
            }
        });
        // Session info
        this.ipcHandlers.set("get-session", () => {
            return { success: true, session: this.session };
        });
        // Fault injection
        this.ipcHandlers.set("get-faults", () => {
            return {
                success: true,
                faults: fault_injector_1.faultInjector.getAllFaults(),
                active: fault_injector_1.faultInjector.getActiveFaults(),
                stats: fault_injector_1.faultInjector.getStats(),
            };
        });
        this.ipcHandlers.set("trigger-fault", (params) => {
            const success = fault_injector_1.faultInjector.triggerFault(params.id);
            return { success };
        });
        this.logger.info("IPC handlers configured");
    }
    // ─── Utility Methods ───────────────────────────────────────────────────────
    getIPCHandler(name) {
        return this.ipcHandlers.get(name);
    }
    getSession() {
        return this.session;
    }
    isConnected() {
        return this.session?.connected ?? false;
    }
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.ECUDiagnosticApp = ECUDiagnosticApp;
//# sourceMappingURL=ECUDiagnosticApp.js.map