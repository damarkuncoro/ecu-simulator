/**
 * DTCService - Application service for managing DTCs
 * This service orchestrates the use cases related to DTC management.
 */
import { IDTCRepository, IECURepository } from "../../domain/repositories";
import { DTC } from "../../domain/model/dtc";
import { DTCStatus } from "../../domain/model/dtc-status";

export class DTCService {
  private dtcRepository: IDTCRepository;
  private ecuRepository: IECURepository;

  constructor(dtcRepository: IDTCRepository, ecuRepository: IECURepository) {
    this.dtcRepository = dtcRepository;
    this.ecuRepository = ecuRepository;
  }

  /**
   * Set a DTC on an ECU
   * @param ecuId The ID of the ECU
   * @param code The DTC code
   * @param status The DTC status
   * @param description Optional description
   */
  async setDTC(ecuId: string, code: number, status: DTCStatus, description?: string): Promise<void> {
    // First, ensure the ECU exists and is in a state where DTCs can be set
    const ecu = await this.ecuRepository.findById(ecuId);
    if (!ecu) {
      throw new Error(`ECU with id ${ecuId} not found`);
    }
    if (ecu.getState() === 'off') {
      throw new Error('Cannot set DTC on ECU that is powered off');
    }

    // Create or update the DTC
    const existingDTC = await this.dtcRepository.findByCode(code);
    if (existingDTC) {
      // Update existing DTC
      existingDTC.updateStatus(status);
      if (description) {
        existingDTC.setDescription(description);
      }
      await this.dtcRepository.save(existingDTC);
    } else {
      // Create new DTC
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
    const ecu = await this.ecuRepository.findById(ecuId);
    if (!ecu) {
      throw new Error(`ECU with id ${ecuId} not found`);
    }

    await this.dtcRepository.delete(code);
  }

  /**
   * Clear all DTCs
   * @param ecuId The ID of the ECU
   */
  async clearAllDTCs(ecuId: string): Promise<void> {
    const ecu = await this.ecuRepository.findById(ecuId);
    if (!ecu) {
      throw new Error(`ECU with id ${ecuId} not found`);
    }

    await this.dtcRepository.clear();
  }

  /**
   * Get all DTCs for an ECU
   * @param ecuId The ID of the ECU
   * @returns Promise of DTC array
   */
  async getAllDTCs(ecuId: string): Promise<DTC[]> {
    const ecu = await this.ecuRepository.findById(ecuId);
    if (!ecu) {
      throw new Error(`ECU with id ${ecuId} not found`);
    }

    return this.dtcRepository.findAll();
  }

  /**
   * Get DTCs by status mask
   * @param ecuId The ID of the ECU
   * @param mask The status mask to filter by
   * @returns Promise of DTC array
   */
  async getDTCsByStatusMask(ecuId: string, mask: number): Promise<DTC[]> {
    const ecu = await this.ecuRepository.findById(ecuId);
    if (!ecu) {
      throw new Error(`ECU with id ${ecuId} not found`);
    }

    return this.dtcRepository.findByStatusMask(mask);
  }
}