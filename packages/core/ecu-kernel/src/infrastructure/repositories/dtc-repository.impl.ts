/**
 * In-memory implementation of DTC repository
 */
import { DTC } from "../../domain/model/dtc";
import { IDTCRepository } from "../../domain/repositories";

export class InMemoryDTCRepository implements IDTCRepository {
  private dtcs: Map<number, DTC> = new Map();

  async save(dtc: DTC): Promise<void> {
    this.dtcs.set(dtc.getCode(), dtc);
  }

  async findByCode(code: number): Promise<DTC | null> {
    return this.dtcs.get(code) ?? null;
  }

  async findByStatusMask(mask: number): Promise<DTC[]> {
    return Array.from(this.dtcs.values()).filter(dtc => 
      (dtc.getStatus().getValue() & mask) !== 0
    );
  }

  async findAll(): Promise<DTC[]> {
    return Array.from(this.dtcs.values());
  }

  async delete(code: number): Promise<void> {
    this.dtcs.delete(code);
  }

  async clear(): Promise<void> {
    this.dtcs.clear();
  }
}