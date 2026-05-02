/**
 * TCP Transport Adapter - Adapts the existing TcpTransport to our ITransport interface
 * This allows the domain to depend on the interface rather than the concrete implementation
 */
import { ITransport } from "../../../domain/ports";

/**
 * Adapter for TCP transport
 * Wraps the existing TcpTransport from @ecu/transport-tcp
 */
export class TcpTransportAdapter implements ITransport {
  private transport: any; // The actual TcpTransport instance
  private host: string;
  private port: number;
  private connectTimeoutMs: number;
  private readTimeoutMs: number;

  constructor(config: {
    host: string;
    port: number;
    connectTimeoutMs?: number;
    readTimeoutMs?: number;
  }) {
    this.host = config.host;
    this.port = config.port;
    this.connectTimeoutMs = config.connectTimeoutMs ?? 5000;
    this.readTimeoutMs = config.readTimeoutMs ?? 2000;
  }

  async connect(): Promise<void> {
    // Dynamically load the TcpTransport to avoid hard dependency in domain
    const { TcpTransport } = await import("@ecu/transport-tcp");
    this.transport = new TcpTransport({
      host: this.host,
      port: this.port,
      connectTimeoutMs: this.connectTimeoutMs,
      readTimeoutMs: this.readTimeoutMs,
    });

    return this.transport.connect();
  }

  async disconnect(): Promise<void> {
    if (!this.transport) {
      throw new Error("Transport not connected");
    }
    return this.transport.disconnect();
  }

  async send(data: Buffer): Promise<void> {
    if (!this.transport) {
      throw new Error("Transport not connected");
    }
    return this.transport.send(data);
  }

  on(event: string, listener: (data: any) => void): void {
    if (!this.transport) {
      throw new Error("Transport not connected");
    }
    // Assuming the existing transport uses .on() method
    this.transport.on(event, listener);
  }

  off(event: string, listener: (data: any) => void): void {
    if (!this.transport) {
      throw new Error("Transport not connected");
    }
    // Assuming the existing transport uses .off() method
    this.transport.off(event, listener);
  }

  isConnected(): boolean {
    return this.transport && this.transport.isConnected?.();
  }

  getMode(): "tcp" | "serial" | "websocket" {
    return "tcp";
  }
}