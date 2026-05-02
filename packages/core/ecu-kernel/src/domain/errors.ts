/**
 * Domain Errors - Specific error types for the ECU domain
 * These errors represent domain concepts and should be used instead of generic Error
 */

/**
 * Base class for all domain errors
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;
  }

  toJSON(): { name: string; message: string; code: string } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
    };
  }
}

/**
 * Thrown when an ECU with the given ID does not exist
 */
export class ECUNotFoundError extends DomainError {
  readonly code = 'ECU_NOT_FOUND';

  constructor(ecuId: string) {
    super(`ECU with id ${ecuId} not found`);
  }
}

/**
 * Thrown when an operation is attempted on an ECU that is powered off
 */
export class ECUOffError extends DomainError {
  readonly code = 'ECU_OFF';

  constructor() {
    super('ECU is powered off');
  }
}

/**
 * Thrown when diagnostic session is not active or invalid for the operation
 */
export class InvalidSessionError extends DomainError {
  readonly code = 'INVALID_SESSION';

  constructor(expected: string) {
    super(`Operation requires ${expected} session`);
  }
}

/**
 * Thrown when security access is required but not granted
 */
export class SecurityAccessDeniedError extends DomainError {
  readonly code = 'SECURITY_ACCESS_DENIED';

  constructor(requiredLevel?: number) {
    super(
      requiredLevel !== undefined
        ? `Security access required for level ${requiredLevel}`
        : 'Security access required'
    );
  }
}

/**
 * Thrown when an invalid DTC code or status is provided
 */
export class InvalidDTCError extends DomainError {
  readonly code = 'INVALID_DTC';

  constructor(code: number, reason: string) {
    super(`Invalid DTC 0x${code.toString(16).toUpperCase()}: ${reason}`);
  }
}

/**
 * Thrown when a session timeout occurs
 */
export class SessionTimeoutError extends DomainError {
  readonly code = 'SESSION_TIMEOUT';

  constructor() {
    super('Diagnostic session timed out');
  }
}

/**
 * Thrown when a required DID is not found
 */
export class DIDNotFoundError extends DomainError {
  readonly code = 'DID_NOT_FOUND';

  constructor(did: number) {
    super(`DID 0x${did.toString(16).toUpperCase()} not found`);
  }
}

/**
 * Thrown when attempting to write to a read-only DID
 */
export class DIDReadOnlyError extends DomainError {
  readonly code = 'DID_READ_ONLY';

  constructor(did: number) {
    super(`DID 0x${did.toString(16).toUpperCase()} is read-only`);
  }
}

/**
 * Thrown when data length doesn't match DID definition
 */
export class DIDLengthMismatchError extends DomainError {
  readonly code = 'DID_LENGTH_MISMATCH';

  constructor(did: number, expected: number, actual: number) {
    super(
      `DID 0x${did.toString(16).toUpperCase()} expects ${expected} bytes, got ${actual}`
    );
  }
}

/**
 * Thrown when a service is not supported in the current session
 */
export class ServiceNotSupportedInSessionError extends DomainError {
  readonly code = 'SERVICE_NOT_SUPPORTED_IN_SESSION';

  constructor(serviceId: number, session: string) {
    super(`Service 0x${serviceId.toString(16).toUpperCase()} not supported in ${session} session`);
  }
}

/**
 * Thrown when an incorrect message length is provided
 */
export class InvalidMessageLengthError extends DomainError {
  readonly code = 'INVALID_MESSAGE_LENGTH';

  constructor(expected: number, actual: number) {
    super(`Expected ${expected} bytes, got ${actual}`);
  }
}
