/**
 * @ecu/core-kernel
 * Virtual ECU — central coordinator for transport, protocol, and services.
 * Wires together all components into a functioning diagnostic ECU.
 */

import {
  AbstractTransport,
  TransportConfig,
  TransportMode,
} from "@ecu/transport-abstract";
import { DTCEngine } from "@ecu/dtc-engine";
import { DIDRegistry } from "@ecu/did-registry";
import { securityEngine } from "@ecu/security-engine";
import { timingEngine } from "@ecu/timing-engine";
import { SessionFSM, SessionType, SessionContext } from "@ecu/session-fsm";
import { Kwp2000Router } from "@ecu/kwp2000";
import type { Kwp2000Frame, Kwp2000Response } from "@ecu/kwp2000";

export interface VirtualEcuConfig {
  transport: TransportConfig;
  session?: {
    timeoutMs?: number;
    testerPresentTimeoutMs?: number;
    securityTimeoutMs?: number;
  };
  protocol: "kwp2000" | "iso9141";
  dtcEngine?: DTCEngine;
  didRegistry?: DIDRegistry;
}

/**
 * VirtualEcu — complete ECU simulation with all layers
 *
 * Architecture:
 *   Transport Layer (TCP/Serial/WebSocket)
 *     ↓ frames
 *   Protocol Layer (KWP2000/ISO9141)
 *     ↓ service requests
 *   Service Layer (DTC/DID/Security)
 *     ↓ state
 *   Session FSM + Timing Engine
 */
export class VirtualEcu {
  private transport: AbstractTransport;
  private protocol: Kwp2000Router | null = null;
  private session: SessionFSM;
  private dtcEngine: DTCEngine;
  private didRegistry: DIDRegistry;
  private running = false;
  private protocolType: "kwp2000" | "iso9141";

  // State listeners
  private stateListeners: Array<(state: string, ctx: any) => void> = [];

  constructor(config: VirtualEcuConfig) {
    // Initialize services (singletons or injected)
    this.dtcEngine = config.dtcEngine ?? new DTCEngine();
    this.didRegistry = config.didRegistry ?? new DIDRegistry();
    this.session = new SessionFSM({
      sessionTimeoutMs: config.session?.timeoutMs ?? 5000,
      testerPresentTimeoutMs: config.session?.testerPresentTimeoutMs ?? 5000,
      securityTimeoutMs: config.session?.securityTimeoutMs ?? 10000,
    });

    // Create transport from config
    this.transport = this.createTransportSync(config.transport);
    this.protocolType = config.protocol;

    // Wire up transport event listeners
    this.setupTransportListeners();
  }

  /** Create transport instance from factory */
  private createTransportSync(config: TransportConfig): AbstractTransport {
    const mode = config.mode;

    switch (mode) {
      case "tcp": {
        const { TcpTransport } = require("@ecu/transport-tcp");
        return new TcpTransport({
          host: config.host ?? "127.0.0.1",
          port: config.port ?? 20000,
          connectTimeoutMs: config.connectTimeoutMs ?? 5000,
          readTimeoutMs: config.readTimeoutMs ?? 2000,
        });
      }
      case "serial": {
        const { SerialTransport } = require("@ecu/transport-serial");
        if (!config.path)
          throw new Error("ECU_SERIAL_PORT not set for serial transport");
        return new SerialTransport({
          path: config.path,
          baudRate: config.baudRate ?? 10400,
          connectTimeoutMs: config.connectTimeoutMs ?? 3000,
          readTimeoutMs: config.readTimeoutMs ?? 2000,
        });
      }
      case "websocket": {
        const { WebSocketTransport } = require("@ecu/transport-ws");
        return new WebSocketTransport({
          host: config.host ?? "localhost",
          port: config.port ?? 8080,
          connectTimeoutMs: config.connectTimeoutMs ?? 5000,
          readTimeoutMs: config.readTimeoutMs ?? 2000,
        });
      }
      default:
        throw new Error(`Unknown transport mode: ${String(mode)}`);
    }
  }

  private setupTransportListeners(): void {
    this.transport.on((event) => {
      switch (event.type) {
        case "connected":
          this.handleConnect();
          break;
        case "disconnected":
          this.handleDisconnect();
          break;
        case "data":
          this.handleIncomingData(event.payload);
          break;
        case "error":
          console.error("[ECU] Transport error:", event.error);
          break;
      }
    });
  }

