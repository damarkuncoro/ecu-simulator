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
  /**
   * Parse raw Buffer into a protocol-specific frame object
   * @param data Raw bytes from transport
   * @returns Parsed frame or null if invalid
   */
  parseFrame(data: Buffer): Promise<unknown | null>;

  /**
   * Format a protocol-specific response object into transport frame Buffer
   * @param response Protocol response object
   * @returns Buffer ready for transmission
   */
  formatResponse(response: unknown): Promise<Buffer>;

  /**
   * Process a parsed request frame and produce a response
   * @param request Parsed request frame
   * @returns Protocol response object
   */
  processRequest(request: unknown): Promise<unknown>;

  startSession(): Promise<void>;
  endSession(): Promise<void>;

  /**
   * Get the protocol type identifier
   */
  getProtocolType(): 'kwp2000' | 'iso9141';
}