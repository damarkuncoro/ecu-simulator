import { DTCStatus } from "./dtc-status";
import { detectCategory } from "@ecu/dtc-utils";

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

  // Category detection (delegated to utility)
  detectCategory(): 'powertrain' | 'chassis' | 'body' | 'network' {
    return detectCategory(this.code);
  }

  // For serialization to KWP2000
  toKwp2000Tuple(): [number, number, number] {
    const highByte = (this.code >> 8) & 0xff;
    const lowByte = this.code & 0xff;
    const statusByte = this.status.getValue();
    return [highByte, lowByte, statusByte];
  }
}