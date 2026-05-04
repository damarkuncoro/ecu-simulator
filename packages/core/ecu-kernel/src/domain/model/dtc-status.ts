/**
 * DTCStatus Value Object - Represents the status byte of a DTC (SAE J2012)
 * Immutable value object with bitwise operations
 */
export class DTCStatus {
  private readonly _testFailed: boolean;
  private readonly _testFailedThisMonitoringCycle: boolean;
  private readonly _pendingDTC: boolean;
  private readonly _confirmedDTC: boolean;
  private readonly _testNotCompletedSinceLastClear: boolean;
  private readonly _testFailedSinceLastClear: boolean;
  private readonly _testNotCompletedThisMonitoringCycle: boolean;
  private readonly _warningIndicatorRequested: boolean;
  private readonly value: number;

  constructor(
    testFailed: boolean = false,
    testFailedThisMonitoringCycle: boolean = false,
    pendingDTC: boolean = false,
    confirmedDTC: boolean = false,
    testNotCompletedSinceLastClear: boolean = false,
    testFailedSinceLastClear: boolean = false,
    testNotCompletedThisMonitoringCycle: boolean = false,
    warningIndicatorRequested: boolean = false
  ) {
    // Validate that only boolean values are passed
    if (
      typeof testFailed !== 'boolean' ||
      typeof testFailedThisMonitoringCycle !== 'boolean' ||
      typeof pendingDTC !== 'boolean' ||
      typeof confirmedDTC !== 'boolean' ||
      typeof testNotCompletedSinceLastClear !== 'boolean' ||
      typeof testFailedSinceLastClear !== 'boolean' ||
      typeof testNotCompletedThisMonitoringCycle !== 'boolean' ||
      typeof warningIndicatorRequested !== 'boolean'
    ) {
      throw new Error('All parameters must be boolean');
    }
    this._testFailed = testFailed;
    this._testFailedThisMonitoringCycle = testFailedThisMonitoringCycle;
    this._pendingDTC = pendingDTC;
    this._confirmedDTC = confirmedDTC;
    this._testNotCompletedSinceLastClear = testNotCompletedSinceLastClear;
    this._testFailedSinceLastClear = testFailedSinceLastClear;
    this._testNotCompletedThisMonitoringCycle = testNotCompletedThisMonitoringCycle;
    this._warningIndicatorRequested = warningIndicatorRequested;
    this.value = this.encode();
  }

  // Getters
  get testFailed(): boolean {
    return this._testFailed;
  }

  get testFailedThisMonitoringCycle(): boolean {
    return this._testFailedThisMonitoringCycle;
  }

  get pendingDTC(): boolean {
    return this._pendingDTC;
  }

  get confirmedDTC(): boolean {
    return this._confirmedDTC;
  }

  get testNotCompletedSinceLastClear(): boolean {
    return this._testNotCompletedSinceLastClear;
  }

  get testFailedSinceLastClear(): boolean {
    return this._testFailedSinceLastClear;
  }

  get testNotCompletedThisMonitoringCycle(): boolean {
    return this._testNotCompletedThisMonitoringCycle;
  }

  get warningIndicatorRequested(): boolean {
    return this._warningIndicatorRequested;
  }

  getValue(): number {
    return this.value;
  }

  private encode(): number {
    return (
      (this._testFailed ? 0x01 : 0) |
      (this._testFailedThisMonitoringCycle ? 0x02 : 0) |
      (this._pendingDTC ? 0x04 : 0) |
      (this._confirmedDTC ? 0x08 : 0) |
      (this._testNotCompletedSinceLastClear ? 0x10 : 0) |
      (this._testFailedSinceLastClear ? 0x20 : 0) |
      (this._testNotCompletedThisMonitoringCycle ? 0x40 : 0) |
      (this._warningIndicatorRequested ? 0x80 : 0)
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

  // Immutable updates - return new instance
  withTestFailed(value: boolean): DTCStatus {
    return new DTCStatus(
      value,
      this._testFailedThisMonitoringCycle,
      this._pendingDTC,
      this._confirmedDTC,
      this._testNotCompletedSinceLastClear,
      this._testFailedSinceLastClear,
      this._testNotCompletedThisMonitoringCycle,
      this._warningIndicatorRequested
    );
  }

  withTestFailedThisMonitoringCycle(value: boolean): DTCStatus {
    return new DTCStatus(
      this._testFailed,
      value,
      this._pendingDTC,
      this._confirmedDTC,
      this._testNotCompletedSinceLastClear,
      this._testFailedSinceLastClear,
      this._testNotCompletedThisMonitoringCycle,
      this._warningIndicatorRequested
    );
  }

  // ... similar methods for other flags

  equals(other: DTCStatus): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return `DTCStatus{testFailed:${this._testFailed}, testFailedThisMonitoringCycle:${this._testFailedThisMonitoringCycle}, pendingDTC:${this._pendingDTC}, confirmedDTC:${this._confirmedDTC}, testNotCompletedSinceLastClear:${this._testNotCompletedSinceLastClear}, testFailedSinceLastClear:${this._testFailedSinceLastClear}, testNotCompletedThisMonitoringCycle:${this._testNotCompletedThisMonitoringCycle}, warningIndicatorRequested:${this._warningIndicatorRequested}}`;
  }
}

// Predefined statuses for convenience
export class DTCStatusFactory {
  static CONFIRMED_ACTIVE = new DTCStatus(true, true, true, true, false, true, false, true);
  static PENDING_ONLY = new DTCStatus(false, false, true, false, false, false, false, false);
  static CLEAR = new DTCStatus(false, false, false, false, false, false, false, false);
}