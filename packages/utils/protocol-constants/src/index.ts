/**
 * @ecu/protocol-constants
 * Centralized default timing parameters and protocol constants.
 * Single source of truth to avoid duplication across packages.
 */

// ─── Timing Constants ────────────────────────────────────────────────────────

/**
 * Default P2 timeout (ECU response time) in milliseconds.
 * Standard: 50ms for KWP2000/UDS at typical baud rates.
 */
export const DEFAULT_P2_TIMEOUT_MS = 50;

/**
 * Default P3 timeout (tester present interval) in milliseconds.
 * Standard: 5 seconds (5000ms).
 */
export const DEFAULT_P3_TIMEOUT_MS = 5000;

/**
 * Default P1 timeout (inter-byte time) in milliseconds.
 * For high-speed protocols, often 0.
 */
export const DEFAULT_P1_TIMEOUT_MS = 0;

/**
 * Default P4 timeout (tester inter-byte) in milliseconds.
 */
export const DEFAULT_P4_TIMEOUT_MS = 0;

/**
 * Default session timeout (maximum session duration without tester present) in ms.
 */
export const DEFAULT_SESSION_TIMEOUT_MS = 5000;

/**
 * Default security access timeout (for seed/key exchange) in ms.
 */
export const DEFAULT_SECURITY_TIMEOUT_MS = 10000;

// ─── Protocol-Specific Default Timings ──────────────────────────────────────

export interface TimingParameters {
  p1: number;
  p2: number;
  p3: number;
  p4: number;
}

export const KWP2000_DEFAULT_TIMINGS: TimingParameters = {
  p1: DEFAULT_P1_TIMEOUT_MS,
  p2: DEFAULT_P2_TIMEOUT_MS,
  p3: DEFAULT_P3_TIMEOUT_MS,
  p4: DEFAULT_P4_TIMEOUT_MS,
};

export const UDS_DEFAULT_TIMINGS: TimingParameters = {
  p1: DEFAULT_P1_TIMEOUT_MS,
  p2: DEFAULT_P2_TIMEOUT_MS,
  p3: DEFAULT_P3_TIMEOUT_MS,
  p4: DEFAULT_P4_TIMEOUT_MS,
};

export const ISO9141_DEFAULT_TIMINGS: TimingParameters = {
  p1: 5,   // 5ms inter-byte for ISO9141
  p2: 25,  // Typically 25ms
  p3: 5000,
  p4: 5,   // 5ms inter-byte for tester
};

// ─── Negative Response Codes (Common) ───────────────────────────────────────

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

export type NRC = typeof NRC[keyof typeof NRC];
