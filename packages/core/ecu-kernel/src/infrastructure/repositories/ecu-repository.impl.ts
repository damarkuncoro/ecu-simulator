/**
 * In-memory implementation of ECU repository
 */
import { ECU } from "../../../domain/model/ecu";
import { IECURepository } from "../index";

export class InMemoryECURepository implements IECURepository {
  private ecus: Map<string, ECU> = new Map();

  async save(ecu: ECU): Promise<void> {
    this.ecus.set(ecu.getId(), ecu);
  }

  async findById(id: string): Promise<ECU | null> {
    return this.ecus.get(id) ?? null;
  }

  async findAll(): Promise<ECU[]> {
    return Array.from(this.ecus.values());
  }

  async delete(id: string): Promise<void> {
    this.ecus.delete(id);
  }
}