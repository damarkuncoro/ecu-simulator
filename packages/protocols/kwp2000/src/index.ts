/**
 * @ecu/kwp2000
 * KWP2000 (ISO 14230) protocol implementation.
 * Handles diagnostic service routing and response formatting.
 */

import { DTCEngine } from "@ecu/dtc-engine";
 import {
   DEFAULT_SESSION_TIMEOUT_MS,
   DEFAULT_P2_TIMEOUT_MS,
   DEFAULT_P3_TIMEOUT_MS,
 } from "@ecu/protocol-constants";
 import { Logger } from "@ecu/logger";

// ─── KWP2000 Frame Types ────────────────────────────────────────────────────────

export interface Kwp2000Frame {
  length: number;
  serviceId: number;
  data: Buffer;
}

export interface Kwp2000Response {
  serviceId: number;
  data: Buffer;
  isPositive: boolean;
}

// ─── Service IDs ───────────────────────────────────────────────────────────────

export const SERVICE_IDS = {
  DIAGNOSTIC_SESSION_CONTROL: 0x10,
  ECU_RESET: 0x11,
  CLEAR_DIAGNOSTIC_INFORMATION: 0x14,
  READ_DIAGNOSTIC_TROUBLE_CODES: 0x19,
  READ_DATA_BY_IDENTIFIER: 0x22,
  SECURITY_ACCESS: 0x27,
  TESTER_PRESENT: 0x3e,
} as const;

export const POSITIVE_RESPONSE_BASE = 0x40;

// ─── Session Types ─────────────────────────────────────────────────────────────

export const SESSION_TYPES = {
  DEFAULT: 0x01,
  PROGRAMMING: 0x02,
  EXTENDED_DIAGNOSTIC: 0x03,
  SAFETY_SYSTEM_DIAGNOSTIC: 0x04,
} as const;

export type SessionType = (typeof SESSION_TYPES)[keyof typeof SESSION_TYPES];

// ─── Security Access Levels ────────────────────────────────────────────────────

export const SECURITY_LEVELS = {
  REQUEST_SEED_LEVEL_1: 0x01,
  SEND_KEY_LEVEL_1: 0x02,
  REQUEST_SEED_LEVEL_2: 0x03,
  SEND_KEY_LEVEL_2: 0x04,
} as const;

// ─── Negative Response Codes ───────────────────────────────────────────────────

export const NRC = {
  GENERAL_REJECT: 0x10,
  SERVICE_NOT_SUPPORTED: 0x11,
  SUB_FUNCTION_NOT_SUPPORTED: 0x12,
  INCORRECT_MESSAGE_LENGTH_OR_INVALID_FORMAT: 0x13,
  RESPONSE_TOO_LONG: 0x14,
  BUSY_REPEAT_REQUEST: 0x21,
  CONDITIONS_NOT_CORRECT: 0x22,
  REQUEST_SEQUENCE_ERROR: 0x24,
  REQUEST_OUT_OF_RANGE: 0x31,
  SECURITY_ACCESS_DENIED: 0x33,
  INVALID_KEY: 0x35,
  EXCEEDED_NUMBER_OF_ATTEMPTS: 0x36,
  REQUIRED_TIME_DELAY_NOT_EXPIRED: 0x37,
  UPLOAD_DOWNLOAD_NOT_ACCEPTED: 0x70,
  TRANSFER_DATA_SUSPENDED: 0x71,
  GENERAL_PROGRAMMING_FAILURE: 0x72,
  WRONG_BLOCK_SEQUENCE_COUNTER: 0x73,
  REQUEST_CORRECTLY_RECEIVED_RESPONSE_PENDING: 0x78,
  SUB_FUNCTION_NOT_SUPPORTED_IN_ACTIVE_SESSION: 0x7e,
  SERVICE_NOT_SUPPORTED_IN_ACTIVE_SESSION: 0x7f,
} as const;

// ─── KWP2000 Router ────────────────────────────────────────────────────────────

export interface Kwp2000RouterConfig {
  dtcEngine: DTCEngine;
  sessionTimeoutMs: number;
  p2TimeoutMs: number;
  p3TimeoutMs: number;
}

