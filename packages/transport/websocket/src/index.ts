/** @ecu/transport-ws — stub implementation */
import {
  AbstractTransport,
  TransportConfig,
  TransportEvent,
  TransportListener,
  TransportError,
  TransportTimeoutError,
  TransportNotConnectedError,
} from "@ecu/transport-abstract";

export const PKG = "@ecu/transport-ws";

export interface WebSocketConfig {
  host?: string;
  port?: number;
  connectTimeoutMs?: number;
  readTimeoutMs?: number;
}

export class WebSocketTransport extends AbstractTransport {
  private config: Required<WebSocketConfig>;

  constructor(config: WebSocketConfig = {}) {
    super();
    this.config = {
      host: config.host ?? "localhost",
      port: config.port ?? 8080,
      connectTimeoutMs: config.connectTimeoutMs ?? 5000,
      readTimeoutMs: config.readTimeoutMs ?? 2000,
    };
  }

  get mode() {
    return "websocket" as const;
  }
  get isConnected(): boolean {
    return false;
  }

  async connect(): Promise<void> {
    throw new TransportError(
      "WebSocket transport not implemented yet",
      "websocket",
    );
  }

  async disconnect(): Promise<void> {
    throw new TransportError(
      "WebSocket transport not implemented yet",
      "websocket",
    );
  }

  async send(data: Buffer): Promise<void> {
    throw new TransportNotConnectedError("websocket");
  }

  async read(expectedBytes: number, timeoutMs?: number): Promise<Buffer> {
    throw new TransportNotConnectedError("websocket");
  }

  override on(listener: TransportListener): () => void {
    return () => {};
  }
}
