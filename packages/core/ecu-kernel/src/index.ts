/**
 * @ecu/core-kernel
 * Refactored Virtual ECU following Clean Architecture principles
 * Now depends on abstractions (interfaces) rather than concrete implementations
 */

import { ITransport } from "./domain/ports";
import { IProtocolHandler } from "./domain/ports";
import { IDTCEngine } from "./domain/ports/dtc-engine.port";
import { IDIDRegistry } from "./domain/ports/did-registry.port";
import { ECU } from "./domain/model/ecu";
import { DTCStatus } from "./domain/model/dtc-status";
import { IECURepository } from "./domain/repositories";
import { IDTCRepository } from "./domain/repositories";
import { ECUService } from "./application/services/ecu-service";
import { DTCService } from "./application/services/dtc-service";
import { SessionFSM, SessionContext } from "@ecu/session-fsm";
import { timingEngine } from "@ecu/timing-engine";
import { securityEngine } from "@ecu/security-engine";
import { VirtualEcuFactory } from "./infrastructure/factories/virtual-ecu.factory";
import {
  DEFAULT_SESSION_TIMEOUT_MS,
  DEFAULT_P3_TIMEOUT_MS,
  DEFAULT_SECURITY_TIMEOUT_MS,
} from "@ecu/protocol-constants";
import * as DomainErrors from "./domain/errors";

// ─── Fault Injector Registry (OCP: open for extension via registration) ──────

export interface FaultInjector {
  type: string;
  inject(params: any): void;
}

export class FaultInjectorRegistry {
  private injectors = new Map<string, FaultInjector>();

  register(injector: FaultInjector): void {
    this.injectors.set(injector.type, injector);
  }

  inject(type: string, params: any): void {
    const injector = this.injectors.get(type);
    if (injector) {
      injector.inject(params);
    } else {
      console.warn(`[FaultInjector] Unknown fault type: ${type}`);
    }
  }

  getRegisteredTypes(): string[] {
    return Array.from(this.injectors.keys());
  }
}

/**
 * Configuration interface for the refactored VirtualEcu
 */
export interface VirtualEcuConfig {
  transport: ITransport;
  protocolHandler: IProtocolHandler;
  ecuRepository: IECURepository;
  dtcRepository: IDTCRepository;
  dtcEngine: IDTCEngine;
  didRegistry: IDIDRegistry;
  session?: {
    timeoutMs?: number;
    testerPresentTimeoutMs?: number;
    securityTimeoutMs?: number;
  };
}

/**
 * VirtualEcu — Refactored ECU simulation with Clean Architecture
 * 
 * Dependencies are injected via constructor (Dependency Inversion Principle)
 * Each responsibility is separated into different services (Single Responsibility Principle)
 */
export class VirtualEcu {
   private transport: ITransport;
   private protocolHandler: IProtocolHandler;
   private ecu: ECU;
   private session: SessionFSM;
   private ecuService: ECUService;
   private dtcService: DTCService;
   private dtcEngine: IDTCEngine;
   private didRegistry: IDIDRegistry;
   private running = false;
   private faultInjectorRegistry: FaultInjectorRegistry;

   // State listeners
   private stateListeners: Array<(state: string, ctx: SessionContext) => void> = [];

   constructor(config: VirtualEcuConfig) {
     // Initialize core ECU entity
     this.ecu = new ECU("ecu-001"); // In real implementation, this could come from config

     // Inject infrastructure dependencies
     this.transport = config.transport;
     this.protocolHandler = config.protocolHandler;
     this.dtcEngine = config.dtcEngine;
     this.didRegistry = config.didRegistry;

     // Inject repositories
     const ecuRepository = config.ecuRepository;
     const dtcRepository = config.dtcRepository;

     // Initialize application services
     this.ecuService = new ECUService(ecuRepository);
     this.dtcService = new DTCService(dtcRepository, ecuRepository);

     // Initialize fault injector registry (OCP: extensible via registration)
     this.faultInjectorRegistry = new FaultInjectorRegistry();
     this.registerDefaultFaultInjectors();

    // Initialize session FSM
    this.session = new SessionFSM({
      sessionTimeoutMs: config.session?.timeoutMs ?? DEFAULT_SESSION_TIMEOUT_MS,
      testerPresentTimeoutMs: config.session?.testerPresentTimeoutMs ?? DEFAULT_P3_TIMEOUT_MS,
      securityTimeoutMs: config.session?.securityTimeoutMs ?? DEFAULT_SECURITY_TIMEOUT_MS,
    });

     // Wire up transport event listeners
     this.setupTransportListeners();

     // Wire up protocol handler events
     this.setupProtocolHandlerListeners();
   }

