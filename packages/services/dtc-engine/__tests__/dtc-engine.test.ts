import {
  DTCEngine,
  encodeStatusByte,
  decodeStatusByte,
  CONFIRMED_ACTIVE,
  PENDING_ONLY,
} from "../src";

describe("DTC Engine", () => {
  let engine: DTCEngine;

  beforeEach(() => {
    engine = new DTCEngine();
  });

  describe("encodeStatusByte", () => {
    it("should encode all status bits correctly", () => {
      expect(encodeStatusByte(CONFIRMED_ACTIVE)).toBe(0xaf);
      expect(encodeStatusByte(PENDING_ONLY)).toBe(0x04);
    });

    it("should encode individual status bits", () => {
      const status = {
        testFailed: true,
        testFailedThisMonitoringCycle: false,
        pendingDTC: false,
        confirmedDTC: false,
        testNotCompletedSinceLastClear: false,
        testFailedSinceLastClear: false,
        testNotCompletedThisMonitoringCycle: false,
        warningIndicatorRequested: false,
      };
      expect(encodeStatusByte(status)).toBe(0x01);
    });
  });

  describe("decodeStatusByte", () => {
    it("should decode CONFIRMED_ACTIVE correctly", () => {
      const decoded = decodeStatusByte(0xff);
      expect(decoded.testFailed).toBe(true);
      expect(decoded.confirmedDTC).toBe(true);
      expect(decoded.warningIndicatorRequested).toBe(true);
    });

    it("should decode PENDING_ONLY correctly", () => {
      const decoded = decodeStatusByte(0x04);
      expect(decoded.pendingDTC).toBe(true);
      expect(decoded.confirmedDTC).toBe(false);
    });

    it("should decode zero byte correctly", () => {
      const decoded = decodeStatusByte(0x00);
      expect(decoded.testFailed).toBe(false);
      expect(decoded.pendingDTC).toBe(false);
    });
  });

  describe("set", () => {
    it("should add a DTC", () => {
      engine.set(0x0300, CONFIRMED_ACTIVE, "Random misfire");
      const all = engine.getAll();
      expect(all).toHaveLength(1);
      const dtc = all[0]!;
      expect(dtc.code).toBe(0x0300);
      expect(dtc.category).toBe("powertrain");
      expect(dtc.description).toBe("Random misfire");
    });

    it("should increment occurrence count", () => {
      engine.set(0x0300, CONFIRMED_ACTIVE);
      engine.set(0x0300, CONFIRMED_ACTIVE);
      const all = engine.getAll();
      expect(all[0]!.occurrenceCount).toBe(2);
    });

    it("should preserve firstSeen on update", () => {
      engine.set(0x0300, CONFIRMED_ACTIVE);
      const oldDTC = engine.getAll()[0]!;

      // Wait and update
      engine.set(0x0300, PENDING_ONLY);
      const updated = engine.getAll()[0]!;

      expect(updated.firstSeen.getTime()).toBe(oldDTC.firstSeen.getTime());
    });
  });

  describe("clear", () => {
    it("should clear all DTCs when no code provided", () => {
      engine.set(0x0300, CONFIRMED_ACTIVE);
      engine.set(0x0400, PENDING_ONLY);
      engine.clear();
      expect(engine.getAll()).toHaveLength(0);
    });

    it("should clear specific DTC when code provided", () => {
      engine.set(0x0300, CONFIRMED_ACTIVE);
      engine.set(0x0400, PENDING_ONLY);
      engine.clear(0x0300);
      const all = engine.getAll();
      expect(all).toHaveLength(1);
      expect(all[0]!.code).toBe(0x0400);
    });
  });

  describe("getByStatusMask", () => {
    it("should filter by status mask", () => {
      engine.set(0x0300, CONFIRMED_ACTIVE);
      engine.set(0x0400, PENDING_ONLY);

      const confirmed = engine.getByStatusMask(0x08);
      expect(confirmed).toHaveLength(1);
      expect(confirmed[0]!.code).toBe(0x0300);
    });
  });

  describe("toKwp2000Payload", () => {
    it("should generate correct KWP2000 payload", () => {
      engine.set(0x0300, CONFIRMED_ACTIVE);
      const payload = engine.toKwp2000Payload();
      expect(payload).toBeInstanceOf(Buffer);
      expect(payload.length).toBe(3);
      expect(payload[0]).toBe(0x03);
      expect(payload[1]).toBe(0x00);
      expect(payload[2]).toBe(0xaf);
    });

    it("should return empty buffer when no DTCs match", () => {
      const payload = engine.toKwp2000Payload(0x08);
      expect(payload.length).toBe(0);
    });
  });

  describe("detectCategory", () => {
    it("should detect powertrain DTCs (0x00-0x3F)", () => {
      engine.set(0x0300, CONFIRMED_ACTIVE);
      expect(engine.getAll()[0]!.category).toBe("powertrain");
    });

    it("should detect chassis DTCs (0x40-0x7F)", () => {
      engine.set(0x4300, CONFIRMED_ACTIVE);
      expect(engine.getAll()[0]!.category).toBe("chassis");
    });

    it("should detect body DTCs (0x80-0xBF)", () => {
      engine.set(0x8300, CONFIRMED_ACTIVE);
      expect(engine.getAll()[0]!.category).toBe("body");
    });

    it("should detect network DTCs (0xC0-0xFF)", () => {
      engine.set(0xc300, CONFIRMED_ACTIVE);
      expect(engine.getAll()[0]!.category).toBe("network");
    });
  });
});
