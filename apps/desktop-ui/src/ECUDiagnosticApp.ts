/**
 * ECU Diagnostic Dashboard Application
 * Electron + React-based diagnostic interface for ECU Simulator
 */

import { createTransport } from "@ecu/transport-abstract";
import { didRegistry } from "@ecu/did-registry";
import { securityEngine } from "@ecu/security-engine";
import { timingEngine } from "@ecu/timing-engine";
import { faultInjector } from "@ecu/fault-injector";
import { Logger } from "@ecu/logger";

interface DiagnosticSession {
  id: string;
  connected: boolean;
  protocol: string;
  lastActivity: Date;
  stats: {
    requestsSent: number;
    responsesReceived: number;
    errors: number;
  };
}

export class ECUDiagnosticApp {
  private isInitialized = false;
  private logger = new Logger("desktop-ui");
  private transport: any = null;
  private session: DiagnosticSession | null = null;
  private ipcHandlers: Map<string, Function> = new Map();

  async initialize(): Promise<void> {
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
    } catch (error) {
      this.logger.error("Failed to initialize ECU Diagnostic Dashboard", {
        error: String(error),
      });
      throw error;
    }
  }

  start(): void {
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

  stop(): void {
    this.logger.info("Stopping ECU Diagnostic Dashboard...");

    if (this.transport) {
      this.transport
        .disconnect()
        .catch((err: any) =>
          this.logger.warn("Error disconnecting transport", {
            error: String(err),
          }),
        );
    }

    this.session = null;
    this.isInitialized = false;
  }

  // ─── Transport Management ───────────────────────────────────────────────────

  private async initializeTransport(): Promise<void> {
    try {
      this.transport = await createTransport({
        mode: "tcp",
        host: process.env["ECU_HOST"] || "127.0.0.1",
        port: Number(process.env["ECU_PORT"] || 20000),
      });

      this.transport.on((event: any) => {
        this.handleTransportEvent(event);
      });

      this.logger.info("Transport layer initialized");
    } catch (error) {
      this.logger.error("Failed to initialize transport", {
        error: String(error),
      });
      throw error;
    }
  }

  private async initializeServices(): Promise<void> {
    // Register standard DIDs
    didRegistry.getAllDefinitions().forEach((def) => {
      this.logger.debug("Registered DID", {
        id: def.id.toString(16),
        name: def.name,
      });
    });

    // Configure timing engine
    timingEngine.updateConfig({
      protocol: "kwp2000",
      baudRate: 10400,
      adaptive: true,
    });

    this.logger.info("Diagnostic services initialized");
  }

  private handleTransportEvent(event: any): void {
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

  private handleIncomingData(data: Buffer): void {
    this.logger.debug("Received data", {
      length: data.length,
      hex: data.toString("hex"),
    });
    // In full implementation, this would parse protocol messages
  }

  // ─── IPC Communication ─────────────────────────────────────────────────────

  private setupIPCHandlers(): void {
    // Connection management
    this.ipcHandlers.set("connect", async () => {
      try {
        await this.transport.connect();
        return { success: true };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    });

    this.ipcHandlers.set("disconnect", async () => {
      try {
        await this.transport.disconnect();
        return { success: true };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    });

    // DID operations
    this.ipcHandlers.set("read-did", async (params: { id: number }) => {
      try {
        const value = didRegistry.getValue(params.id);
        return { success: true, value };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    });

    this.ipcHandlers.set(
      "write-did",
      async (params: { id: number; data: Buffer }) => {
        try {
          didRegistry.setValue(params.id, params.data);
          return { success: true };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
    );

    // Security operations
    this.ipcHandlers.set("security-seed", async (params: { level: number }) => {
      try {
        const seed = securityEngine.generateSeed(params.level);
        return { success: true, seed: seed.toString("hex") };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    });

    this.ipcHandlers.set(
      "security-key",
      async (params: { level: number; key: string }) => {
        try {
          const keyBuffer = Buffer.from(params.key, "hex");
          const valid = securityEngine.verifyKey(params.level, keyBuffer);
          if (valid) {
            securityEngine.unlockLevel(params.level);
          }
          return { success: valid };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
    );

    // Session info
    this.ipcHandlers.set("get-session", () => {
      return { success: true, session: this.session };
    });

    // Fault injection
    this.ipcHandlers.set("get-faults", () => {
      return {
        success: true,
        faults: faultInjector.getAllFaults(),
        active: faultInjector.getActiveFaults(),
        stats: faultInjector.getStats(),
      };
    });

    this.ipcHandlers.set("trigger-fault", (params: { id: string }) => {
      const success = faultInjector.triggerFault(params.id);
      return { success };
    });

    this.logger.info("IPC handlers configured");
  }

  // ─── Utility Methods ───────────────────────────────────────────────────────

  getIPCHandler(name: string): Function | undefined {
    return this.ipcHandlers.get(name);
  }

  getSession(): DiagnosticSession | null {
    return this.session;
  }

  isConnected(): boolean {
    return this.session?.connected ?? false;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
