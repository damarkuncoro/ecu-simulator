/**
 * DIDRegistry Adapter - Adapts the existing DIDRegistry to the IDIDRegistry interface
 */
import { DIDRegistry } from "@ecu/did-registry";
import type { DIDDefinition } from "@ecu/did-registry";
import { IDIDRegistry } from "../../domain/ports/did-registry.port";

export class DidRegistryAdapter implements IDIDRegistry {
  private didRegistry: DIDRegistry;

  constructor() {
    this.didRegistry = new DIDRegistry();
  }

  /**
   * Get a DID definition by ID
   * Delegates to DIDRegistry.getDefinition()
   */
  get(id: number): any {
    return this.didRegistry.getDefinition(id);
  }

  /**
   * Set (register) a DID definition
   * Delegates to DIDRegistry.register()
   */
  set(id: number, definition: any): void {
    // Ensure the ID matches
    const didDefinition: DIDDefinition = {
      ...definition,
      id,
    };
    this.didRegistry.register(didDefinition);
  }

  /**
   * Clear all DID values (not definitions)
   * Delegates to DIDRegistry.clearAll()
   */
  clearAll(): void {
    this.didRegistry.clearAll();
  }
}