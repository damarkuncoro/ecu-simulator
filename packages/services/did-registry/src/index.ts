/**
 * @ecu/did-registry
 * Diagnostic Identifier (DID) registry with typed definitions.
 * Supports SAE J1979 and ISO 14229-1 DID definitions.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DIDDefinition {
  id: number;
  name: string;
  description: string;
  length: number; // Expected data length in bytes
  unit?: string;
  min?: number;
  max?: number;
  readonly: boolean; // true for read-only DIDs
  category: "system" | "sensor" | "actuator" | "configuration" | "diagnostic";
}

export interface DIDValue {
  id: number;
  data: Buffer;
  timestamp: Date;
}

// ─── Standard DID Definitions ────────────────────────────────────────────────

const STANDARD_DIDS: Record<number, DIDDefinition> = {
  // System Information
  0xf100: {
    id: 0xf100,
    name: "ECU Serial Number",
    description: "ECU hardware serial number",
    length: 17, // ASCII string
    readonly: true,
    category: "system",
  },
  0xf101: {
    id: 0xf101,
    name: "ECU Hardware Number",
    description: "ECU hardware part number",
    length: 10,
    readonly: true,
    category: "system",
  },
  0xf102: {
    id: 0xf102,
    name: "ECU Software Number",
    description: "ECU software version number",
    length: 10,
    readonly: true,
    category: "system",
  },
  0xf103: {
    id: 0xf103,
    name: "ECU Software Version",
    description: "ECU software version string",
    length: 8,
    readonly: true,
    category: "system",
  },

  // Sensor Data
  0x0001: {
    id: 0x0001,
    name: "Engine Coolant Temperature",
    description: "Current engine coolant temperature",
    length: 1,
    unit: "°C",
    min: -40,
    max: 215,
    readonly: true,
    category: "sensor",
  },
  0x0002: {
    id: 0x0002,
    name: "Engine RPM",
    description: "Current engine revolutions per minute",
    length: 2,
    unit: "RPM",
    min: 0,
    max: 16383.75,
    readonly: true,
    category: "sensor",
  },
  0x0003: {
    id: 0x0003,
    name: "Vehicle Speed",
    description: "Current vehicle speed",
    length: 2,
    unit: "km/h",
    min: 0,
    max: 255,
    readonly: true,
    category: "sensor",
  },
  0x0004: {
    id: 0x0004,
    name: "Engine Load",
    description: "Calculated engine load value",
    length: 1,
    unit: "%",
    min: 0,
    max: 100,
    readonly: true,
    category: "sensor",
  },

  // Configuration Data
  0x0100: {
    id: 0x0100,
    name: "Idle Speed Setpoint",
    description: "Configured idle speed",
    length: 2,
    unit: "RPM",
    min: 400,
    max: 2000,
    readonly: false,
    category: "configuration",
  },
  0x0101: {
    id: 0x0101,
    name: "Fuel System Configuration",
    description: "Fuel system type and settings",
    length: 4,
    readonly: false,
    category: "configuration",
  },

  // Diagnostic Data
  0x0200: {
    id: 0x0200,
    name: "Diagnostic Trouble Codes",
    description: "Current DTC status and codes",
    length: 0, // Variable length
    readonly: true,
    category: "diagnostic",
  },
  0x0201: {
    id: 0x0201,
    name: "Freeze Frame Data",
    description: "DTC freeze frame snapshot",
    length: 0, // Variable length
    readonly: true,
    category: "diagnostic",
  },
};

// ─── DID Registry ────────────────────────────────────────────────────────────

export class DIDRegistry {
  private definitions = new Map<number, DIDDefinition>();
  private values = new Map<number, DIDValue>();

  constructor() {
    // Load standard DIDs
    Object.values(STANDARD_DIDS).forEach((def) => {
      this.definitions.set(def.id, def);
    });
  }

  /** Register a custom DID definition */
  register(did: DIDDefinition): void {
    this.definitions.set(did.id, did);
  }

  /** Get DID definition by ID */
  getDefinition(id: number): DIDDefinition | undefined {
    return this.definitions.get(id);
  }

  /** Get all registered DID definitions */
  getAllDefinitions(): DIDDefinition[] {
    return Array.from(this.definitions.values());
  }

  /** Get DID definitions by category */
  getDefinitionsByCategory(
    category: DIDDefinition["category"],
  ): DIDDefinition[] {
    return this.getAllDefinitions().filter((def) => def.category === category);
  }

  /** Set DID value */
  setValue(id: number, data: Buffer): void {
    const definition = this.definitions.get(id);
    if (!definition) {
      throw new Error(`DID ${id.toString(16)} not registered`);
    }

    if (definition.readonly) {
      throw new Error(`DID ${id.toString(16)} is read-only`);
    }

    if (definition.length > 0 && data.length !== definition.length) {
      throw new Error(
        `DID ${id.toString(16)} expects ${definition.length} bytes, got ${data.length}`,
      );
    }

    this.values.set(id, {
      id,
      data: Buffer.from(data), // Copy buffer
      timestamp: new Date(),
    });
  }

  /** Get DID value */
  getValue(id: number): DIDValue | undefined {
    return this.values.get(id);
  }

  /** Get all DID values */
  getAllValues(): DIDValue[] {
    return Array.from(this.values.values());
  }

  /** Clear DID value */
  clearValue(id: number): void {
    this.values.delete(id);
  }

  /** Clear all DID values */
  clearAll(): void {
    this.values.clear();
  }

  /** Validate DID data against definition */
  validateData(id: number, data: Buffer): boolean {
    const definition = this.definitions.get(id);
    if (!definition) return false;

    if (definition.length > 0 && data.length !== definition.length) {
      return false;
    }

    // Additional validation for known DIDs
    if (definition.min !== undefined || definition.max !== undefined) {
      const value = data.readUIntBE(0, data.length);
      if (definition.min !== undefined && value < definition.min) return false;
      if (definition.max !== undefined && value > definition.max) return false;
    }

    return true;
  }
}

// ─── Singleton Instance ──────────────────────────────────────────────────────

export const didRegistry = new DIDRegistry();
