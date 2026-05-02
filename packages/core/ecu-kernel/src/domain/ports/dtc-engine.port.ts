/**
 * DTCEngine Port - Defines the contract for DTC engine operations
 * This interface is implemented by infrastructure layer (adapting the existing DTCEngine)
 */
import { DTCStatus } from "../model/dtc-status";

export interface IDTCEngine {
  /**
   * Set (or overwrite) a DTC
   * @param code The DTC code
   * @param status The DTC status
   * @param description Optional description
   */
  set(code: number, status: DTCStatus, description?: string): void;

  /**
   * Update only the status byte of an existing DTC
   * @param code The DTC code
   * @param status Partial DTC status to update
   */
  updateStatus(code: number, status: Partial<DTCStatus>): void;

  /**
   * Clear a specific DTC or all DTCs
   * @param code Optional DTC code to clear (if not provided, clear all)
   */
  clear(code?: number): void;

  /**
   * Get all DTCs
   * @returns Array of DTC objects
   */
  getAll(): any[]; // We'll use the DTC entity from domain later, but for now any[] to avoid circular dependency

  /**
   * Get DTCs by status mask
   * @param mask The status mask to filter by
   * @returns Array of DTC objects
   */
  getByStatusMask(mask: number): any[];

  /**
   * Serialize to KWP2000 0x59 response payload format
   * @param statusMask The status mask to filter by (default 0xff)
   * @returns Buffer containing the serialized DTCs
   */
  toKwp2000Payload(statusMask?: number): Buffer;
}