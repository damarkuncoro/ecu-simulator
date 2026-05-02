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
 * This interface is implemented by infrastructure layer (KWP2000, ISO9141 handlers)
 */
export interface IProtocolHandler {
  parseFrame(data: Buffer): any; // Returns parsed frame object
  formatResponse(response: any): Buffer; // Formats response into transport frame
  processRequest(request: any): any; // Processes request and returns response
  startSession(): Promise<void>;
  endSession(): Promise<void>;
  getProtocolType(): 'kwp2000' | 'iso9141';
}