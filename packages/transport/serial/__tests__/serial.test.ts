import { SerialTransport } from "../src";

jest.mock("serialport", () => {
  const EventEmitter = require("events");
  const mockPort = Object.create(new EventEmitter());
  mockPort.isOpen = false;
  mockPort.write = jest.fn((data, cb) => cb?.(null));
  mockPort.drain = jest.fn((cb) => cb?.(null));
  mockPort.open = jest.fn((cb) => {
    mockPort.isOpen = true;
    cb?.(null);
  });
  mockPort.close = jest.fn((cb) => {
    mockPort.isOpen = false;
    cb?.(null);
  });
  return {
    SerialPort: jest.fn(() => mockPort),
  };
});

describe("SerialTransport", () => {
  const config = {
    path: "/dev/ttyUSB0",
    baudRate: 10400,
    connectTimeoutMs: 5000,
    readTimeoutMs: 2000,
  };

  describe("mode", () => {
    it("should return 'serial'", () => {
      const transport = new SerialTransport(config);
      expect(transport.mode).toBe("serial");
    });
  });

  describe("isConnected", () => {
    it("should return false initially", () => {
      const transport = new SerialTransport(config);
      expect(transport.isConnected).toBe(false);
    });
  });

  describe("connect", () => {
    it("should connect successfully", async () => {
      const transport = new SerialTransport(config);
      await transport.connect();
      expect(transport.isConnected).toBe(true);
    });
  });

  describe("send", () => {
    it("should throw when not connected", async () => {
      const transport = new SerialTransport(config);
      await expect(transport.send(Buffer.from([0x01]))).rejects.toThrow(
        "not connected",
      );
    });
  });

  describe("disconnect", () => {
    it("should disconnect successfully", async () => {
      const transport = new SerialTransport(config);
      await transport.connect();
      await transport.disconnect();
      expect(transport.isConnected).toBe(false);
    });
  });
});
