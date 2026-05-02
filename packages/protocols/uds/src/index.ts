/**
 * @ecu/uds - UDS Protocol (ISO 14229) Implementation
 * Unified Diagnostic Services for CAN-based vehicle diagnostics
 * Provides comprehensive diagnostic services including DTC management, data access, and ECU programming
 */

import { DTCEngine } from "@ecu/dtc-engine";
import { didRegistry } from "@ecu/did-registry";
import { securityEngine } from "@ecu/security-engine";
import { timingEngine } from "@ecu/timing-engine";
import {
  DEFAULT_SESSION_TIMEOUT_MS,
  DEFAULT_P2_TIMEOUT_MS,
  DEFAULT_P3_TIMEOUT_MS,
} from "@ecu/protocol-constants";

// ─── UDS Service Identifiers ─────────────────────────────────────────────────

export const UDS_SERVICES = {
  // Diagnostic and Communication Management
  DIAGNOSTIC_SESSION_CONTROL: 0x10,
  ECU_RESET: 0x11,
  SECURITY_ACCESS: 0x27,
  COMMUNICATION_CONTROL: 0x28,
  TESTER_PRESENT: 0x3e,
  ACCESS_TIMING_PARAMETER: 0x83,
  SECURED_DATA_TRANSMISSION: 0x84,
  CONTROL_DTC_SETTING: 0x85,
  RESPONSE_ON_EVENT: 0x86,
  LINK_CONTROL: 0x87,

  // Data Transmission
  READ_DATA_BY_IDENTIFIER: 0x22,
  READ_MEMORY_BY_ADDRESS: 0x23,
  READ_SCALING_DATA_BY_IDENTIFIER: 0x24,
  READ_DATA_BY_PERIODIC_IDENTIFIER: 0x2a,
  DYNAMICALLY_DEFINE_DATA_IDENTIFIER: 0x2c,
  WRITE_DATA_BY_IDENTIFIER: 0x2e,
  WRITE_MEMORY_BY_ADDRESS: 0x3d,

  // Stored Data Transmission (Diagnostic Trouble Codes)
  CLEAR_DIAGNOSTIC_INFORMATION: 0x14,
  READ_DTC_INFORMATION: 0x19,

  // Input/Output Control
  INPUT_OUTPUT_CONTROL_BY_IDENTIFIER: 0x2f,

  // Routine
  ROUTINE_CONTROL: 0x31,

  // Upload/Download
  REQUEST_DOWNLOAD: 0x34,
  REQUEST_UPLOAD: 0x35,
  TRANSFER_DATA: 0x36,
  REQUEST_TRANSFER_EXIT: 0x37,

  // ECU Programming
  REQUEST_FILE_TRANSFER: 0x38,
} as const;

// ─── UDS Session Types ───────────────────────────────────────────────────────

export const UDS_SESSIONS = {
  DEFAULT: 0x01,
  PROGRAMMING: 0x02,
  EXTENDED_DIAGNOSTIC: 0x03,
  SAFETY_SYSTEM_DIAGNOSTIC: 0x04,
} as const;

export type UdsSessionType = (typeof UDS_SESSIONS)[keyof typeof UDS_SESSIONS];

// ─── UDS Response Types ──────────────────────────────────────────────────────

export interface UdsRequest {
  serviceId: number;
  data: Buffer;
  timestamp: number;
}

export interface UdsResponse {
  serviceId: number;
  data: Buffer;
  isPositive: boolean;
  responseCode?: number; // NRC for negative responses
  timestamp: number;
}

// ─── UDS Negative Response Codes ─────────────────────────────────────────────

