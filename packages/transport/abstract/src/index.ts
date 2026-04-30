/**
 * @ecu/transport-abstract
 * Core transport interface — all physical/virtual transports implement this.
 * Supports hybrid: TCP for dev/CI, Serial for real K-Line hardware.
 */

export type TransportMode = "tcp" | "serial" | "websocket";

export interface TransportConfig {
  mode: TransportMode;
  // TCP / WebSocket
  host?: string;
  port?: number;
  // Serial (K-Line hardware)
  path?: string; // e.g. '/dev/ttyUSB0' or 'COM3'
  baudRate?: number; // Default: 10400 for K-Line
  // Shared
  connectTimeoutMs?: number;
  readTimeoutMs?: number;
}

export interface TransportStats {
  bytesReceived: number;
  bytesSent: number;
  errors: number;
  connectedAt: Date;
}

export type TransportEvent =
  | { type: "connected" }
  | { type: "disconnected"; reason?: string }
  | { type: "data"; payload: Buffer }
  | { type: "error"; error: Error };

export type TransportListener = (event: TransportEvent) => void;

/**
 * Abstract transport interface.
 * Implement this for each physical medium.
 */
export abstract class AbstractTransport {
  protected listeners: Set<TransportListener> = new Set();
  protected _stats: TransportStats = {
    bytesReceived: 0,
    bytesSent: 0,
    errors: 0,
    connectedAt: new Date(),
  };

  abstract get mode(): TransportMode;
  abstract get isConnected(): boolean;

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract send(data: Buffer): Promise<void>;

  /** Read with configurable timeout — throws TransportTimeoutError on expiry */
  abstract read(expectedBytes: number, timeoutMs?: number): Promise<Buffer>;

  on(listener: TransportListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get stats(): Readonly<TransportStats> {
    return { ...this._stats };
  }

  protected emit(event: TransportEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  protected trackSend(bytes: number): void {
    this._stats.bytesSent += bytes;
  }

  protected trackReceive(bytes: number): void {
    this._stats.bytesReceived += bytes;
  }
}

// ─── Error Types ─────────────────────────────────────────────────────────────

export class TransportError extends Error {
  override name: string;
  override readonly cause?: unknown;

  constructor(
    message: string,
    public readonly mode: TransportMode,
    cause?: unknown,
  ) {
    super(message);
    this.name = "TransportError";
    this.cause = cause;
  }
}

export class TransportTimeoutError extends TransportError {
  constructor(mode: TransportMode, timeoutMs: number) {
    super(`Transport timeout after ${timeoutMs}ms`, mode);
    this.name = "TransportTimeoutError";
  }
}

export class TransportNotConnectedError extends TransportError {
  constructor(mode: TransportMode) {
    super(`Transport [${mode}] not connected`, mode);
    this.name = "TransportNotConnectedError";
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Factory to instantiate the correct transport from config or env.
 * Priority: explicit config > ECU_TRANSPORT env var > default (tcp)
 */
export async function createTransport(
  config?: Partial<TransportConfig>,
): Promise<AbstractTransport> {
  const mode =
    config?.mode ??
    (process.env["ECU_TRANSPORT"] as TransportMode | undefined) ??
    "tcp";

  switch (mode) {
    case "tcp": {
      const { TcpTransport } = await import("@ecu/transport-tcp");
      return new TcpTransport({
        host: config?.host ?? process.env["ECU_HOST"] ?? "127.0.0.1",
        port: config?.port ?? Number(process.env["ECU_PORT"] ?? 20000),
        connectTimeoutMs: config?.connectTimeoutMs ?? 5000,
        readTimeoutMs: config?.readTimeoutMs ?? 2000,
      });
    }
    case "serial": {
      const { SerialTransport } = await import("@ecu/transport-serial");
      return new SerialTransport({
        path:
          config?.path ??
          process.env["ECU_SERIAL_PORT"] ??
          (() => {
            throw new Error("ECU_SERIAL_PORT not set for serial transport");
          })(),
        baudRate:
          config?.baudRate ?? Number(process.env["ECU_BAUD_RATE"] ?? 10400),
        connectTimeoutMs: config?.connectTimeoutMs ?? 3000,
        readTimeoutMs: config?.readTimeoutMs ?? 2000,
      });
    }
    case "websocket": {
      const { WebSocketTransport } = await import("@ecu/transport-ws");
      return new WebSocketTransport({
        host: config?.host ?? "localhost",
        port: config?.port ?? 8080,
      });
    }
    default:
      throw new Error(`Unknown transport mode: ${String(mode)}`);
  }
}
