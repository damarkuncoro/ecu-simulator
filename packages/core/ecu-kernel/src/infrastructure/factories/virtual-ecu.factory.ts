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
class Kwp2000ProtocolHandlerAdapter implements IProtocolHandler {
  private router: any; // The actual Kwp2000Router instance

  constructor(
    private ecuRepository: IECURepository,
    private dtcRepository: IDTCRepository,
    private dtcEngine: IDTCEngine,
    private didRegistry: IDIDRegistry
  ) {
    // Note: We'll initialize the router lazily or in a setup method
    // This avoids circular dependencies during construction
  }

  private async initializeRouter(): Promise<void> {
    if (!this.router) {
      // Dynamically load the KWP2000 router to avoid hard dependency
      const { Kwp2000Router } = await import("@ecu/kwp2000");
      
      // Create temporary service instances for the router
      // In a full implementation, these would be proper service adapters
      // But now we can pass the actual adapters we created
      this.router = new Kwp2000Router({
        dtcEngine: this.dtcEngine, // Now we pass the actual adapter
        sessionTimeoutMs: 5000,
        p2TimeoutMs: 50,
        p3TimeoutMs: 5000,
      });
    }
  }

  async parseFrame(data: Buffer): Promise<any> {
    await this.initializeRouter();
    // Delegate to the actual router's parseFrame method
    return this.router.parseFrame(data);
  }

  async formatResponse(response: any): Promise<Buffer> {
    await this.initializeRouter();
    // Delegate to the actual router's formatResponse method
    return this.router.formatResponse(response);
  }

  async processRequest(request: any): Promise<any> {
    await this.initializeRouter();
    // Delegate to the actual router's processRequest method
    return this.router.processRequest(request);
  }

  async startSession(): Promise<void> {
    await this.initializeRouter();
    // Delegate to the actual router's startSession method if it exists
    if (this.router.startSession) {
      await this.router.startSession();
    }
  }

  async endSession(): Promise<void> {
    await this.initializeRouter();
    // Delegate to the actual router's endSession method if it exists
    if (this.router.endSession) {
      await this.router.endSession();
    }
  }

  getProtocolType(): "kwp2000" | "iso9141" {
    return "kwp2000";
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

  async parseFrame(data: Buffer): Promise<any> {
    // TODO: Implement ISO9141 frame parsing
    throw new Error("ISO9141 protocol handler not yet implemented");
  }

  async formatResponse(response: any): Promise<Buffer> {
    // TODO: Implement ISO9141 response formatting
    throw new Error("ISO9141 protocol handler not yet implemented");
  }

  async processRequest(request: any): Promise<any> {
    // TODO: Implement ISO9141 request processing
    throw new Error("ISO9141 protocol handler not yet implemented");
  }

  async startSession(): Promise<void> {
    // TODO: Implement ISO9141 session start
    throw new Error("ISO9141 protocol handler not yet implemented");
  }

  async endSession(): Promise<void> {
    // TODO: Implement ISO9141 session end
    throw new Error("ISO9141 protocol handler not yet implemented");
  }

  getProtocolType(): "kwp2000" | "iso9141" {
    return "iso9141";
  }
}