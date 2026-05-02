/**
 * @ecu/uds - Unit Tests
 * Tests for UDS (ISO 14229) protocol implementation
 */

import { UdsRouter, UDS_SERVICES, UDS_SESSIONS, UDS_NRC } from "../src/index";
import { DTCEngine, CONFIRMED_ACTIVE } from "@ecu/dtc-engine";
import { didRegistry } from "@ecu/did-registry";
import { securityEngine } from "@ecu/security-engine";
import { timingEngine } from "@ecu/timing-engine";

describe("UdsRouter", () => {
  let router: UdsRouter;
  let dtcEngine: DTCEngine;

  // Use a standard, writable DID for tests (0x0100 = Idle Speed Setpoint)
  const TEST_DID = 0x0100;
  const TEST_DID_VALUE = Buffer.from([0x03, 0xe8]); // 1000 RPM

  beforeEach(() => {
    // Reset all singletons
    dtcEngine = new DTCEngine();
    didRegistry.clearAll();
    securityEngine.lockAll();

    // Register test DID
    didRegistry.setValue(TEST_DID, TEST_DID_VALUE);

    router = new UdsRouter({
      dtcEngine,
      sessionTimeoutMs: 5000,
      p2TimeoutMs: 50,
      p2StarTimeoutMs: 5000,
      s3TimeoutMs: 5000,
    });
  });

  describe("processRequest - Diagnostic Session Control (0x10)", () => {
    it("should accept valid session types", () => {
      const request = {
        serviceId: UDS_SERVICES.DIAGNOSTIC_SESSION_CONTROL,
        data: Buffer.from([UDS_SESSIONS.EXTENDED_DIAGNOSTIC]),
        timestamp: Date.now(),
      };

      const response = router.processRequest(request);

      expect(response.isPositive).toBe(true);
      expect(response.serviceId).toBe(UDS_SERVICES.DIAGNOSTIC_SESSION_CONTROL);
      expect(response.data[0]).toBe(UDS_SESSIONS.EXTENDED_DIAGNOSTIC);
    });

    it("should reject invalid session type", () => {
      const request = {
        serviceId: UDS_SERVICES.DIAGNOSTIC_SESSION_CONTROL,
        data: Buffer.from([0xff]), // Invalid session
        timestamp: Date.now(),
      };

      const response = router.processRequest(request);

      expect(response.isPositive).toBe(false);
      expect(response.serviceId).toBe(0x7f); // Negative response
      expect(response.responseCode).toBe(UDS_NRC.SUB_FUNCTION_NOT_SUPPORTED);
    });

    it("should reject insufficient data", () => {
      const request = {
        serviceId: UDS_SERVICES.DIAGNOSTIC_SESSION_CONTROL,
        data: Buffer.alloc(0),
        timestamp: Date.now(),
      };

      const response = router.processRequest(request);

      expect(response.isPositive).toBe(false);
      expect(response.responseCode).toBe(
        UDS_NRC.INCORRECT_MESSAGE_LENGTH_OR_INVALID_FORMAT,
      );
    });
  });

  describe("processRequest - ECU Reset (0x11)", () => {
    it("should accept valid reset types", () => {
      const request = {
        serviceId: UDS_SERVICES.ECU_RESET,
        data: Buffer.from([0x01]), // Hard reset
        timestamp: Date.now(),
      };

      const response = router.processRequest(request);

      expect(response.isPositive).toBe(true);
      expect(response.data[0]).toBe(0x01);
    });

    it("should reject invalid reset type", () => {
      const request = {
        serviceId: UDS_SERVICES.ECU_RESET,
        data: Buffer.from([0xff]),
        timestamp: Date.now(),
      };

      const response = router.processRequest(request);

      expect(response.isPositive).toBe(false);
      expect(response.responseCode).toBe(UDS_NRC.REQUEST_OUT_OF_RANGE);
    });
  });

  describe("processRequest - Security Access (0x27)", () => {
    it("should request seed when sub-function is odd", () => {
      // Need to be in non-default session for security access
      router["currentSession"] = UDS_SESSIONS.EXTENDED_DIAGNOSTIC;

      const request = {
        serviceId: UDS_SERVICES.SECURITY_ACCESS,
        data: Buffer.from([0x01]), // Request seed for level 1
        timestamp: Date.now(),
      };

      const response = router.processRequest(request);

      expect(response.isPositive).toBe(true);
      expect(response.serviceId).toBe(UDS_SERVICES.SECURITY_ACCESS);
      expect(response.data[0]).toBe(0x01); // Sub-function echoed
      expect(response.data.length).toBeGreaterThan(1); // Should include seed
    });

    it("should reject in default session", () => {
      router["currentSession"] = UDS_SESSIONS.DEFAULT;

      const request = {
        serviceId: UDS_SERVICES.SECURITY_ACCESS,
        data: Buffer.from([0x01]),
        timestamp: Date.now(),
      };

      const response = router.processRequest(request);

      expect(response.isPositive).toBe(false);
      expect(response.responseCode).toBe(
        UDS_NRC.SERVICE_NOT_SUPPORTED_IN_ACTIVE_SESSION,
      );
    });
  });

  describe("processRequest - Tester Present (0x3E)", () => {
    it("should respond positively", () => {
      const request = {
        serviceId: UDS_SERVICES.TESTER_PRESENT,
        data: Buffer.from([0x00]),
        timestamp: Date.now(),
      };

      const response = router.processRequest(request);

      expect(response.isPositive).toBe(true);
      expect(response.data[0]).toBe(0x00);
    });
  });

  describe("processRequest - Read Data By Identifier (0x22)", () => {
    it("should read existing DID", () => {
      const request = {
        serviceId: UDS_SERVICES.READ_DATA_BY_IDENTIFIER,
        data: Buffer.from([0x01, 0x00]), // 0x0100
        timestamp: Date.now(),
      };

      const response = router.processRequest(request);

      expect(response.isPositive).toBe(true);
      expect(response.data[0]).toBe(0x01);
      expect(response.data[1]).toBe(0x00);
      expect(response.data[2]).toBe(0x03); // First byte of value
      expect(response.data[3]).toBe(0xe8); // Second byte of value
    });

    it("should reject non-existent DID", () => {
      const request = {
        serviceId: UDS_SERVICES.READ_DATA_BY_IDENTIFIER,
        data: Buffer.from([0x00, 0x00]),
        timestamp: Date.now(),
      };

      const response = router.processRequest(request);

      expect(response.isPositive).toBe(false);
      expect(response.responseCode).toBe(UDS_NRC.REQUEST_OUT_OF_RANGE);
    });
  });

  describe("processRequest - Write Data By Identifier (0x2E)", () => {
    it("should write DID when security unlocked", () => {
      // Unlock security level 1
      securityEngine.unlockLevel(1);

      const newValue = Buffer.from([0x07, 0xd0]); // 2000 RPM
      const request = {
        serviceId: UDS_SERVICES.WRITE_DATA_BY_IDENTIFIER,
        data: Buffer.concat([Buffer.from([0x01, 0x00]), newValue]),
        timestamp: Date.now(),
      };

      const response = router.processRequest(request);

      expect(response.isPositive).toBe(true);
      expect(response.data[0]).toBe(0x01);
      expect(response.data[1]).toBe(0x00);

      // Verify the value was updated
      const stored = didRegistry.getValue(TEST_DID);
      expect(stored).not.toBeUndefined();
      expect(stored!.data).toEqual(newValue);
    });

    it("should reject when not security unlocked", () => {
      // Ensure security is locked
      securityEngine.lockAll();

      const newValue = Buffer.from([0x07, 0xd0]);
      const request = {
        serviceId: UDS_SERVICES.WRITE_DATA_BY_IDENTIFIER,
        data: Buffer.concat([Buffer.from([0x01, 0x00]), newValue]),
        timestamp: Date.now(),
      };

      const response = router.processRequest(request);

      expect(response.isPositive).toBe(false);
      expect(response.responseCode).toBe(UDS_NRC.SECURITY_ACCESS_DENIED);
    });
  });

  describe("processRequest - Clear Diagnostic Information (0x14)", () => {
    it("should clear all DTCs", () => {
      // Add a DTC first
      dtcEngine.set(0x123456, CONFIRMED_ACTIVE);
      expect(dtcEngine.getByStatusMask(0xff).length).toBeGreaterThan(0);

      const request = {
        serviceId: UDS_SERVICES.CLEAR_DIAGNOSTIC_INFORMATION,
        data: Buffer.alloc(0),
        timestamp: Date.now(),
      };

      const response = router.processRequest(request);

      expect(response.isPositive).toBe(true);
      expect(dtcEngine.getByStatusMask(0xff).length).toBe(0);
    });
  });

  describe("processRequest - Read DTC Information (0x19)", () => {
    it("should return DTC data", () => {
      dtcEngine.set(0x123456, CONFIRMED_ACTIVE);

      const request = {
        serviceId: UDS_SERVICES.READ_DTC_INFORMATION,
        data: Buffer.from([0x02, 0xff]), // Sub-function 0x02, status mask 0xFF
        timestamp: Date.now(),
      };

      const response = router.processRequest(request);

      expect(response.isPositive).toBe(true);
      expect(response.data.length).toBeGreaterThan(1);
    });
  });

  describe("processRequest - Unsupported service", () => {
    it("should return negative response", () => {
      const request = {
        serviceId: 0xff, // Unknown service
        data: Buffer.alloc(0),
        timestamp: Date.now(),
      };

      const response = router.processRequest(request);

      expect(response.isPositive).toBe(false);
      expect(response.serviceId).toBe(0x7f);
      expect(response.responseCode).toBe(UDS_NRC.SERVICE_NOT_SUPPORTED);
    });
  });
});

