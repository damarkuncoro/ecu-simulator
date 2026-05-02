/**
 * @ecu/kwp2000 - Unit Tests
 * Comprehensive tests for KWP2000 protocol router
 */

import {
  Kwp2000Router,
  SERVICE_IDS,
  SESSION_TYPES,
  NRC,
  POSITIVE_RESPONSE_BASE,
  type Kwp2000Frame,
} from "../src/index";
import { DTCEngine, CONFIRMED_ACTIVE, PENDING_ONLY } from "@ecu/dtc-engine";

// Helper: build a KWP2000 frame (length + serviceId + data)
function frame(serviceId: number, data: Buffer): Kwp2000Frame {
  return {
    length: data.length + 1,
    serviceId,
    data,
  };
}

function rawFrame(serviceId: number, dataBytes: number[]): Buffer {
  return Buffer.concat([
    Buffer.from([dataBytes.length + 1]),
    Buffer.from([serviceId]),
    Buffer.from(dataBytes),
  ]);
}

describe("Kwp2000Router", () => {
  let router: Kwp2000Router;
  let dtcEngine: DTCEngine;

  beforeEach(() => {
    dtcEngine = new DTCEngine();
    router = new Kwp2000Router({
      dtcEngine,
      sessionTimeoutMs: 5000,
      p2TimeoutMs: 50,
      p3TimeoutMs: 5000,
    });
  });

  describe("parseFrame", () => {
    it("parses valid frame", () => {
      const f = router.parseFrame(rawFrame(0x22, [0x01, 0x02]));
      expect(f).not.toBeNull();
      expect(f!.serviceId).toBe(0x22);
      expect(f!.data).toEqual(Buffer.from([0x01, 0x02]));
    });

    it("rejects too short", () => {
      expect(router.parseFrame(rawFrame(0x22, []))).toBeNull();
    });

    it("rejects length mismatch", () => {
      expect(router.parseFrame(Buffer.from([0x05, 0x22, 0x01]))).toBeNull();
    });
  });

  describe("Diagnostic Session Control (0x10)", () => {
    it("accepts default session", () => {
      const response = router.processRequest(frame(0x10, Buffer.from([0x01])));
      expect(response.isPositive).toBe(true);
      expect(response.serviceId).toBe(0x50);
      expect(router.getCurrentSession()).toBe(SESSION_TYPES.DEFAULT);
    });

    it("accepts extended session", () => {
      const response = router.processRequest(frame(0x10, Buffer.from([0x03])));
      expect(response.isPositive).toBe(true);
      expect(router.getCurrentSession()).toBe(
        SESSION_TYPES.EXTENDED_DIAGNOSTIC,
      );
    });

    it("accepts programming session", () => {
      const response = router.processRequest(frame(0x10, Buffer.from([0x02])));
      expect(response.isPositive).toBe(true);
      expect(router.getCurrentSession()).toBe(SESSION_TYPES.PROGRAMMING);
    });

    it("rejects invalid session type", () => {
      const response = router.processRequest(frame(0x10, Buffer.from([0xff])));
      expect(response.isPositive).toBe(false);
      expect(response.serviceId).toBe(0x7f);
      expect(response.data[1]).toBe(NRC.SUB_FUNCTION_NOT_SUPPORTED);
    });

    it("rejects with no data", () => {
      const response = router.processRequest(frame(0x10, Buffer.alloc(0)));
      expect(response.isPositive).toBe(false);
      expect(response.data[1]).toBe(
        NRC.INCORRECT_MESSAGE_LENGTH_OR_INVALID_FORMAT,
      );
    });
  });

  describe("ECU Reset (0x11)", () => {
    it("accepts hard reset", () => {
      const response = router.processRequest(frame(0x11, Buffer.from([0x01])));
      expect(response.isPositive).toBe(true);
      expect(response.serviceId).toBe(0x51);
      expect(response.data[0]).toBe(0x01);
    });

    it("accepts all valid types", () => {
      for (let t = 1; t <= 5; t++) {
        const r = router.processRequest(frame(0x11, Buffer.from([t])));
        expect(r.isPositive).toBe(true);
      }
    });

    it("rejects invalid type", () => {
      const r = router.processRequest(frame(0x11, Buffer.from([0x00])));
      expect(r.isPositive).toBe(false);
      expect(r.data[1]).toBe(NRC.REQUEST_OUT_OF_RANGE);
    });
  });

  describe("Clear Diagnostic Information (0x14)", () => {
    it("clears all DTCs", () => {
      dtcEngine.set(0x123456, CONFIRMED_ACTIVE);
      dtcEngine.set(0x654321, PENDING_ONLY);
      expect(dtcEngine.getByStatusMask(0xff).length).toBe(2);

      const response = router.processRequest(frame(0x14, Buffer.alloc(0)));
      expect(response.isPositive).toBe(true);
      expect(dtcEngine.getByStatusMask(0xff).length).toBe(0);
    });
  });

  describe("Read DTC Information (0x19)", () => {
    it("returns DTC list", () => {
      dtcEngine.set(0x123456, CONFIRMED_ACTIVE);
      const response = router.processRequest(
        frame(0x19, Buffer.from([0x02, 0xff])),
      );
      expect(response.isPositive).toBe(true);
      expect(response.data.length).toBeGreaterThan(2);
    });

    it("returns empty when none", () => {
      const response = router.processRequest(
        frame(0x19, Buffer.from([0x02, 0xff])),
      );
      expect(response.isPositive).toBe(true);
      expect(response.data[2]).toBe(0);
    });

    it("rejects insufficient data", () => {
      const response = router.processRequest(frame(0x19, Buffer.from([0x02])));
      expect(response.isPositive).toBe(false);
      expect(response.data[1]).toBe(
        NRC.INCORRECT_MESSAGE_LENGTH_OR_INVALID_FORMAT,
      );
    });
  });

  describe("Read Data By Identifier (0x22)", () => {
    it("returns RPM for DID 0x0C00", () => {
      const response = router.processRequest(
        frame(0x22, Buffer.from([0x0c, 0x00])),
      );
      expect(response.isPositive).toBe(true);
      expect(response.serviceId).toBe(0x62);
      expect(response.data[0]).toBe(0x0c);
      expect(response.data[1]).toBe(0x00);
      expect(response.data.length).toBe(4);
    });

    it("rejects unknown DID", () => {
      const response = router.processRequest(
        frame(0x22, Buffer.from([0x00, 0x00])),
      );
      expect(response.isPositive).toBe(false);
      expect(response.data[1]).toBe(NRC.REQUEST_OUT_OF_RANGE);
    });
  });

  describe("Security Access (0x27)", () => {
    it("generates seed for level 1", () => {
      const response = router.processRequest(frame(0x27, Buffer.from([0x01])));
      expect(response.isPositive).toBe(true);
      expect(response.serviceId).toBe(0x67);
      expect(response.data.length).toBe(5);
    });

    it("accepts correct key", () => {
      const seedResp = router.processRequest(frame(0x27, Buffer.from([0x01])));
      const seed =
        (seedResp.data[1]! << 24) |
        (seedResp.data[2]! << 16) |
        (seedResp.data[3]! << 8) |
        seedResp.data[4]!;
      const keyResp = router.processRequest(
        frame(
          0x27,
          Buffer.from([
            0x02,
            (seed >> 24) & 0xff,
            (seed >> 16) & 0xff,
            (seed >> 8) & 0xff,
            seed & 0xff,
          ]),
        ),
      );
      expect(keyResp.isPositive).toBe(true);
    });

    it("rejects wrong key", () => {
      router.processRequest(frame(0x27, Buffer.from([0x01])));
      const keyResp = router.processRequest(
        frame(0x27, Buffer.from([0x02, 0x00, 0x00, 0x00, 0x00])),
      );
      expect(keyResp.isPositive).toBe(false);
      expect(keyResp.data[1]).toBe(NRC.INVALID_KEY);
    });

    it("rejects in default session", () => {
      const response = router.processRequest(frame(0x27, Buffer.from([0x01])));
      expect(response.isPositive).toBe(false);
      expect(response.data[1]).toBe(
        NRC.SERVICE_NOT_SUPPORTED_IN_ACTIVE_SESSION,
      );
    });
  });

  describe("Tester Present (0x3E)", () => {
    it("responds positively", () => {
      const response = router.processRequest(frame(0x3e, Buffer.from([0x00])));
      expect(response.isPositive).toBe(true);
      expect(response.serviceId).toBe(0x7e);
    });
  });

  describe("Negative Responses", () => {
    it("returns 0x7F for unknown service", () => {
      const response = router.processRequest(frame(0xff, Buffer.alloc(0)));
      expect(response.serviceId).toBe(0x7f);
      expect(response.data[1]).toBe(NRC.SERVICE_NOT_SUPPORTED);
    });
  });

  describe("State & Timing", () => {
    it("tracks session active state", () => {
      expect(router.isSessionActive()).toBe(false);
      router.processRequest(frame(0x10, Buffer.from([0x03])));
      expect(router.isSessionActive()).toBe(true);
    });

    it("detects tester present timeout", () => {
      router.processRequest(frame(0x10, Buffer.from([0x03])));
      router["lastActivityTime"] = Date.now() - 6000;
      expect(router.isTesterPresentRequired()).toBe(true);
    });
  });

  describe("Full Diagnostic Flow", () => {
    it("completes full session: 0x10 → 0x27 → 0x19 → 0x14", () => {
      // Extended session
      let r = router.processRequest(frame(0x10, Buffer.from([0x03])));
      expect(r.isPositive).toBe(true);

      // Seed
      r = router.processRequest(frame(0x27, Buffer.from([0x01])));
      expect(r.isPositive).toBe(true);
      const seed =
        (r.data[1]! << 24) |
        (r.data[2]! << 16) |
        (r.data[3]! << 8) |
        r.data[4]!;

      // Key
      r = router.processRequest(
        frame(
          0x27,
          Buffer.from([
            0x02,
            (seed >> 24) & 0xff,
            (seed >> 16) & 0xff,
            (seed >> 8) & 0xff,
            seed & 0xff,
          ]),
        ),
      );
      expect(r.isPositive).toBe(true);

      // Read DTC
      dtcEngine.set(0x0103, CONFIRMED_ACTIVE);
      r = router.processRequest(frame(0x19, Buffer.from([0x02, 0xff])));
      expect(r.isPositive).toBe(true);

      // Clear DTC
      r = router.processRequest(frame(0x14, Buffer.alloc(0)));
      expect(r.isPositive).toBe(true);
    });
  });

  describe("Response Formatting", () => {
    it("formats positive response with length", () => {
      const f = router.formatResponse({
        serviceId: 0x22,
        data: Buffer.from([1, 2, 3]),
        isPositive: true,
      });
      expect(f[0]).toBe(5);
      expect(f[1]).toBe(0x62);
      expect(f.slice(2)).toEqual(Buffer.from([1, 2, 3]));
    });

    it("formats negative response", () => {
      const f = router.formatResponse({
        serviceId: 0x22,
        data: Buffer.from([0x31]),
        isPositive: false,
      });
      expect(f[0]).toBe(0x7f);
      expect(f[2]).toBe(0x31);
    });
  });
});