   private registerDefaultFaultInjectors(): void {
     this.faultInjectorRegistry.register({
       type: "dtc",
       inject: (params: any) => {
         this.dtcEngine.set(params.code, params.status, params.description);
       },
     });

     this.faultInjectorRegistry.register({
       type: "timing",
       inject: (params: any) => {
         timingEngine.injectTimingViolation(params.violationType);
       },
     });

     // Sensor fault injector can be added similarly when implemented
   }

  private setupTransportListeners(): void {
    this.transport.on("connected", () => this.handleConnect());
    this.transport.on("disconnected", () => this.handleDisconnect());
    this.transport.on("data", (data: Buffer) => this.handleIncomingData(data));
    this.transport.on("error", (error: any) => {
      console.error("[ECU] Transport error:", error);
    });
  }

  private setupProtocolHandlerListeners(): void {
    // Protocol handler events can be set up here if needed
  }

  /** Handle new client connection */
  private async handleConnect(): Promise<void> {
    console.log("[ECU] Client connected");
    this.running = true;

    // Update ECU state
    this.ecu.powerOn();
    this.ecu.setProtocol(this.protocolHandler.getProtocolType());
    this.ecu.startSession();

    // Initialize session FSM
    this.session.send({ type: "CONNECT" });
    
    this.emitStateChange();
  }

  /** Handle client disconnection */
  private handleDisconnect(): void {
    console.log("[ECU] Client disconnected");
    this.running = false;
    
    // Update ECU state
    this.ecu.endSession();
    this.ecu.enterSleep(); // or powerOff depending on requirements
    
    this.session.send({ type: "DISCONNECT" });
    this.emitStateChange();
  }

  /** Handle incoming data from transport */
  private async handleIncomingData(data: Buffer): Promise<void> {
    try {
      // Parse frame using protocol handler
      const frame = this.protocolHandler.parseFrame(data);
      if (!frame) {
        console.warn("[ECU] Invalid frame received");
        return;
      }

      // Process request through protocol handler
      const response = this.protocolHandler.processRequest(frame);
      
      // Format response into transport frame
      const responseFrame = this.protocolHandler.formatResponse(response);
      
      // Send response
      await this.transport.send(responseFrame);
      
    } catch (err) {
      console.error("[ECU] Error handling data:", err);
      // Optionally send error response based on protocol
    }
  }

  /** Start the ECU (listen for connections) */
  async start(): Promise<void> {
    console.log(`[ECU] Starting Virtual ECU...`);
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

  /** Get current ECU state */
  getECUState(): { 
    power: 'off' | 'on' | 'sleep';
    protocol: 'kwp2000' | 'iso9141' | null;
    sessionActive: boolean;
    securityLocked: boolean;
  } {
    return {
      power: this.ecu.getState(),
      protocol: this.ecu.getProtocol(),
      sessionActive: this.ecu.isSessionActive(),
      securityLocked: this.ecu.isSecurityLocked()
    };
  }

  /** Get session state from FSM */
  getSessionState(): string {
    return this.session.getState();
  }

  /** Get session context */
  getSessionContext(): SessionContext {
    return this.session.getContext();
  }

  /** Get DTCs for this ECU */
  async getDTCs(): Promise<any[]> {
    // Use the injected dtcEngine to get DTCs
    return this.dtcEngine.getAll();
  }

  /** Inject a fault using registered fault injectors (OCP) */
  injectFault(type: string, params: any): void {
    this.faultInjectorRegistry.inject(type, params);
  }

  /** Reset ECU to initial state */
  reset(): void {
    this.ecu.reset();
    this.session.reset();
    securityEngine.lockAll();
    // Clear the DTC engine and DID registry via their interfaces
    this.dtcEngine.clear();
    this.didRegistry.clearAll();
    this.emitStateChange();
  }

  /** Subscribe to state changes */
  onStateChange(
    listener: (state: string, context: SessionContext) => void,
  ): () => void {
    this.stateListeners.push(listener);
    return () => {
      const idx = this.stateListeners.indexOf(listener);
      if (idx > -1) this.stateListeners.splice(idx, 1);
    };
  }

  /** Emit state changes to listeners */
  private emitStateChange(): void {
    this.stateListeners.forEach((listener) => 
      listener(this.getSessionState(), this.getSessionContext())
    );
  }

   /** Emit general events */
   private emit(event: "started" | "stopped", data?: any): void {
     // Internal event system — can be expanded
     // In a more complete implementation, this could use an event emitter
     if (event === "started" || event === "stopped") {
       console.log(`[ECU] ${event}`);
     }
   }
 }

// ─── Exports ───────────────────────────────────────────────────────────────────

export * from "./domain/errors";
export { PKG as CORE_KERNEL_PKG } from "./index";