export const UDS_NRC = {
  POSITIVE_RESPONSE: 0x00,
  GENERAL_REJECT: 0x10,
  SERVICE_NOT_SUPPORTED: 0x11,
  SUB_FUNCTION_NOT_SUPPORTED: 0x12,
  INCORRECT_MESSAGE_LENGTH_OR_INVALID_FORMAT: 0x13,
  RESPONSE_TOO_LONG: 0x14,
  BUSY_REPEAT_REQUEST: 0x21,
  CONDITIONS_NOT_CORRECT: 0x22,
  REQUEST_SEQUENCE_ERROR: 0x24,
  NO_RESPONSE_FROM_SUBNET_COMPONENT: 0x25,
  FAILURE_PREVENTS_EXECUTION_OF_REQUESTED_ACTION: 0x26,
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
  RPM_TOO_HIGH: 0x81,
  RPM_TOO_LOW: 0x82,
  ENGINE_IS_RUNNING: 0x83,
  ENGINE_IS_NOT_RUNNING: 0x84,
  ENGINE_RUN_TIME_TOO_LOW: 0x85,
  TEMPERATURE_TOO_HIGH: 0x86,
  TEMPERATURE_TOO_LOW: 0x87,
  VEHICLE_SPEED_TOO_HIGH: 0x88,
  VEHICLE_SPEED_TOO_LOW: 0x89,
  THROTTLE_PEDAL_TOO_HIGH: 0x8a,
  THROTTLE_PEDAL_TOO_LOW: 0x8b,
  TRANSMISSION_RANGE_NOT_IN_NEUTRAL: 0x8c,
  TRANSMISSION_RANGE_NOT_IN_GEAR: 0x8d,
  BRAKE_SWITCHES_NOT_CLOSED: 0x8f,
  SHIFT_LEVER_NOT_IN_PARK: 0x90,
  TORQUE_CONVERTER_CLUTCH_LOCKED: 0x91,
  VOLTAGE_TOO_HIGH: 0x92,
  VOLTAGE_TOO_LOW: 0x93,
} as const;

// ─── UDS Router ─────────────────────────────────────────────────────────────

export interface UdsRouterConfig {
  dtcEngine: DTCEngine;
  sessionTimeoutMs: number;
  p2TimeoutMs: number;
  p2StarTimeoutMs: number;
  s3TimeoutMs: number; // Tester present timeout
}

export class UdsRouter {
  private dtcEngine: DTCEngine;
  private currentSession: UdsSessionType = UDS_SESSIONS.DEFAULT;
  private sessionStartTime: number = 0;
  private lastActivityTime: number = 0;
  private testerPresentActive: boolean = false;
  private securityLevel: number = 0;

  // Timing parameters
  private readonly sessionTimeoutMs: number;
  private readonly p2TimeoutMs: number;
  private readonly p2StarTimeoutMs: number;
  private readonly s3TimeoutMs: number;

  // Service handler registry (OCP)
  private readonly serviceHandlers: Map<number, (request: UdsRequest) => UdsResponse>;

  constructor(config: UdsRouterConfig) {
    this.dtcEngine = config.dtcEngine;
    this.sessionTimeoutMs = config.sessionTimeoutMs ?? DEFAULT_SESSION_TIMEOUT_MS;
    this.p2TimeoutMs = config.p2TimeoutMs ?? DEFAULT_P2_TIMEOUT_MS;
    this.p2StarTimeoutMs = config.p2StarTimeoutMs ?? DEFAULT_P3_TIMEOUT_MS;
    this.s3TimeoutMs = config.s3TimeoutMs ?? DEFAULT_P3_TIMEOUT_MS;
    this.securityLevel = 0;

    // Initialize service handlers
    this.serviceHandlers = this.initializeHandlers();
  }

  /**
   * Initialize service handler map
   */
  private initializeHandlers(): Map<number, (request: UdsRequest) => UdsResponse> {
    const handlers = new Map<number, (request: UdsRequest) => UdsResponse>();

    handlers.set(UDS_SERVICES.DIAGNOSTIC_SESSION_CONTROL, (req) =>
      this.handleDiagnosticSessionControl(req),
    );
    handlers.set(UDS_SERVICES.ECU_RESET, (req) =>
      this.handleEcuReset(req),
    );
    handlers.set(UDS_SERVICES.SECURITY_ACCESS, (req) =>
      this.handleSecurityAccess(req),
    );
    handlers.set(UDS_SERVICES.TESTER_PRESENT, (req) =>
      this.handleTesterPresent(req),
    );
    handlers.set(UDS_SERVICES.READ_DATA_BY_IDENTIFIER, (req) =>
      this.handleReadDataByIdentifier(req),
    );
    handlers.set(UDS_SERVICES.WRITE_DATA_BY_IDENTIFIER, (req) =>
      this.handleWriteDataByIdentifier(req),
    );
    handlers.set(UDS_SERVICES.CLEAR_DIAGNOSTIC_INFORMATION, (req) =>
      this.handleClearDiagnosticInformation(req),
    );
    handlers.set(UDS_SERVICES.READ_DTC_INFORMATION, (req) =>
      this.handleReadDtcInformation(req),
    );
    handlers.set(UDS_SERVICES.CONTROL_DTC_SETTING, (req) =>
      this.handleControlDtcSetting(req),
    );
    handlers.set(UDS_SERVICES.COMMUNICATION_CONTROL, (req) =>
      this.handleCommunicationControl(req),
    );
    handlers.set(UDS_SERVICES.ROUTINE_CONTROL, (req) =>
      this.handleRoutineControl(req),
    );

    return handlers;
  }

