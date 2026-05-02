/**
 * @ecu/iso9141 - Unit Tests
 * Tests for ISO9141 protocol implementation
 */

import { Iso9141Protocol, Iso9141Transport } from "../src/index";
import { AbstractTransport, TransportConfig } from "@ecu/transport-abstract";

// Mock transport for testing
class MockTransport extends AbstractTransport {
  private connected = false;
  private dataBuffer: Buffer[] = [];
  public sentData: Buffer[] = [];

  constructor() {
    super();
  }

  get mode(): "serial" {
    return "serial";
  }

  get isConnected(): boolean {
    return this.connected;
  }

  async connect(): Promise<void> {
    this.connected = true;
    this.emit({ type: "connected" });
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.emit({ type: "disconnected" });
  }

  async send(data: Buffer): Promise<void> {
    this.sentData.push(data);
    this.trackSend(data.length);
  }

  async read(expectedBytes: number, timeoutMs?: number): Promise<Buffer> {
    if (this.dataBuffer.length === 0) {
      return Buffer.alloc(0); // Return empty buffer when no data
    }
    const data = this.dataBuffer.shift()!;
    this.trackReceive(data.length);
    return data.subarray(0, Math.min(expectedBytes, data.length));
  }

  // Helper to queue data for reading
  queueData(data: Buffer): void {
    this.dataBuffer.push(data);
  }

  getStats() {
    return this._stats;
  }
}

describe("Iso9141Protocol", () => {
  let transport: MockTransport;
  let protocol: Iso9141Protocol;

  beforeEach(() => {
    transport = new MockTransport();
    protocol = new Iso9141Protocol(transport);
  });

  describe("constructor", () => {
    it("should create instance with default config", () => {
      expect(protocol).toBeInstanceOf(Iso9141Protocol);
    });

    it("should accept custom config", () => {
      const customProtocol = new Iso9141Protocol(transport, {
        ecuAddress: 0x55,
        testerAddress: 0xf2,
        baudRate: 9600,
      });
      expect(customProtocol).toBeInstanceOf(Iso9141Protocol);
    });
  });

  describe("isInitialized", () => {
    it("should return false before initialization", () => {
      expect(protocol.isInitialized()).toBe(false);
    });
  });

  describe("reset", () => {
    it("should reset initialized state", () => {
      protocol["initialized"] = true;
      protocol.reset();
      expect(protocol.isInitialized()).toBe(false);
    });
  });

  describe("sendFrame", () => {
    it("should throw when not initialized", async () => {
      const data = Buffer.from([0x22, 0x01, 0x02]);
      await expect(protocol.sendFrame(data)).rejects.toThrow(
        "ISO9141 not initialized",
      );
    });

    it("should send frame with checksum when initialized", async () => {
      // Initialize protocol
      protocol["initialized"] = true;

      const data = Buffer.from([0x22, 0x01, 0x02]);
      await protocol.sendFrame(data);

      expect(transport.sentData.length).toBe(1);
      const sentPacket = transport.sentData[0]!;
      expect(sentPacket.length).toBe(4); // data + checksum
      expect(sentPacket[3]).toBe(0x21); // checksum (XOR of 0x22 ^ 0x01 ^ 0x02)
    });
  });

  describe("receiveFrame", () => {
    it("should throw when not initialized", async () => {
      await expect(protocol.receiveFrame()).rejects.toThrow(
        "ISO9141 not initialized",
      );
    });

    it("should throw when no data received", async () => {
      protocol["initialized"] = true;
      await expect(protocol.receiveFrame()).rejects.toThrow("No data received");
    });

    it("should throw when frame too short", async () => {
      protocol["initialized"] = true;
      transport.queueData(Buffer.from([0x22])); // Only 1 byte

      await expect(protocol.receiveFrame()).rejects.toThrow("Frame too short");
    });

    it("should throw when checksum mismatch", async () => {
      protocol["initialized"] = true;
      // Data with invalid checksum
      transport.queueData(Buffer.from([0x22, 0x01, 0x02, 0xff]));

      await expect(protocol.receiveFrame()).rejects.toThrow(
        "Checksum mismatch",
      );
    });

    it("should successfully receive valid frame", async () => {
      protocol["initialized"] = true;
      const frameData = Buffer.from([0x22, 0x01, 0x02]);
      const checksum = 0x22 ^ 0x01 ^ 0x02;
      transport.queueData(Buffer.from([...frameData, checksum]));

      const frame = await protocol.receiveFrame();

      expect(frame.data.length).toBe(3);
      expect(frame.data[0]).toBe(0x22);
      expect(frame.isResponse).toBe(true);
      expect(typeof frame.timestamp).toBe("number");
    });
  });

  describe("calculateChecksum", () => {
    it("should calculate XOR checksum correctly", () => {
      const data = Buffer.from([0x22, 0x01, 0x02]);
      const checksum = protocol["calculateChecksum"](data);
      expect(checksum).toBe(0x21);
    });

    it("should return 0 for empty buffer", () => {
      const checksum = protocol["calculateChecksum"](Buffer.alloc(0));
      expect(checksum).toBe(0);
    });

    it("should handle single byte", () => {
      const checksum = protocol["calculateChecksum"](Buffer.from([0xaa]));
      expect(checksum).toBe(0xaa);
    });
  });
});

describe("Iso9141Transport", () => {
  let transport: Iso9141Transport;
  let mockSerial: MockTransport;

  beforeEach(() => {
    mockSerial = new MockTransport();
    transport = new Iso9141Transport(mockSerial);
  });

  describe("mode", () => {
    it("should return 'serial'", () => {
      expect(transport.mode).toBe("serial");
    });
  });

  describe("isConnected", () => {
    it("should return false initially", () => {
      expect(transport.isConnected).toBe(false);
    });
  });

  describe("connect", () => {
    it.skip("should connect successfully", async () => {
      // Full 5-baud init handshake requires stubbing receiveWithTimeout
      // Integration test deferred
    });
  });

  describe("disconnect", () => {
    it("should disconnect successfully", async () => {
      await transport.disconnect();
      expect(mockSerial.isConnected).toBe(false);
    });
  });

  describe("send", () => {
    it("should throw when not connected", async () => {
      const data = Buffer.from([0x22, 0x01]);
      await expect(transport.send(data)).rejects.toThrow();
    });
  });
});
