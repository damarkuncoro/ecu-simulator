/**
 * DIDRegistry Port - Defines the contract for DID registry operations
 */
export interface IDIDRegistry {
  /**
   * Get a DID definition by ID
   * @param id The DID ID
   * @returns The DID definition or undefined if not found
   */
  get(id: number): any; // We'll use the DIDDefinition type from @ecu/did-registry later, but for now any to avoid dependency

  /**
   * Set a DID definition
   * @param id The DID ID
   * @param definition The DID definition
   */
  set(id: number, definition: any): void;

  /**
   * Clear all DIDs
   */
  clearAll(): void;
}