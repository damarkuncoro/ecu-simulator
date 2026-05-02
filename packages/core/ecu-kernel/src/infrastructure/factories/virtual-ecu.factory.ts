/**
 * Factory for creating configured VirtualEcu instances
 * This factory handles dependency injection and wires together all components
 */
import { VirtualEcu } from "../../index";
import { ITransport } from "../../domain/ports";
import { IProtocolHandler } from "../../domain/ports";
import { IECURepository } from "../../domain/repositories";
import { IDTCRepository } from "../../domain/repositories";
import { IDTCEngine } from "../../domain/ports/dtc-engine.port";
import { IDIDRegistry } from "../../domain/ports/did-registry.port";
import { InMemoryECURepository } from "../repositories/ecu-repository.impl";
import { InMemoryDTCRepository } from "../repositories/dtc-repository.impl";
import { TcpTransportAdapter } from "../transport-adapters/tcp-transport.adapter";
import { DtcEngineAdapter } from "../service-adapters/dtc-engine.adapter";
import { DidRegistryAdapter } from "../service-adapters/did-registry.adapter";

/**
 * Factory for creating VirtualEcu instances with TCP transport
 */
import {
  DEFAULT_SESSION_TIMEOUT_MS,
  DEFAULT_P2_TIMEOUT_MS,
  DEFAULT_P3_TIMEOUT_MS,
} from "@ecu/protocol-constants";
export class VirtualEcuFactory {
  /**
   * Create a VirtualEcu configured for TCP transport
   * @param config Transport configuration (host, port, etc.)
   * @param protocolType The protocol to use ("kwp2000" or "iso9141")
   * @returns Configured VirtualEcu instance
   */
  static createTcpEcu(
    config: {
      host: string;
      port: number;
      connectTimeoutMs?: number;
      readTimeoutMs?: number;
    },
    protocolType: "kwp2000" | "iso9141"
  ): VirtualEcu {
    // Create repositories
    const ecuRepository = new InMemoryECURepository();
    const dtcRepository = new InMemoryDTCRepository();

    // Create service adapters
    const dtcEngine = new DtcEngineAdapter();
    const didRegistry = new DidRegistryAdapter();

    // Create transport adapter
    const transport = new TcpTransportAdapter({
      host: config.host,
      port: config.port,
      connectTimeoutMs: config.connectTimeoutMs,
      readTimeoutMs: config.readTimeoutMs,
    });

    // Create protocol handler based on type
    const protocolHandler = VirtualEcuFactory.createProtocolHandler(
      protocolType,
      ecuRepository,
      dtcRepository,
      dtcEngine,
      didRegistry
    );

    // Create and return VirtualEcu
    return new VirtualEcu({
      transport,
      protocolHandler,
      ecuRepository,
      dtcRepository,
      dtcEngine,
      didRegistry,
    });
  }

  /**
   * Create a protocol handler instance
   * @param protocolType The protocol type to create
   * @param ecuRepository Repository for ECU data
   * @param dtcRepository Repository for DTC data
   * @param dtcEngine The DTC engine adapter
   * @param didRegistry The DID registry adapter
   * @returns Protocol handler implementation
   */
  private static createProtocolHandler(
    protocolType: "kwp2000" | "iso9141",
    ecuRepository: IECURepository,
    dtcRepository: IDTCRepository,
    dtcEngine: IDTCEngine,
    didRegistry: IDIDRegistry
  ): IProtocolHandler {
    switch (protocolType) {
      case "kwp2000":
        // For now, we'll return a placeholder that needs to be implemented
        // In a full implementation, this would wrap the existing Kwp2000Router
        return new Kwp2000ProtocolHandlerAdapter(ecuRepository, dtcRepository, dtcEngine, didRegistry);
      case "iso9141":
        // Placeholder for ISO9141 handler
        return new Iso9141ProtocolHandlerAdapter(ecuRepository, dtcRepository, dtcEngine, didRegistry);
      default:
        throw new Error(`Unsupported protocol type: ${protocolType}`);
    }
  }
}

/**
 * Adapter for KWP2000 protocol handler
 * Wraps the existing Kwp2000Router to implement IProtocolHandler
 */
import type { Kwp2000Frame, Kwp2000Response } from "@ecu/kwp2000";

class Kwp2000ProtocolHandlerAdapter implements IProtocolHandler {
  private router: any; // The actual Kwp2000Router instance (lazy-loaded)

  constructor(
    private ecuRepository: IECURepository,
    private dtcRepository: IDTCRepository,
    private dtcEngine: IDTCEngine,
    private didRegistry: IDIDRegistry
  ) {}

   private async initializeRouter(): Promise<void> {
     if (!this.router) {
       const { Kwp2000Router } = await import("@ecu/kwp2000");
       this.router = new Kwp2000Router({
         dtcEngine: this.dtcEngine as any,
         sessionTimeoutMs: DEFAULT_SESSION_TIMEOUT_MS,
         p2TimeoutMs: DEFAULT_P2_TIMEOUT_MS,
         p3TimeoutMs: DEFAULT_P3_TIMEOUT_MS,
       });
     }
   }

   async parseFrame(data: Buffer): Promise<unknown | null> {
    await this.initializeRouter();
    return this.router.parseFrame(data);
  }

  async formatResponse(response: unknown): Promise<Buffer> {
    await this.initializeRouter();
    return this.router.formatResponse(response as any); // type cast for internal compatibility
  }

  async processRequest(request: unknown): Promise<unknown> {
    await this.initializeRouter();
    return this.router.processRequest(request as any);
  }

  async startSession(): Promise<void> {
    await this.initializeRouter();
    if (this.router.startSession) {
      await this.router.startSession();
    }
  }

  async endSession(): Promise<void> {
    await this.initializeRouter();
    if (this.router.endSession) {
      await this.router.endSession();
    }
  }

  getProtocolType(): 'kwp2000' | 'iso9141' | 'uds' {
    return 'kwp2000';
  }
}

/**
 * Adapter for ISO9141 protocol handler
 * Placeholder implementation - to be completed
 */
class Iso9141ProtocolHandlerAdapter implements IProtocolHandler {
  constructor(
    private ecuRepository: IECURepository,
    private dtcRepository: IDTCRepository,
    private dtcEngine: IDTCEngine,
    private didRegistry: IDIDRegistry
  ) {}

  async parseFrame(data: Buffer): Promise<unknown | null> {
    throw new Error("ISO9141 protocol handler not yet implemented");
  }

  async formatResponse(response: unknown): Promise<Buffer> {
    throw new Error("ISO9141 protocol handler not yet implemented");
  }

  async processRequest(request: unknown): Promise<unknown> {
    throw new Error("ISO9141 protocol handler not yet implemented");
  }

  async startSession(): Promise<void> {
    throw new Error("ISO9141 protocol handler not yet implemented");
  }

  async endSession(): Promise<void> {
    throw new Error("ISO9141 protocol handler not yet implemented");
  }

  getProtocolType(): 'kwp2000' | 'iso9141' | 'uds' {
    return 'iso9141';
  }
}