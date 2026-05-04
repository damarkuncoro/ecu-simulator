 /**
  * @ecu/can - CAN Protocol (ISO 15765) Implementation
  * ISO 15765-2 (Network Layer) and ISO 15765-3 (Transport Layer)
  * Supports CAN diagnostics with segmentation, flow control, and addressing
  */

 import { Logger } from "@ecu/logger";

 // CAN implementation is standalone for now

// ─── CAN Frame Types (ISO 15765-2) ───────────────────────────────────────────

export interface CANFrame {
  id: number; // CAN identifier (11-bit or 29-bit)
  data: Buffer; // Data payload (0-8 bytes)
  isExtended: boolean; // Extended identifier flag
  timestamp?: number;
}

export interface CANMessage {
  sourceAddress: number;
  targetAddress: number;
  data: Buffer;
  type: "single" | "first" | "consecutive" | "flow";
}

// ─── Network Layer (ISO 15765-2) ────────────────────────────────────────────

export interface NetworkLayerConfig {
  /** ECU source address */
  sourceAddress: number;
  /** Tester target address */
  targetAddress: number;
  /** CAN identifier for ECU responses */
  ecuResponseId: number;
  /** CAN identifier for tester requests */
  testerRequestId: number;
  /** Maximum data length per frame */
  maxFrameData: number;
}

export class NetworkLayer {
    public config: NetworkLayerConfig;
    public logger: Logger;

    constructor(config: NetworkLayerConfig) {
      this.config = config;
      this.logger = Logger.child("NetworkLayer");
    }

  /** Encode CAN message into CAN frames */
  encodeMessage(message: CANMessage): CANFrame[] {
    const frames: CANFrame[] = [];

    if (message.data.length <= this.config.maxFrameData) {
      // Single Frame (SF)
      const frame = this.createSingleFrame(message);
      frames.push(frame);
    } else {
      // Multi-frame message (FF + CFs)
      const firstFrames = this.createFirstFrame(message);
      frames.push(...firstFrames);

      const consecutiveFrames = this.createConsecutiveFrames(message);
      frames.push(...consecutiveFrames);
    }

    return frames;
  }

  /** Decode CAN frames into CAN message */
  decodeFrames(frames: CANFrame[]): CANMessage | null {
    if (frames.length === 0) return null;

    const firstFrame = frames[0];
    if (!firstFrame) return null;

    // Check if it's a single frame
    const pci = firstFrame.data[0];
    if (!pci) return null;

    if ((pci & 0xf0) === 0x00) {
      // Single Frame
      return this.decodeSingleFrame(firstFrame);
    } else if ((pci & 0xf0) === 0x10) {
      // First Frame of multi-frame
      return this.decodeMultiFrame(frames);
    }

    return null;
  }

  private createSingleFrame(message: CANMessage): CANFrame {
    const length = message.data.length;
    const pci = length; // Single Frame PCI
    const data = Buffer.concat([Buffer.from([pci]), message.data]);

    return {
      id: this.config.testerRequestId,
      data,
      isExtended: false,
      timestamp: Date.now(),
    };
  }

  private createFirstFrame(message: CANMessage): CANFrame[] {
    const length = message.data.length;
    const pciHigh = 0x10 | ((length >> 8) & 0x0f); // First Frame PCI
    const pciLow = length & 0xff;

    // First frame data: PCI + up to 6 bytes of data
    const firstFrameData = Buffer.concat([
      Buffer.from([pciHigh, pciLow]),
      message.data.subarray(0, Math.min(6, message.data.length)),
    ]);

    const firstFrame: CANFrame = {
      id: this.config.testerRequestId,
      data: firstFrameData,
      isExtended: false,
      timestamp: Date.now(),
    };

    return [firstFrame];
  }

  private createConsecutiveFrames(message: CANMessage): CANFrame[] {
    const frames: CANFrame[] = [];
    const remainingData = message.data.subarray(6); // Skip first 6 bytes
    let sequenceNumber = 1;

    for (let i = 0; i < remainingData.length; i += 7) {
      const chunk = remainingData.subarray(i, i + 7);
      const pci = 0x20 | (sequenceNumber & 0x0f); // Consecutive Frame PCI

      const frameData = Buffer.concat([Buffer.from([pci]), chunk]);

      frames.push({
        id: this.config.testerRequestId,
        data: frameData,
        isExtended: false,
        timestamp: Date.now(),
      });

      sequenceNumber = (sequenceNumber + 1) & 0x0f;
    }

    return frames;
  }

  private decodeSingleFrame(frame: CANFrame): CANMessage {
    const data = frame.data.subarray(1); // Skip PCI byte

    return {
      sourceAddress: this.config.ecuResponseId,
      targetAddress: this.config.testerRequestId,
      data,
      type: "single",
    };
  }

