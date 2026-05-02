/**
 * @ecu/dtc-engine
 * SAE J2012 / ISO 15031-6 compliant DTC management.
 */

import { detectCategory } from "@ecu/dtc-utils";

// ─── Types ───────────────────────────────────────────────────────────────────

/** SAE J2012 DTC status byte bits */
export interface DTCStatus {
  testFailed: boolean; // bit 0
  testFailedThisMonitoringCycle: boolean; // bit 1
  pendingDTC: boolean; // bit 2
  confirmedDTC: boolean; // bit 3
  testNotCompletedSinceLastClear: boolean; // bit 4
  testFailedSinceLastClear: boolean; // bit 5
  testNotCompletedThisMonitoringCycle: boolean; // bit 6
  warningIndicatorRequested: boolean; // bit 7
}

export type DTCCategory = "powertrain" | "chassis" | "body" | "network";

export interface DTC {
  code: number; // Raw 2-byte code (e.g. 0x0300 = P0300)
  category: DTCCategory;
  status: DTCStatus;
  occurrenceCount: number;
  firstSeen: Date;
  lastSeen: Date;
  description?: string | undefined;
}

// ─── Status byte encode/decode ────────────────────────────────────────────────

export function encodeStatusByte(status: DTCStatus): number {
  return (
    (status.testFailed ? 0x01 : 0) |
    (status.testFailedThisMonitoringCycle ? 0x02 : 0) |
    (status.pendingDTC ? 0x04 : 0) |
    (status.confirmedDTC ? 0x08 : 0) |
    (status.testNotCompletedSinceLastClear ? 0x10 : 0) |
    (status.testFailedSinceLastClear ? 0x20 : 0) |
    (status.testNotCompletedThisMonitoringCycle ? 0x40 : 0) |
    (status.warningIndicatorRequested ? 0x80 : 0)
  );
}

export function decodeStatusByte(byte: number): DTCStatus {
  return {
    testFailed: !!(byte & 0x01),
    testFailedThisMonitoringCycle: !!(byte & 0x02),
    pendingDTC: !!(byte & 0x04),
    confirmedDTC: !!(byte & 0x08),
    testNotCompletedSinceLastClear: !!(byte & 0x10),
    testFailedSinceLastClear: !!(byte & 0x20),
    testNotCompletedThisMonitoringCycle: !!(byte & 0x40),
    warningIndicatorRequested: !!(byte & 0x80),
  };
}

export const CONFIRMED_ACTIVE: DTCStatus = {
  testFailed: true,
  testFailedThisMonitoringCycle: true,
  pendingDTC: true,
  confirmedDTC: true,
  testNotCompletedSinceLastClear: false,
  testFailedSinceLastClear: true,
  testNotCompletedThisMonitoringCycle: false,
  warningIndicatorRequested: true,
};

export const PENDING_ONLY: DTCStatus = {
  testFailed: false,
  testFailedThisMonitoringCycle: false,
  pendingDTC: true,
  confirmedDTC: false,
  testNotCompletedSinceLastClear: false,
  testFailedSinceLastClear: false,
  testNotCompletedThisMonitoringCycle: false,
  warningIndicatorRequested: false,
};

// ─── DTC Engine ──────────────────────────────────────────────────────────────

export class DTCEngine {
  private dtcs: Map<number, DTC> = new Map();

  /** Set (or overwrite) a DTC */
  set(code: number, status: DTCStatus, description?: string): void {
    const existing = this.dtcs.get(code);
    this.dtcs.set(code, {
      code,
      category: this.detectCategory(code),
      status,
      occurrenceCount: (existing?.occurrenceCount ?? 0) + 1,
      firstSeen: existing?.firstSeen ?? new Date(),
      lastSeen: new Date(),
      description,
    });
  }

  /** Update only the status byte of an existing DTC */
  updateStatus(code: number, status: Partial<DTCStatus>): void {
    const existing = this.dtcs.get(code);
    if (!existing) return;
    this.dtcs.set(code, {
      ...existing,
      status: { ...existing.status, ...status },
      lastSeen: new Date(),
    });
  }

  clear(code?: number): void {
    if (code !== undefined) {
      this.dtcs.delete(code);
    } else {
      this.dtcs.clear();
    }
  }

  getAll(): DTC[] {
    return [...this.dtcs.values()];
  }

  getByStatusMask(mask: number): DTC[] {
    return this.getAll().filter((dtc) => encodeStatusByte(dtc.status) & mask);
  }

  /** Serialize to KWP2000 0x59 response payload format */
  toKwp2000Payload(statusMask: number = 0xff): Buffer {
    const matching = this.getByStatusMask(statusMask);
    const chunks: Buffer[] = [];

    for (const dtc of matching) {
      const highByte = (dtc.code >> 8) & 0xff;
      const lowByte = dtc.code & 0xff;
      const statusByte = encodeStatusByte(dtc.status);
      chunks.push(Buffer.from([highByte, lowByte, statusByte]));
    }

    return Buffer.concat(chunks);
  }

   private detectCategory(code: number): DTCCategory {
     return detectCategory(code) as DTCCategory;
   }
}
