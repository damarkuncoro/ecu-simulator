/**
 * DTCEngine Adapter - Adapts the existing DTCEngine to the IDTCEngine interface
 */
import { DTCEngine } from "@ecu/dtc-engine";
import { IDTCEngine } from "../../domain/ports/dtc-engine.port";
import { DTCStatus } from "../../domain/model/dtc-status";

export class DtcEngineAdapter implements IDTCEngine {
  private dtcEngine: DTCEngine;

  constructor() {
    this.dtcEngine = new DTCEngine();
  }

  set(code: number, status: DTCStatus, description?: string): void {
    this.dtcEngine.set(code, status, description);
  }

  updateStatus(code: number, status: Partial<DTCStatus>): void {
    this.dtcEngine.updateStatus(code, status);
  }

  clear(code?: number): void {
    this.dtcEngine.clear(code);
  }

  getAll(): any[] {
    // Return the DTCEngine's DTCs as an array of plain objects for now
    // In a full implementation, we would convert to domain DTC entities
    return this.dtcEngine.getAll().map(dtc => ({
      code: dtc.code,
      category: dtc.category,
      status: dtc.status,
      occurrenceCount: dtc.occurrenceCount,
      firstSeen: dtc.firstSeen,
      lastSeen: dtc.lastSeen,
      description: dtc.description
    }));
  }

  getByStatusMask(mask: number): any[] {
    return this.dtcEngine.getByStatusMask(mask).map(dtc => ({
      code: dtc.code,
      category: dtc.category,
      status: dtc.status,
      occurrenceCount: dtc.occurrenceCount,
      firstSeen: dtc.firstSeen,
      lastSeen: dtc.lastSeen,
      description: dtc.description
    }));
  }

  toKwp2000Payload(statusMask: number = 0xff): Buffer {
    return this.dtcEngine.toKwp2000Payload(statusMask);
  }
}