  private decodeMultiFrame(frames: CANFrame[]): CANMessage | null {
    if (frames.length < 2) return null;

    const firstFrame = frames[0];
    if (!firstFrame || firstFrame.data.length < 2) return null;

    const pciHigh = firstFrame.data[0]!;
    const pciLow = firstFrame.data[1]!;
    const length = ((pciHigh & 0x0f) << 8) | pciLow;

    // Collect data from all frames
    const dataParts: Buffer[] = [];
    dataParts.push(firstFrame.data.subarray(2)); // First 6 bytes of data

    // Process consecutive frames
    for (let i = 1; i < frames.length; i++) {
      const frame = frames[i];
      if (!frame || frame.data.length === 0) continue;

      const pci = frame.data[0]!;
      if ((pci & 0xf0) !== 0x20) continue; // Not a consecutive frame

      dataParts.push(frame.data.subarray(1)); // Skip PCI byte
    }

    const fullData = Buffer.concat(dataParts);

    return {
      sourceAddress: this.config.ecuResponseId,
      targetAddress: this.config.testerRequestId,
      data: fullData.subarray(0, length),
      type: "first",
    };
  }
}

// ─── Transport Layer (ISO 15765-3) ──────────────────────────────────────────

export interface TransportLayerConfig extends NetworkLayerConfig {
  /** Block size for flow control */
  blockSize: number;
  /** Separation time minimum (STmin) in ms */
  stMin: number;
  /** Timeout for waiting (N_Bs) in ms */
  timeoutBs: number;
  /** Timeout for consecutive frames (N_Cr) in ms */
  timeoutCr: number;
}

export class TransportLayer {
  private networkLayer: NetworkLayer;
  private config: TransportLayerConfig;
  private messageBuffer: Map<number, CANFrame[]> = new Map();

  constructor(config: TransportLayerConfig) {
    this.config = config;
    this.networkLayer = new NetworkLayer(config);
  }

  /** Send diagnostic message with transport layer handling */
  async sendMessage(message: CANMessage): Promise<void> {
    const frames = this.networkLayer.encodeMessage(message);

    // Send frames with flow control handling
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      if (!frame) continue;

       // Send frame (in real implementation, this would use CAN bus)
        this.networkLayer.logger.debug(`Sending CAN frame: ID=0x${frame.id.toString(16)}, Data=${frame.data.toString("hex")}`);

      // Handle flow control for multi-frame messages
      if (i === 0 && frames.length > 1) {
        // Wait for Flow Control frame from receiver
        await this.waitForFlowControl();
      }

      // Respect STmin timing
      if (i > 0) {
        await this.delay(this.config.stMin);
      }
    }
  }

  /** Receive diagnostic message with transport layer reassembly */
  async receiveMessage(timeoutMs: number = 1000): Promise<CANMessage | null> {
    // In real implementation, this would listen for CAN frames
    // For simulation, return null
    return null;
  }

  /** Handle incoming CAN frame */
  handleIncomingFrame(frame: CANFrame): void {
    const messageId = frame.id;

    // Group frames by message ID
    if (!this.messageBuffer.has(messageId)) {
      this.messageBuffer.set(messageId, []);
    }

    const frames = this.messageBuffer.get(messageId);
    if (frames) {
      frames.push(frame);

      // Check if we have a complete message
      const message = this.networkLayer.decodeFrames(frames);
      if (message) {
        // Process complete message
        this.processCompleteMessage(message);
        // Clear buffer
        this.messageBuffer.delete(messageId);
      }
    }
  }

  private async waitForFlowControl(): Promise<void> {
    // In real implementation, wait for Flow Control frame
    // For simulation, just delay
    await this.delay(10);
  }

   private processCompleteMessage(message: CANMessage): void {
     this.logger.debug(`Received complete CAN message: ${message.data.length} bytes`);
     // In real implementation, pass to upper layers (UDS, etc.)
   }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ─── CAN Transport Adapter ──────────────────────────────────────────────────

 export class CANTransport {
   private transportLayer: TransportLayer;
   private logger: Logger;

   constructor(config: TransportLayerConfig) {
     this.transportLayer = new TransportLayer(config);
     this.logger = Logger.child("CANTransport");
   }

  get mode(): string {
    return "can";
  }

   async connect(): Promise<void> {
     // Initialize CAN bus connection
     this.logger.info("CAN transport connected");
   }

   async disconnect(): Promise<void> {
     // Close CAN bus connection
     this.logger.info("CAN transport disconnected");
   }

  async send(data: Buffer): Promise<void> {
    const message: CANMessage = {
      sourceAddress: 0x7e0, // Tester
      targetAddress: 0x7e8, // ECU
      data,
      type: "single",
    };

     await this.transportLayer.sendMessage(message);
     this.logger.debug(`CAN sent ${data.length} bytes`);
  }

  async read(expectedBytes: number, timeoutMs?: number): Promise<Buffer> {
    const message = await this.transportLayer.receiveMessage(timeoutMs);
    if (!message) {
      throw new Error("No CAN message received");
    }

    if (message.data.length < expectedBytes) {
      throw new Error(
        `Expected ${expectedBytes} bytes, got ${message.data.length}`,
      );
    }

    return message.data.subarray(0, expectedBytes);
  }
}

// ─── Default Export ──────────────────────────────────────────────────────────

export const PKG = "@ecu/can";