describe("UDS Constants", () => {
  it("should have all required service constants", () => {
    expect(UDS_SERVICES.DIAGNOSTIC_SESSION_CONTROL).toBe(0x10);
    expect(UDS_SERVICES.ECU_RESET).toBe(0x11);
    expect(UDS_SERVICES.SECURITY_ACCESS).toBe(0x27);
    expect(UDS_SERVICES.TESTER_PRESENT).toBe(0x3e);
    expect(UDS_SERVICES.READ_DATA_BY_IDENTIFIER).toBe(0x22);
    expect(UDS_SERVICES.WRITE_DATA_BY_IDENTIFIER).toBe(0x2e);
    expect(UDS_SERVICES.CLEAR_DIAGNOSTIC_INFORMATION).toBe(0x14);
  });

  it("should have all required session types", () => {
    expect(UDS_SESSIONS.DEFAULT).toBe(0x01);
    expect(UDS_SESSIONS.PROGRAMMING).toBe(0x02);
    expect(UDS_SESSIONS.EXTENDED_DIAGNOSTIC).toBe(0x03);
    expect(UDS_SESSIONS.SAFETY_SYSTEM_DIAGNOSTIC).toBe(0x04);
  });

  it("should have all required NRC codes", () => {
    expect(UDS_NRC.POSITIVE_RESPONSE).toBe(0x00);
    expect(UDS_NRC.GENERAL_REJECT).toBe(0x10);
    expect(UDS_NRC.SERVICE_NOT_SUPPORTED).toBe(0x11);
    expect(UDS_NRC.SECURITY_ACCESS_DENIED).toBe(0x33);
  });
});
