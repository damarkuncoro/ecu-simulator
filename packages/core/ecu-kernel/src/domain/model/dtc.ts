import { DTCStatus } from "./dtc-status";

/**
 * DTC Entity - Represents a Diagnostic Trouble Code
 */
export class DTC {
  private readonly code: number;
  private status: DTCStatus;
  private occurrenceCount: number;
  private firstSeen: Date;
  private lastSeen: Date;
  private description: string | undefined;

  constructor(
    code: number,
    status: DTCStatus,
    description?: string
  ) {
    this.code = code;
    this.status = status;
    this.occurrenceCount = 1;
    this.firstSeen = new Date();
    this.lastSeen = new Date();
    this.description = description;
  }

  // Getters
  getCode(): number {
    return this.code;
  }

  getStatus(): DTCStatus {
    return this.status;
  }

  getOccurrenceCount(): number {
    return this.occurrenceCount;
  }

  getFirstSeen(): Date {
    return new Date(this.firstSeen.getTime());
  }

  getLastSeen(): Date {
    return new Date(this.lastSeen.getTime());
  }

  getDescription(): string | undefined {
    return this.description;
  }

  // Methods
  updateStatus(newStatus: DTCStatus): void {
    this.status = newStatus;
    this.lastSeen = new Date();
  }

  incrementOccurrence(): void {
    this.occurrenceCount++;
    this.lastSeen = new Date();
  }

  setDescription(description: string): void {
    this.description = description;
  }

  // Category detection (same as before)
  detectCategory(): 'powertrain' | 'chassis' | 'body' | 'network' {
    const high = (this.code >> 8) & 0xc0; // top 2 bits
    switch (high) {
      case 0x00:
        return 'powertrain';
      case 0x40:
        return 'chassis';
      case 0x80:
        return 'body';
      case 0xc0:
        return 'network';
      default:
        return 'powertrain';
    }
  }

  // For serialization to KWP2000
  toKwp2000Tuple(): [number, number, number] {
    const highByte = (this.code >> 8) & 0xff;
    const lowByte = this.code & 0xff;
    const statusByte = this.status.getValue();
    return [highByte, lowByte, statusByte];
  }
}