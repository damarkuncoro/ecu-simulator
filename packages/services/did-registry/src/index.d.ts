/**
 * @ecu/did-registry
 * Diagnostic Identifier (DID) registry with typed definitions.
 * Supports SAE J1979 and ISO 14229-1 DID definitions.
 */
export interface DIDDefinition {
    id: number;
    name: string;
    description: string;
    length: number;
    unit?: string;
    min?: number;
    max?: number;
    readonly: boolean;
    category: "system" | "sensor" | "actuator" | "configuration" | "diagnostic";
}
export interface DIDValue {
    id: number;
    data: Buffer;
    timestamp: Date;
}
export declare class DIDRegistry {
    private definitions;
    private values;
    constructor();
    /** Register a custom DID definition */
    register(did: DIDDefinition): void;
    /** Get DID definition by ID */
    getDefinition(id: number): DIDDefinition | undefined;
    /** Get all registered DID definitions */
    getAllDefinitions(): DIDDefinition[];
    /** Get DID definitions by category */
    getDefinitionsByCategory(category: DIDDefinition["category"]): DIDDefinition[];
    /** Set DID value */
    setValue(id: number, data: Buffer): void;
    /** Get DID value */
    getValue(id: number): DIDValue | undefined;
    /** Get all DID values */
    getAllValues(): DIDValue[];
    /** Clear DID value */
    clearValue(id: number): void;
    /** Clear all DID values */
    clearAll(): void;
    /** Validate DID data against definition */
    validateData(id: number, data: Buffer): boolean;
}
export declare const didRegistry: DIDRegistry;
//# sourceMappingURL=index.d.ts.map