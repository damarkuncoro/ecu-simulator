/**
 * DTCStatus Value Object - Represents the status byte of a DTC (SAE J2012)
 * Immutable value object with bitwise operations
 */
export class DTCStatus {
  private readonly value: number;

  constructor(
    public readonly testFailed: boolean = false,
    public readonly testFailedThisMonitoringCycle: boolean = false,
    public readonly pendingDTC: boolean = false,
    public readonly confirmedDTC: boolean = false,
    public readonly testNotCompletedSinceLastClear: boolean = false,
    public readonly testFailedSinceLastClear: boolean = false,
    public readonly testNotCompletedThisMonitoringCycle: boolean = false,
    public readonly warningIndicatorRequested: boolean = false
  ) {
    // Validate that only boolean values are passed
    this.value = this.encode();
  }

  private encode(): number {
    return (
      (this.testFailed ? 0x01 : 0) |
      (this.testFailedThisMonitoringCycle ? 0x02 : 0) |
      (this.pendingDTC ? 0x04 : 0) |
      (this.confirmedDTC ? 0x08 : 0) |
      (this.testNotCompletedSinceLastClear ? 0x10 : 0) |
      (this.testFailedSinceLastClear ? 0x20 : 0) |
      (this.testNotCompletedThisMonitoringCycle ? 0x40 : 0) |
      (this.warningIndicatorRequested ? 0x80 : 0)
    );
  }

  static fromByte(byte: number): DTCStatus {
    return new DTCStatus(
      !!(byte & 0x01),
      !!(byte & 0x02),
      !!(byte & 0x04),
      !!(byte & 0x08),
      !!(byte & 0x10),
      !!(byte & 0x20),
      !!(byte & 0x40),
      !!(byte & 0x80)
    );
  }

  getValue(): number {
    return this.value;
  }

  // Immutable updates - return new instance
  withTestFailed(value: boolean): DTCStatus {
    return new DTCStatus(
      value,
      this.testFailedThisMonitoringCycle,
      this.pendingDTC,
      this.confirmedDTC,
      this.testNotCompletedSinceLastClear,
      this.testFailedSinceLastClear,
      this.testNotCompletedThisMonitoringCycle,
      this.warningIndicatorRequested
    );
  }

  withTestFailedThisMonitoringCycle(value: boolean): DTCStatus {
    return new DTCStatus(
      this.testFailed,
      value,
      this.pendingDTC,
      this.confirmedDTC,
      this.testNotCompletedSinceLastClear,
      this.testFailedSinceLastClear,
      this.testNotCompletedThisMonitoringCycle,
      this.warningIndicatorRequested
    );
  }

  // ... similar methods for other flags

  equals(other: DTCStatus): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return `DTCStatus{testFailed:${this.testFailed}, testFailedThisMonitoringCycle:${this.testFailedThisMonitoringCycle}, pendingDTC:${this.pendingDTC}, confirmedDTC:${this.confirmedDTC}, testNotCompletedSinceLastClear:${this.testNotCompletedSinceLastClear}, testFailedSinceLastClear:${this.testFailedSinceLastClear}, testNotCompletedThisMonitoringCycle:${this.testNotCompletedThisMonitoringCycle}, warningIndicatorRequested:${this.warningIndicatorRequested}}`;
  }
}

// Predefined statuses for convenience
export class DTCStatusFactory {
  static CONFIRMED_ACTIVE = new DTCStatus(true, true, true, true, false, true, false, true);
  static PENDING_ONLY = new DTCStatus(false, false, true, false, false, false, false, false);
  static CLEAR = new DTCStatus(false, false, false, false, false, false, false, false);
}