/**
 * Service handler function type
 */
type ServiceHandlerFn = (frame: Kwp2000Frame) => Kwp2000Response;

 export class Kwp2000Router {
   private dtcEngine: DTCEngine;
   private currentSession: SessionType = SESSION_TYPES.DEFAULT;
   private sessionStartTime: number = 0;
   private lastActivityTime: number = 0;
   private securitySeed: number = 0;
   private testerPresentActive: boolean = false;
   private logger: Logger;

   // Timing parameters
  private readonly sessionTimeoutMs: number;
  private readonly p2TimeoutMs: number;
  private readonly p3TimeoutMs: number;

  // Service handler registry (OCP: handlers stored in map, extendable via registration)
  private readonly serviceHandlers: Map<number, ServiceHandlerFn>;

   constructor(config: Kwp2000RouterConfig) {
     this.dtcEngine = config.dtcEngine;
     this.sessionTimeoutMs = config.sessionTimeoutMs ?? DEFAULT_SESSION_TIMEOUT_MS;
     this.p2TimeoutMs = config.p2TimeoutMs ?? DEFAULT_P2_TIMEOUT_MS;
     this.p3TimeoutMs = config.p3TimeoutMs ?? DEFAULT_P3_TIMEOUT_MS;

     // Initialize logger
     this.logger = Logger.child("Kwp2000Router");

     // Initialize service handler registry
     this.serviceHandlers = this.initializeHandlers();
   }

  /**
   * Initialize service handler map
   * OCP: To add new services, either extend this method or use registerHandler()
   */
  private initializeHandlers(): Map<number, ServiceHandlerFn> {
    const handlers = new Map<number, ServiceHandlerFn>();

    // Register standard services
    handlers.set(SERVICE_IDS.DIAGNOSTIC_SESSION_CONTROL, (frame) =>
      this.handleDiagnosticSessionControl(frame),
    );
    handlers.set(SERVICE_IDS.ECU_RESET, (frame) =>
      this.handleEcuReset(frame),
    );
    handlers.set(SERVICE_IDS.CLEAR_DIAGNOSTIC_INFORMATION, (frame) =>
      this.handleClearDiagnosticInformation(frame),
    );
    handlers.set(SERVICE_IDS.READ_DIAGNOSTIC_TROUBLE_CODES, (frame) =>
      this.handleReadDiagnosticTroubleCodes(frame),
    );
    handlers.set(SERVICE_IDS.READ_DATA_BY_IDENTIFIER, (frame) =>
      this.handleReadDataByIdentifier(frame),
    );
    handlers.set(SERVICE_IDS.SECURITY_ACCESS, (frame) =>
      this.handleSecurityAccess(frame),
    );
    handlers.set(SERVICE_IDS.TESTER_PRESENT, (frame) =>
      this.handleTesterPresent(frame),
    );

    return handlers;
  }

  /**
   * Register a custom service handler (OCP extension point)
   */
  registerHandler(serviceId: number, handler: ServiceHandlerFn): void {
    this.serviceHandlers.set(serviceId, handler);
  }

  /** Parse incoming KWP2000 frame */
  parseFrame(data: Buffer): Kwp2000Frame | null {
    if (data.length < 3) return null;

    const length = data[0]!;
    const serviceId = data[1]!;

    // Validate frame length
    if (length !== data.length - 1) return null;

    return {
      length,
      serviceId,
      data: data.subarray(2),
    };
  }

  /** Process a KWP2000 request and return response */
  processRequest(frame: Kwp2000Frame): Kwp2000Response {
    this.lastActivityTime = Date.now();

    try {
      const handler = this.serviceHandlers.get(frame.serviceId);
      if (handler) {
        return handler(frame);
      }
      return this.createNegativeResponse(
        frame.serviceId,
        NRC.SERVICE_NOT_SUPPORTED,
      );
     } catch (error) {
       this.logger.error("KWP2000 processing error", { error });
       return this.createNegativeResponse(frame.serviceId, NRC.GENERAL_REJECT);
     }
  }

  private handleDiagnosticSessionControl(frame: Kwp2000Frame): Kwp2000Response {
    if (frame.data.length < 1) {
      return this.createNegativeResponse(
        frame.serviceId,
        NRC.INCORRECT_MESSAGE_LENGTH_OR_INVALID_FORMAT,
      );
    }

    const sessionType = frame.data[0]!;

    // Validate session type
    if (!Object.values(SESSION_TYPES).includes(sessionType as SessionType)) {
      return this.createNegativeResponse(
        frame.serviceId,
        NRC.SUB_FUNCTION_NOT_SUPPORTED,
      );
    }

    // Change session
    this.currentSession = sessionType as SessionType;
    this.sessionStartTime = Date.now();
    this.testerPresentActive = false;

    // Response: positive + session type + P2max timing
    const responseData = Buffer.from([
      sessionType,
      0x00, // P2max high byte (50ms = 0x0032)
      0x32, // P2max low byte
    ]);

    return {
      serviceId: frame.serviceId,
      data: responseData,
      isPositive: true,
    };
  }

  private handleEcuReset(frame: Kwp2000Frame): Kwp2000Response {
    if (frame.data.length < 1) {
      return this.createNegativeResponse(
        frame.serviceId,
        NRC.INCORRECT_MESSAGE_LENGTH_OR_INVALID_FORMAT,
      );
    }

    const resetType = frame.data[0]!;

    // Validate reset type (1-5 are valid)
    if (resetType < 1 || resetType > 5) {
      return this.createNegativeResponse(
        frame.serviceId,
        NRC.REQUEST_OUT_OF_RANGE,
      );
    }

    // Simple reset - in real implementation this would trigger ECU reset
    return {
      serviceId: frame.serviceId,
      data: Buffer.from([resetType]),
      isPositive: true,
    };
  }

  private handleClearDiagnosticInformation(
    frame: Kwp2000Frame,
  ): Kwp2000Response {
    // Clear all DTCs (mask 0xFF 0xFF 0xFF)
    this.dtcEngine.clear();
    return {
      serviceId: frame.serviceId,
      data: Buffer.alloc(0),
      isPositive: true,
    };
  }

  private handleReadDiagnosticTroubleCodes(
    frame: Kwp2000Frame,
  ): Kwp2000Response {
    if (frame.data.length < 2) {
      return this.createNegativeResponse(
        frame.serviceId,
        NRC.INCORRECT_MESSAGE_LENGTH_OR_INVALID_FORMAT,
      );
    }

    const subFunction = frame.data[0]!;
    const statusMask = frame.data[1]!;

    // For simplicity, we only support sub-function 0x02 (report DTC by status mask)
    if (subFunction !== 0x02) {
      return this.createNegativeResponse(
        frame.serviceId,
        NRC.SUB_FUNCTION_NOT_SUPPORTED,
      );
    }

    const dtcPayload = this.dtcEngine.toKwp2000Payload(statusMask);

    // Response format: sub-function + status availability mask + DTC count + DTC data
    const responseData = Buffer.concat([
      Buffer.from([subFunction]),
      Buffer.from([statusMask]), // Status availability mask
      Buffer.from([Math.floor(dtcPayload.length / 3)]), // DTC count (3 bytes per DTC)
      dtcPayload,
    ]);

    return {
      serviceId: frame.serviceId,
      data: responseData,
      isPositive: true,
    };
  }

  private handleReadDataByIdentifier(frame: Kwp2000Frame): Kwp2000Response {
    if (frame.data.length < 2) {
      return this.createNegativeResponse(
        frame.serviceId,
        NRC.INCORRECT_MESSAGE_LENGTH_OR_INVALID_FORMAT,
      );
    }

    const did = (frame.data[0]! << 8) | frame.data[1]!;

    // Mock data for common DIDs
    let value: Buffer;
    switch (did) {
      case 0x0c00: // Engine RPM
        value = Buffer.from([0x0f, 0xa0]); // 4000 RPM
        break;
      case 0x0c04: // Engine Speed
        value = Buffer.from([0x0f, 0xa0]); // Same as RPM for demo
        break;
      default:
        return this.createNegativeResponse(
          frame.serviceId,
          NRC.REQUEST_OUT_OF_RANGE,
        );
    }

    const responseData = Buffer.concat([
      Buffer.from([frame.data[0]!, frame.data[1]!]), // Echo DID
      value,
    ]);

    return {
      serviceId: frame.serviceId,
      data: responseData,
      isPositive: true,
    };
  }

  private handleSecurityAccess(frame: Kwp2000Frame): Kwp2000Response {
    if (frame.data.length < 1) {
      return this.createNegativeResponse(
        frame.serviceId,
        NRC.INCORRECT_MESSAGE_LENGTH_OR_INVALID_FORMAT,
      );
    }

    const securityLevel = frame.data[0];

    switch (securityLevel) {
      case SECURITY_LEVELS.REQUEST_SEED_LEVEL_1:
        // Generate a simple seed (in real implementation, this would be cryptographically secure)
        this.securitySeed = 0x12345678; // Fixed seed for testing
        const seedBytes = [
          (this.securitySeed >> 24) & 0xff,
          (this.securitySeed >> 16) & 0xff,
          (this.securitySeed >> 8) & 0xff,
          this.securitySeed & 0xff,
        ];
        return {
          serviceId: frame.serviceId,
          data: Buffer.from([securityLevel, ...seedBytes]),
          isPositive: true,
        };

      case SECURITY_LEVELS.SEND_KEY_LEVEL_1:
        if (frame.data.length < 5) {
          return this.createNegativeResponse(
            frame.serviceId,
            NRC.INCORRECT_MESSAGE_LENGTH_OR_INVALID_FORMAT,
          );
        }
        // Simple key validation (in real implementation, this would use proper crypto)
        const keyData = frame.data;
        const sentKey =
          (keyData[1]! << 24) |
          (keyData[2]! << 16) |
          (keyData[3]! << 8) |
          keyData[4]!;
        // For demo purposes, accept if key matches seed exactly
        if (sentKey === this.securitySeed) {
          return {
            serviceId: frame.serviceId,
            data: Buffer.from([securityLevel]),
            isPositive: true,
          };
        } else {
          return this.createNegativeResponse(frame.serviceId, NRC.INVALID_KEY);
        }

      default:
        return this.createNegativeResponse(
          frame.serviceId,
          NRC.SUB_FUNCTION_NOT_SUPPORTED,
        );
    }
  }

  private handleTesterPresent(frame: Kwp2000Frame): Kwp2000Response {
    // Reset the tester present timeout
    this.testerPresentActive = true;
    this.lastActivityTime = Date.now();

    return {
      serviceId: frame.serviceId,
      data: Buffer.from([0x00]), // Sub-function zero
      isPositive: true,
    };
  }

  private createNegativeResponse(
    serviceId: number,
    nrc: number,
  ): Kwp2000Response {
    return {
      serviceId: 0x7f, // Negative response SID
      data: Buffer.from([serviceId, nrc]),
      isPositive: false,
    };
  }

  /** Format response as KWP2000 frame */
  formatResponse(response: Kwp2000Response): Buffer {
    const serviceId = response.isPositive
      ? response.serviceId + POSITIVE_RESPONSE_BASE
      : response.serviceId;

    const frameData = Buffer.concat([Buffer.from([serviceId]), response.data]);

    // Add length byte at the beginning
    return Buffer.concat([Buffer.from([frameData.length]), frameData]);
  }

  /** Check if session is still active */
  isSessionActive(): boolean {
    const now = Date.now();
    return now - this.sessionStartTime < this.sessionTimeoutMs;
  }

  /** Check if tester present is required */
  isTesterPresentRequired(): boolean {
    if (!this.testerPresentActive) return false;
    const now = Date.now();
    return now - this.lastActivityTime > this.p3TimeoutMs;
  }

  /** Get current session type */
  getCurrentSession(): SessionType {
    return this.currentSession;
  }
}