describe("KWP2000 Constants", () => {
  it("has correct service IDs", () => {
    expect(SERVICE_IDS.DIAGNOSTIC_SESSION_CONTROL).toBe(0x10);
    expect(SERVICE_IDS.ECU_RESET).toBe(0x11);
    expect(SERVICE_IDS.CLEAR_DIAGNOSTIC_INFORMATION).toBe(0x14);
    expect(SERVICE_IDS.READ_DIAGNOSTIC_TROUBLE_CODES).toBe(0x19);
    expect(SERVICE_IDS.READ_DATA_BY_IDENTIFIER).toBe(0x22);
    expect(SERVICE_IDS.SECURITY_ACCESS).toBe(0x27);
    expect(SERVICE_IDS.TESTER_PRESENT).toBe(0x3e);
  });

  it("has correct session types", () => {
    expect(SESSION_TYPES.DEFAULT).toBe(0x01);
    expect(SESSION_TYPES.PROGRAMMING).toBe(0x02);
    expect(SESSION_TYPES.EXTENDED_DIAGNOSTIC).toBe(0x03);
    expect(SESSION_TYPES.SAFETY_SYSTEM_DIAGNOSTIC).toBe(0x04);
  });

  it("has required NRC codes", () => {
    expect(NRC.GENERAL_REJECT).toBe(0x10);
    expect(NRC.SERVICE_NOT_SUPPORTED).toBe(0x11);
    expect(NRC.SUB_FUNCTION_NOT_SUPPORTED).toBe(0x12);
    expect(NRC.INCORRECT_MESSAGE_LENGTH_OR_INVALID_FORMAT).toBe(0x13);
    expect(NRC.REQUEST_OUT_OF_RANGE).toBe(0x31);
    expect(NRC.SECURITY_ACCESS_DENIED).toBe(0x33);
    expect(NRC.INVALID_KEY).toBe(0x35);
    expect(NRC.SERVICE_NOT_SUPPORTED_IN_ACTIVE_SESSION).toBe(0x7f);
  });

  it("has positive response base", () => {
    expect(POSITIVE_RESPONSE_BASE).toBe(0x40);
  });
});
