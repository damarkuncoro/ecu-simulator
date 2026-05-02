/**
 * DTOs (Data Transfer Objects) for application layer
 * Used to transfer data between layers without exposing domain entities
 */

/**
 * ECU State DTO - Represents the state of an ECU for presentation/API
 */
export class ECUStateDTO {
  constructor(
    public readonly id: string,
    public readonly power: 'off' | 'on' | 'sleep',
    public readonly protocol: 'kwp2000' | 'iso9141' | null,
    public readonly sessionActive: boolean,
    public readonly securityLocked: boolean
  ) {}
}

/**
 * DTC DTO - Represents a DTC for presentation/API
 */
export class DTCCodeDTO {
  constructor(
    public readonly code: number,
    public readonly category: 'powertrain' | 'chassis' | 'body' | 'network',
    public readonly statusValue: number,
    public readonly occurrenceCount: number,
    public readonly firstSeen: string, // ISO string
    public readonly lastSeen: string,  // ISO string
    public readonly description?: string
  ) {}

  static fromDTC(dtc: any): DTCCodeDTO {
    return new DTCCodeDTO(
      dtc.getCode(),
      dtc.detectCategory(),
      dtc.getStatus().getValue(),
      dtc.getOccurrenceCount(),
      dtc.getFirstSeen().toISOString(),
      dtc.getLastSeen().toISOString(),
      dtc.getDescription()
    );
  }
}

/**
 * Session Info DTO - Represents diagnostic session information
 */
export class SessionInfoDTO {
  constructor(
    public readonly state: string,
    public readonly context: any,
    public readonly isActive: boolean
  ) {}
}