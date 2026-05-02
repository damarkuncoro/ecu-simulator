import { DTC } from "../model/dtc";
import { ECU } from "../model/ecu";

/**
 * Repository interface for ECU aggregates
 * Defines the contract for ECU persistence operations
 */
export interface IECURepository {
  save(ecu: ECU): Promise<void>;
  findById(id: string): Promise<ECU | null>;
  findAll(): Promise<ECU[]>;
  delete(id: string): Promise<void>;
}

/**
 * Repository interface for DTC entities
 * Defines the contract for DTC persistence operations
 */
export interface IDTCRepository {
  save(dtc: DTC): Promise<void>;
  findByCode(code: number): Promise<DTC | null>;
  findByStatusMask(mask: number): Promise<DTC[]>;
  findAll(): Promise<DTC[]>;
  delete(code: number): Promise<void>;
  clear(): Promise<void>;
}