  /** Handle new client connection */
  private async handleConnect(): Promise<void> {
    console.log("[ECU] Client connected");
    this.running = true;

    // Initialize session FSM
    this.session.send({ type: "CONNECT" });

    // Initialize protocol router based on type
    if (this.protocolType === "kwp2000") {
      this.protocol = new Kwp2000Router({
        dtcEngine: this.dtcEngine,
        sessionTimeoutMs: 5000,
        p2TimeoutMs: 50,
        p3TimeoutMs: 5000,
      });
    } else {
      // TODO: ISO9141 protocol initialization
      console.warn("[ECU] ISO9141 protocol not yet fully integrated");
    }
  }

  /** Handle client disconnection */
  private handleDisconnect(): void {
    console.log("[ECU] Client disconnected");
    this.running = false;
    this.session.send({ type: "DISCONNECT" });
  }

  /** Handle incoming data from transport */
  private async handleIncomingData(data: Buffer): Promise<void> {
    try {
      if (this.protocolType === "kwp2000" && this.protocol) {
        // Parse KWP2000 frame
        const frame = this.protocol.parseFrame(data);
        if (!frame) {
          // Invalid frame — could send negative response or ignore
          console.warn("[ECU] Invalid KWP2000 frame");
          return;
        }

        // Route through session FSM for state-aware handling
        await this.handleRequest(frame);
      } else {
        console.log(
          "[ECU] Received (no protocol active):",
          data.toString("hex"),
        );
      }
    } catch (err) {
      console.error("[ECU] Error handling data:", err);
    }
  }

  /** Process protocol request through router + services */
  private async handleRequest(frame: Kwp2000Frame): Promise<void> {
    // Process request through KWP2000 router
    const response = this.protocol!.processRequest(frame);

    // Format response into KWP2000 frame
    const responseFrame = this.protocol!.formatResponse(response);

    // Send response
    await this.transport.send(responseFrame);
  }

  /** Start the ECU (listen for connections) */
  async start(): Promise<void> {
    console.log(`[ECU] Starting Virtual ECU (${this.protocolType})...`);
    await this.transport.connect();
    this.emit("started");
  }

  /** Stop the ECU */
  async stop(): Promise<void> {
    console.log("[ECU] Stopping Virtual ECU");
    await this.transport.disconnect();
    this.running = false;
    this.emit("stopped");
  }

  /** Check if ECU is running */
  isRunning(): boolean {
    return this.running;
  }

  /** Get current session state */
  getSessionState(): string {
    return this.session.getState();
  }

  /** Get session context */
  getSessionContext(): SessionContext {
    return this.session.getContext();
  }

  /** Get DTC engine (for testing/inspection) */
  getDtcEngine(): DTCEngine {
    return this.dtcEngine;
  }

  /** Get DID registry (for testing/inspection) */
  getDidRegistry(): DIDRegistry {
    return this.didRegistry;
  }

  /** Get timing engine (for testing/inspection) */
  getTimingEngine() {
    return timingEngine;
  }

  /** Subscribe to state changes */
  onStateChange(
    listener: (state: string, context: SessionContext) => void,
  ): () => void {
    this.stateListeners.push(listener as any);
    return () => {
      const idx = this.stateListeners.indexOf(listener as any);
      if (idx > -1) this.stateListeners.splice(idx, 1);
    };
  }

  /** Emit state changes to listeners */
  private emit(event: "started" | "stopped" | "stateChange", data?: any): void {
    // Internal event system — can be expanded
    if (event === "stateChange") {
      this.stateListeners.forEach((l) => l(data.state, data.context));
    }
  }

  /** Inject a fault (delegates to DTC engine or simulator) */
  injectFault(type: "dtc" | "timing" | "sensor", params: any): void {
    switch (type) {
      case "dtc":
        this.dtcEngine.set(params.code, params.status, params.description);
        break;
      case "timing":
        timingEngine.injectTimingViolation(params.violationType);
        break;
      default:
        console.warn("[ECU] Unknown fault type:", type);
    }
  }

  /** Reset ECU to initial state */
  reset(): void {
    this.dtcEngine.clear();
    this.didRegistry.clearAll();
    this.session.reset();
    securityEngine.lockAll();
  }
}
