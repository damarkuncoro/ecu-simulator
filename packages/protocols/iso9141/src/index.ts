/**
 * @ecu/iso9141
 * ISO 9141-2 (K-Line) physical layer implementation.
 * Handles 5-baud initialization and K-Line communication.
 */

import { AbstractTransport, TransportConfig } from "@ecu/transport-abstract";

export const PKG = "@ecu/iso9141";

// ─── ISO9141 Frame Types ──────────────────────────────────────────────────────

export interface Iso9141Config {
  /** ECU address for 5-baud init (default: 0x33) */
  ecuAddress?: number;
  /** Tester address (default: 0xF1) */
  testerAddress?: number;
  /** Communication baud rate after init (default: 10400) */
  baudRate?: number;
  /** Timeout for responses in ms (default: 100) */
  responseTimeoutMs?: number;
  /** Inter-byte timeout in ms (default: 20) */
  interByteTimeoutMs?: number;
}

export interface Iso9141Frame {
  data: Buffer;
  isResponse: boolean;
  timestamp: number;
}

// ─── ISO9141 Protocol Handler ────────────────────────────────────────────────

export class Iso9141Protocol {
  private config: Required<Iso9141Config>;
  private transport: AbstractTransport;
  private initialized = false;

  constructor(transport: AbstractTransport, config: Iso9141Config = {}) {
    this.transport = transport;
    this.config = {
      ecuAddress: config.ecuAddress ?? 0x33,
      testerAddress: config.testerAddress ?? 0xf1,
      baudRate: config.baudRate ?? 10400,
      responseTimeoutMs: config.responseTimeoutMs ?? 100,
      interByteTimeoutMs: config.interByteTimeoutMs ?? 20,
    };
  }

  /** Perform ISO9141 5-baud initialization sequence */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Step 1: Send address byte at 5 baud
      await this.sendAt5Baud(this.config.ecuAddress);

      // Step 2: Wait for ECU response (should be address + 0x08)
      const initResponse = await this.receiveWithTimeout(300); // 300ms timeout

      if (initResponse.length === 0) {
        throw new Error("No response to 5-baud initialization");
      }

      const expectedResponse = this.config.ecuAddress + 0x08;
      if (initResponse[0] !== expectedResponse) {
        throw new Error(
          `Invalid initialization response: expected 0x${expectedResponse.toString(16)}, got 0x${initResponse[0]?.toString(16)}`,
        );
      }

      // Step 3: Send sync byte (0xCC) at 5 baud
      await this.sendAt5Baud(0xcc);

      // Step 4: Receive keyword bytes from ECU
      const keyword1 = await this.receiveWithTimeout(50);
      const keyword2 = await this.receiveWithTimeout(50);

      if (keyword1.length === 0 || keyword2.length === 0) {
        throw new Error("Failed to receive keyword bytes");
      }

      console.log(
        `ISO9141 initialized: KW1=0x${keyword1[0]?.toString(16)}, KW2=0x${keyword2[0]?.toString(16)}`,
      );

