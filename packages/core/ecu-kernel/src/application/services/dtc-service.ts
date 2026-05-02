/**
 * DTCService - Application service for managing DTCs
 * This service orchestrates the use cases related to DTC management.
 */
import { IDTCRepository, IECURepository } from "../../domain/repositories";
import { DTC } from "../../domain/model/dtc";
import { DTCStatus } from "../../domain/model/dtc-status";
import { ECU } from "../../domain/model/ecu";
import { ECUNotFoundError, ECUOffError } from "../../domain/errors";

export class DTCService {
  private dtcRepository: IDTCRepository;
  private ecuRepository: IECURepository;

  constructor(dtcRepository: IDTCRepository, ecuRepository: IECURepository) {
    this.dtcRepository = dtcRepository;
    this.ecuRepository = ecuRepository;
  }

  /**
   * Ensure ECU exists, throws if not found
   * @private
   */
  private async ensureECU(ecuId: string): Promise<ECU> {
    const ecu = await this.ecuRepository.findById(ecuId);
    if (!ecu) {
      throw new ECUNotFoundError(ecuId);
    }
    return ecu;
  }

  /**
   * Ensure ECU exists, throws if not found
   * @private
   */
  private async ensureECU(ecuId: string): Promise<ECU> {
    const ecu = await this.ecuRepository.findById(ecuId);
    if (!ecu) {
      throw new Error(`ECU with id ${ecuId} not found`);
    }
    return ecu;
  }

  /**
   * Set a DTC on an ECU
   * @param ecuId The ID of the ECU
   * @param code The DTC code
   * @param status The DTC status
   * @param description Optional description
   */
  async setDTC(ecuId: string, code: number, status: DTCStatus, description?: string): Promise<void> {
    const ecu = await this.ensureECU(ecuId);
    if (ecu.getState() === 'off') {
      throw new ECUOffError();
    }

    const existingDTC = await this.dtcRepository.findByCode(code);
    if (existingDTC) {
      existingDTC.updateStatus(status);
      if (description) {
        existingDTC.setDescription(description);
      }
      await this.dtcRepository.save(existingDTC);
    } else {
      const newDTC = new DTC(code, status, description);
      await this.dtcRepository.save(newDTC);
    }
  }

  /**
   * Clear a specific DTC
   * @param ecuId The ID of the ECU
   * @param code The DTC code to clear
   */
  async clearDTC(ecuId: string, code: number): Promise<void> {
    await this.ensureECU(ecuId);
    await this.dtcRepository.delete(code);
  }

  /**
   * Clear all DTCs
   * @param ecuId The ID of the ECU
   */
  async clearAllDTCs(ecuId: string): Promise<void> {
    await this.ensureECU(ecuId);
    await this.dtcRepository.clear();
  }

  /**
   * Get all DTCs for an ECU
   * @param ecuId The ID of the ECU
   * @returns Promise of DTC array
   */
  async getAllDTCs(ecuId: string): Promise<DTC[]> {
    await this.ensureECU(ecuId);
    return this.dtcRepository.findAll();
  }

  /**
   * Get DTCs by status mask
   * @param ecuId The ID of the ECU
   * @param mask The status mask to filter by
   * @returns Promise of DTC array
   */
  async getDTCsByStatusMask(ecuId: string, mask: number): Promise<DTC[]> {
    await this.ensureECU(ecuId);
    return this.dtcRepository.findByStatusMask(mask);
  }
}

    const existingDTC = await this.dtcRepository.findByCode(code);
    if (existingDTC) {
      existingDTC.updateStatus(status);
      if (description) {
        existingDTC.setDescription(description);
      }
      await this.dtcRepository.save(existingDTC);
    } else {
      const newDTC = new DTC(code, status, description);
      await this.dtcRepository.save(newDTC);
    }
  }

  /**
   * Clear a specific DTC
   * @param ecuId The ID of the ECU
   * @param code The DTC code to clear
   */
  async clearDTC(ecuId: string, code: number): Promise<void> {
    await this.ensureECU(ecuId);
    await this.dtcRepository.delete(code);
  }

  /**
   * Clear all DTCs
   * @param ecuId The ID of the ECU
   */
  async clearAllDTCs(ecuId: string): Promise<void> {
    await this.ensureECU(ecuId);
    await this.dtcRepository.clear();
  }

  /**
   * Get all DTCs for an ECU
   * @param ecuId The ID of the ECU
   * @returns Promise of DTC array
   */
  async getAllDTCs(ecuId: string): Promise<DTC[]> {
    await this.ensureECU(ecuId);
    return this.dtcRepository.findAll();
  }

  /**
   * Get DTCs by status mask
   * @param ecuId The ID of the ECU
   * @param mask The status mask to filter by
   * @returns Promise of DTC array
   */
  async getDTCsByStatusMask(ecuId: string, mask: number): Promise<DTC[]> {
    await this.ensureECU(ecuId);
    return this.dtcRepository.findByStatusMask(mask);
  }
}