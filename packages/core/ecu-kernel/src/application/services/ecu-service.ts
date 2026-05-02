/**
 * ECUService - Application service for managing ECU lifecycle
 * This service orchestrates the use cases related to ECU power and sessions.
 */
import { IECURepository } from "../../domain/repositories";

export class ECUService {
  private ecuRepository: IECURepository;

  constructor(ecuRepository: IECURepository) {
    this.ecuRepository = ecuRepository;
  }

  async powerOnECU(ecuId: string): Promise<void> {
    const ecu = await this.ecuRepository.findById(ecuId);
    if (!ecu) {
      throw new Error(`ECU with id ${ecuId} not found`);
    }
    ecu.powerOn();
    await this.ecuRepository.save(ecu);
  }

  async powerOffECU(ecuId: string): Promise<void> {
    const ecu = await this.ecuRepository.findById(ecuId);
    if (!ecu) {
      throw new Error(`ECU with id ${ecuId} not found`);
    }
    ecu.powerOff();
    await this.ecuRepository.save(ecu);
  }

  async startECUSession(ecuId: string): Promise<void> {
    const ecu = await this.ecuRepository.findById(ecuId);
    if (!ecu) {
      throw new Error(`ECU with id ${ecuId} not found`);
    }
    if (ecu.getState() !== 'on') {
      throw new Error('ECU must be powered on to start a session');
    }
    ecu.startSession();
    await this.ecuRepository.save(ecu);
  }

  async endECUSession(ecuId: string): Promise<void> {
    const ecu = await this.ecuRepository.findById(ecuId);
    if (!ecu) {
      throw new Error(`ECU with id ${ecuId} not found`);
    }
    ecu.endSession();
    await this.ecuRepository.save(ecu);
  }

  async getECUState(ecuId: string): Promise<'off' | 'on' | 'sleep'> {
    const ecu = await this.ecuRepository.findById(ecuId);
    if (!ecu) {
      throw new Error(`ECU with id ${ecuId} not found`);
    }
    return ecu.getState();
  }
}