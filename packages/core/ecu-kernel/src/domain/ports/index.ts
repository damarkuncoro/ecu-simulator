/**
 * Transport Port - Defines the contract for transport layer operations
 * This interface is implemented by infrastructure layer (TCP, Serial, WebSocket transports)
 */
export interface ITransport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(data: Buffer): Promise<void>;
  on(event: string, listener: (data: any) => void): void;
  off(event: string, listener: (data: any) => void): void;
  isConnected(): boolean;
  getMode(): 'tcp' | 'serial' | 'websocket';
}

/**
 * Protocol Handler Port - Defines the contract for protocol handling operations
 * This interface is implemented by infrastructure layer (KWP2000, ISO9141, UDS handlers)
 *
 * Type parameters are intentionally using 'unknown' to enforce type safety
 * in implementations. Implementations should define specific frame/response types.
 */
export interface IProtocolHandler {
  parseFrame(data: Buffer): unknown | null;
  formatResponse(response: unknown): Buffer;
  processRequest(request: unknown): unknown;
  startSession(): Promise<void>;
  endSession(): Promise<void>;
  getProtocolType(): 'kwp2000' | 'iso9141';
}