      this.initialized = true;
    } catch (error) {
      this.initialized = false;
      throw new Error(`ISO9141 initialization failed: ${error}`);
    }
  }

  /** Send data using 5-baud bit-banging */
  private async sendAt5Baud(byte: number): Promise<void> {
    // This would normally require hardware control of the serial line
    // For simulation purposes, we'll just delay appropriately
    const bitTime = 200; // 5 baud = 200ms per bit

    // Start bit (low)
    await this.delay(bitTime);

    // Data bits (LSB first)
    for (let i = 0; i < 8; i++) {
      const bit = (byte >> i) & 1;
      await this.delay(bitTime);
    }

    // Stop bit (high)
    await this.delay(bitTime);
  }

  /** Receive data with timeout */
  private async receiveWithTimeout(timeoutMs: number): Promise<Buffer> {
    try {
      // This is a simplified implementation
      // In real hardware, this would read from the serial port
      return Buffer.alloc(0);
    } catch (error) {
      return Buffer.alloc(0);
    }
  }

  /** Send KWP2000 frame over ISO9141 */
  async sendFrame(data: Buffer): Promise<void> {
    if (!this.initialized) {
      throw new Error("ISO9141 not initialized");
    }

    // Add checksum
    const checksum = this.calculateChecksum(data);
    const frame = Buffer.concat([data, Buffer.from([checksum])]);

    await this.transport.send(frame);
  }

  /** Receive KWP2000 frame over ISO9141 */
  async receiveFrame(timeoutMs?: number): Promise<Iso9141Frame> {
    if (!this.initialized) {
      throw new Error("ISO9141 not initialized");
    }

    const timeout = timeoutMs ?? this.config.responseTimeoutMs;
    const data = await this.transport.read(256, timeout); // Read up to 256 bytes

    if (data.length === 0) {
      throw new Error("No data received");
    }

    // Verify checksum
    if (data.length < 2) {
      throw new Error("Frame too short");
    }

    const frameData = data.subarray(0, data.length - 1);
    const receivedChecksum = data[data.length - 1];
    const calculatedChecksum = this.calculateChecksum(frameData);

    if (receivedChecksum !== calculatedChecksum) {
      throw new Error(
        `Checksum mismatch: expected 0x${calculatedChecksum.toString(16)}, got 0x${receivedChecksum!.toString(16)}`,
      );
    }

    return {
      data: frameData,
      isResponse: true,
      timestamp: Date.now(),
    };
  }

  /** Calculate ISO9141 checksum (XOR of all bytes) */
  private calculateChecksum(data: Buffer): number {
    let checksum = 0;
    for (const byte of data) {
      checksum ^= byte;
    }
    return checksum;
  }

  /** Check if protocol is initialized */
  isInitialized(): boolean {
    return this.initialized;
  }

  /** Reset the protocol state */
  reset(): void {
    this.initialized = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ─── ISO9141 Transport Adapter ───────────────────────────────────────────────

/**
 * ISO9141 transport adapter that wraps a serial transport
 * and adds ISO9141 protocol handling.
 */
export class Iso9141Transport extends AbstractTransport {
  private serialTransport: AbstractTransport;
  private protocol: Iso9141Protocol;

  constructor(serialTransport: AbstractTransport, config: Iso9141Config = {}) {
    super();
    this.serialTransport = serialTransport;
    this.protocol = new Iso9141Protocol(this.serialTransport, config);
  }

  get mode(): "serial" {
    return "serial";
  }

  get isConnected(): boolean {
    return this.serialTransport.isConnected && this.protocol.isInitialized();
  }

  async connect(): Promise<void> {
    await this.serialTransport.connect();
    await this.protocol.initialize();
    this._stats.connectedAt = new Date();
    this.emit({ type: "connected" });
  }

  async disconnect(): Promise<void> {
    this.protocol.reset();
    await this.serialTransport.disconnect();
  }

  async send(data: Buffer): Promise<void> {
    await this.protocol.sendFrame(data);
    this.trackSend(data.length);
  }

  async read(expectedBytes: number, timeoutMs?: number): Promise<Buffer> {
    const frame = await this.protocol.receiveFrame(timeoutMs);
    this.trackReceive(frame.data.length);

    if (frame.data.length < expectedBytes) {
      throw new Error(
        `Expected ${expectedBytes} bytes, got ${frame.data.length}`,
      );
    }

    return frame.data.subarray(0, expectedBytes);
  }

  /** Perform 5-baud initialization manually */
  async fiveBaudInit(ecuAddress?: number): Promise<void> {
    // This method is provided for compatibility with SerialTransport interface
    // The actual 5-baud init is handled in the protocol.initialize() method
    if (ecuAddress !== undefined) {
      this.protocol = new Iso9141Protocol(this.serialTransport, { ecuAddress });
    }
    await this.protocol.initialize();
  }
}