  /**
   * Register a custom service handler (OCP extension point)
   */
  registerHandler(serviceId: number, handler: (request: UdsRequest) => UdsResponse): void {
    this.serviceHandlers.set(serviceId, handler);
  }

  private handleDiagnosticSessionControl(request: UdsRequest): UdsResponse {
    if (request.data.length < 1) {
      return this.createNegativeResponse(
        request.serviceId,
        UDS_NRC.INCORRECT_MESSAGE_LENGTH_OR_INVALID_FORMAT,
      );
    }

    const sessionType = request.data[0]!;
    const validSessions = Object.values(UDS_SESSIONS);

    if (!validSessions.includes(sessionType as UdsSessionType)) {
      return this.createNegativeResponse(
        request.serviceId,
        UDS_NRC.SUB_FUNCTION_NOT_SUPPORTED,
      );
    }

    // Change session
    this.currentSession = sessionType as UdsSessionType;
    this.sessionStartTime = Date.now();
    this.testerPresentActive = false;

    // Reset security access for new sessions (except programming)
    if (sessionType !== UDS_SESSIONS.PROGRAMMING) {
      this.securityLevel = 0;
    }

    // Response: session type + session timing parameters
    const responseData = Buffer.from([
      sessionType,
      0x00,
      0x32, // P2Server_max = 50ms
      0x00,
      0x0a, // P2*Server_max = 10ms (not used in CAN)
    ]);

    return {
      serviceId: request.serviceId,
      data: responseData,
      isPositive: true,
      timestamp: Date.now(),
    };
  }

  private handleEcuReset(request: UdsRequest): UdsResponse {
    if (request.data.length < 1) {
      return this.createNegativeResponse(
        request.serviceId,
        UDS_NRC.INCORRECT_MESSAGE_LENGTH_OR_INVALID_FORMAT,
      );
    }

    const resetType = request.data[0]!;

    // Validate reset type (0x01 = hardReset, 0x02 = keyOffOnReset, etc.)
    if (resetType < 0x01 || resetType > 0x05) {
      return this.createNegativeResponse(
        request.serviceId,
        UDS_NRC.REQUEST_OUT_OF_RANGE,
      );
    }

    // In a real implementation, this would trigger actual ECU reset
    console.log(`ECU reset requested: type 0x${resetType.toString(16)}`);

    return {
      serviceId: request.serviceId,
      data: Buffer.from([resetType, 0x00]), // Reset type + power down time
      isPositive: true,
      timestamp: Date.now(),
    };
  }

  private handleSecurityAccess(request: UdsRequest): UdsResponse {
    if (request.data.length < 1) {
      return this.createNegativeResponse(
        request.serviceId,
        UDS_NRC.INCORRECT_MESSAGE_LENGTH_OR_INVALID_FORMAT,
      );
    }

    const securityLevel = request.data[0]!;

    // Check if security access is supported in current session
    if (this.currentSession === UDS_SESSIONS.DEFAULT) {
      return this.createNegativeResponse(
        request.serviceId,
        UDS_NRC.SERVICE_NOT_SUPPORTED_IN_ACTIVE_SESSION,
      );
    }

    if (securityLevel % 2 === 1) {
      // Request seed
      const seed = securityEngine.generateSeed(
        Math.floor(securityLevel / 2) + 1,
      );
      return {
        serviceId: request.serviceId,
        data: Buffer.concat([Buffer.from([securityLevel]), seed]),
        isPositive: true,
        timestamp: Date.now(),
      };
    } else {
      // Send key
      if (request.data.length < 5) {
        return this.createNegativeResponse(
          request.serviceId,
          UDS_NRC.INCORRECT_MESSAGE_LENGTH_OR_INVALID_FORMAT,
        );
      }

      const keyData = request.data.subarray(1);
      const valid = securityEngine.verifyKey(
        Math.floor(securityLevel / 2),
        keyData,
      );

      if (valid) {
        securityEngine.unlockLevel(Math.floor(securityLevel / 2));
        this.securityLevel = Math.floor(securityLevel / 2);
        return {
          serviceId: request.serviceId,
          data: Buffer.from([securityLevel]),
          isPositive: true,
          timestamp: Date.now(),
        };
      } else {
        return this.createNegativeResponse(
          request.serviceId,
          UDS_NRC.INVALID_KEY,
        );
      }
    }
  }

