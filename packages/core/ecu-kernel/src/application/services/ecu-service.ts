/**
 * ECUService - Application service for managing ECU lifecycle
 * This service orchestrates the use cases related to ECU power and sessions.
 */
import { IECURepository } from "../../domain/repositories";
import { ECU } from "../../domain/model/ecu";
import { ECUNotFoundError, ECUOffError } from "../../domain/errors";

export class ECUService {
  private ecuRepository: IECURepository;

  constructor(ecuRepository: IECURepository) {
    this.ecuRepository = ecuRepository;
  }

  /**
   * Execute an operation on an ECU with standard error handling
   * @private
   */
  private async withECU<T>(ecuId: string, operation: (ecu: ECU) => T): Promise<void> {
    const ecu = await this.ecuRepository.findById(ecuId);
    if (!ecu) {
      throw new ECUNotFoundError(ecuId);
    }
    operation(ecu);
    await this.ecuRepository.save(ecu);
  }

  async powerOnECU(ecuId: string): Promise<void> {
    await this.withECU(ecuId, (ecu) => ecu.powerOn());
  }

  async powerOffECU(ecuId: string): Promise<void> {
    await this.withECU(ecuId, (ecu) => ecu.powerOff());
  }

  async startECUSession(ecuId: string): Promise<void> {
    await this.withECU(ecuId, (ecu) => {
      if (ecu.getState() !== 'on') {
        throw new ECUOffError();
      }
      ecu.startSession();
    });
  }

  async endECUSession(ecuId: string): Promise<void> {
    await this.withECU(ecuId, (ecu) => ecu.endSession());
  }

  async getECUState(ecuId: string): Promise<'off' | 'on' | 'sleep'> {
    const ecu = await this.ecuRepository.findById(ecuId);
    if (!ecu) {
      throw new ECUNotFoundError(ecuId);
    }
    return ecu.getState();
  }
}