/**
 * DIDRegistry Adapter - Adapts the existing DIDRegistry to the IDIDRegistry interface
 */
import { DIDRegistry } from "@ecu/did-registry";
import { IDIDRegistry } from "./did-registry.port";

export class DidRegistryAdapter implements IDIDRegistry {
  private didRegistry: DIDRegistry;

  constructor() {
    this.didRegistry = new DIDRegistry();
  }

  get(id: number): any {
    return this.didRegistry.get(id);
  }

  set(id: number, definition: any): void {
    this.didRegistry.set(id, definition);
  }

  clearAll(): void {
    this.didRegistry.clearAll();
  }
}