  private handleTesterPresent(request: UdsRequest): UdsResponse {
    // Reset the S3 (tester present) timeout
    this.testerPresentActive = true;
    this.lastActivityTime = Date.now();

    return {
      serviceId: request.serviceId,
      data: Buffer.from([0x00]), // Sub-function zero
      isPositive: true,
      timestamp: Date.now(),
    };
  }

  private handleReadDataByIdentifier(request: UdsRequest): UdsResponse {
    if (request.data.length < 2) {
      return this.createNegativeResponse(
        request.serviceId,
        UDS_NRC.INCORRECT_MESSAGE_LENGTH_OR_INVALID_FORMAT,
      );
    }

    const did = (request.data[0]! << 8) | request.data[1]!;
    const value = didRegistry.getValue(did);

    if (!value) {
      return this.createNegativeResponse(
        request.serviceId,
        UDS_NRC.REQUEST_OUT_OF_RANGE,
      );
    }

    const responseData = Buffer.concat([
      Buffer.from([request.data[0]!, request.data[1]!]), // Echo DID
      value.data,
    ]);

    return {
      serviceId: request.serviceId,
      data: responseData,
      isPositive: true,
      timestamp: Date.now(),
    };
  }

  private handleWriteDataByIdentifier(request: UdsRequest): UdsResponse {
    if (request.data.length < 3) {
      return this.createNegativeResponse(
        request.serviceId,
        UDS_NRC.INCORRECT_MESSAGE_LENGTH_OR_INVALID_FORMAT,
      );
    }

    const did = (request.data[0]! << 8) | request.data[1]!;
    const data = request.data.subarray(2);

    // Check security access for write operations
    if (!securityEngine.isUnlocked(1)) {
      // Require level 1 security
      return this.createNegativeResponse(
        request.serviceId,
        UDS_NRC.SECURITY_ACCESS_DENIED,
      );
    }

    try {
      didRegistry.setValue(did, data);
      return {
        serviceId: request.serviceId,
        data: Buffer.from([request.data[0]!, request.data[1]!]), // Echo DID
        isPositive: true,
        timestamp: Date.now(),
      };
    } catch (error) {
      return this.createNegativeResponse(
        request.serviceId,
        UDS_NRC.GENERAL_REJECT,
      );
    }
  }

  private handleClearDiagnosticInformation(request: UdsRequest): UdsResponse {
    // Clear all DTCs
    this.dtcEngine.clear();

    return {
      serviceId: request.serviceId,
      data: Buffer.alloc(0),
      isPositive: true,
      timestamp: Date.now(),
    };
  }

  private handleReadDtcInformation(request: UdsRequest): UdsResponse {
    if (request.data.length < 1) {
      return this.createNegativeResponse(
        request.serviceId,
        UDS_NRC.INCORRECT_MESSAGE_LENGTH_OR_INVALID_FORMAT,
      );
    }

    const subFunction = request.data[0]!;
    const dtcStatusMask = request.data[1] || 0xff;

    const dtcs = this.dtcEngine.getByStatusMask(dtcStatusMask);
    const dtcData = this.dtcEngine.toKwp2000Payload(dtcStatusMask);

    // UDS DTC format: availability mask + DTC status + DTC data
    const responseData = Buffer.concat([
      Buffer.from([dtcStatusMask]), // DTC status availability mask
      Buffer.from([Math.floor(dtcData.length / 4)]), // DTC count
      dtcData,
    ]);

    return {
      serviceId: request.serviceId,
      data: responseData,
      isPositive: true,
      timestamp: Date.now(),
    };
  }

  private handleControlDtcSetting(request: UdsRequest): UdsResponse {
    if (request.data.length < 1) {
      return this.createNegativeResponse(
        request.serviceId,
        UDS_NRC.INCORRECT_MESSAGE_LENGTH_OR_INVALID_FORMAT,
      );
    }

    const controlType = request.data[0]!;

    // Check security access
    if (!securityEngine.isUnlocked(1)) {
      return this.createNegativeResponse(
        request.serviceId,
        UDS_NRC.SECURITY_ACCESS_DENIED,
      );
    }

    // In real implementation, this would enable/disable DTC storage
    console.log(`DTC setting control: ${controlType === 0x01 ? "ON" : "OFF"}`);

    return {
      serviceId: request.serviceId,
      data: Buffer.from([controlType]),
      isPositive: true,
      timestamp: Date.now(),
    };
  }

  private handleCommunicationControl(request: UdsRequest): UdsResponse {
    if (request.data.length < 2) {
      return this.createNegativeResponse(
        request.serviceId,
        UDS_NRC.INCORRECT_MESSAGE_LENGTH_OR_INVALID_FORMAT,
      );
    }

    const controlType = request.data[0]!;
    const communicationType = request.data[1]!;

    // Check security access for communication control
    if (!securityEngine.isUnlocked(1)) {
      return this.createNegativeResponse(
        request.serviceId,
        UDS_NRC.SECURITY_ACCESS_DENIED,
      );
    }

    console.log(
      `Communication control: type=${controlType}, comm=${communicationType}`,
    );

    return {
      serviceId: request.serviceId,
      data: Buffer.from([controlType]),
      isPositive: true,
      timestamp: Date.now(),
    };
  }

  private handleRoutineControl(request: UdsRequest): UdsResponse {
    if (request.data.length < 3) {
      return this.createNegativeResponse(
        request.serviceId,
        UDS_NRC.INCORRECT_MESSAGE_LENGTH_OR_INVALID_FORMAT,
      );
    }

    const routineControlType = request.data[0]!;
    const routineIdentifier = (request.data[1]! << 8) | request.data[2]!;

    // Validate routine control type
    if (routineControlType < 0x01 || routineControlType > 0x03) {
      return this.createNegativeResponse(
        request.serviceId,
        UDS_NRC.REQUEST_OUT_OF_RANGE,
      );
    }

    console.log(
      `Routine control: type=${routineControlType}, id=0x${routineIdentifier.toString(16)}`,
    );

    // Mock routine result
    const routineStatus = 0x01; // Completed successfully
    const routineResult = Buffer.from([0x12, 0x34]); // Mock result data

    const responseData = Buffer.concat([
      Buffer.from([routineControlType, request.data[1]!, request.data[2]!]),
      Buffer.from([routineStatus]),
      routineResult,
    ]);

     return {
       serviceId: request.serviceId,
       data: responseData,
       isPositive: true,
       timestamp: Date.now(),
     };
   }

   /** Process UDS request and return response */
   processRequest(request: UdsRequest): UdsResponse {
     this.lastActivityTime = Date.now();

     try {
       const handler = this.serviceHandlers.get(request.serviceId);
       if (handler) {
         return handler(request);
       }
       return this.createNegativeResponse(
         request.serviceId,
         UDS_NRC.SERVICE_NOT_SUPPORTED,
       );
     } catch (error) {
       console.error("UDS processing error:", error);
       return this.createNegativeResponse(
         request.serviceId,
         UDS_NRC.GENERAL_REJECT,
       );
     }
   }

   private createNegativeResponse(serviceId: number, nrc: number): UdsResponse {
    return {
      serviceId: 0x7f, // Negative response SID
      data: Buffer.from([serviceId, nrc]),
      isPositive: false,
      responseCode: nrc,
      timestamp: Date.now(),
    };
  }

  /** Get current session */
  getCurrentSession(): UdsSessionType {
    return this.currentSession;
  }

  /** Get current security level */
  getSecurityLevel(): number {
    return this.securityLevel;
  }

  /** Check if session is active */
  isSessionActive(): boolean {
    const now = Date.now();
    return now - this.sessionStartTime < this.sessionTimeoutMs;
  }

  /** Check if tester present is required */
  isTesterPresentRequired(): boolean {
    if (!this.testerPresentActive) return false;
    const now = Date.now();
    return now - this.lastActivityTime > this.s3TimeoutMs;
  }
}

// ─── Export ──────────────────────────────────────────────────────────────────

export const PKG = "@ecu/uds";
