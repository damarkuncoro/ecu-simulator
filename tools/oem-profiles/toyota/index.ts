/**
 * Toyota OEM Profile
 * Implements Toyota-specific protocols, DIDs, and configurations
 */

import { DIDDefinition } from "@ecu/did-registry";

export interface ToyotaConfig {
  protocol: "iso9141" | "uds";
  supportsEnhanced: boolean;
  subaruMode: boolean; // For Subaru vehicles
  diagnosticLines: string[]; // K-Line/L-Line configurations
}

export const TOYOTA_DIDS: Record<number, DIDDefinition> = {
  // Toyota-specific DIDs
  0xf101: {
    id: 0xf101,
    name: "Toyota HW Number",
    description: "Toyota hardware part number",
    length: 12,
    readonly: true,
    category: "system",
  },
  0xf102: {
    id: 0xf102,
    name: "Toyota SW Number",
    description: "Toyota software calibration ID",
    length: 12,
    readonly: true,
    category: "system",
  },
  0xf103: {
    id: 0xf103,
    name: "Toyota VIN",
    description: "Vehicle Identification Number",
    length: 17,
    readonly: true,
    category: "system",
  },
  // Toyota-specific sensor DIDs
  0x0001: {
    id: 0x0001,
    name: "Engine Coolant Temp",
    description: "Engine coolant temperature",
    length: 1,
    unit: "°C",
    min: -40,
    max: 140,
    readonly: true,
    category: "sensor",
  },
  0x0002: {
    id: 0x0002,
    name: "Engine RPM",
    description: "Engine revolutions per minute",
    length: 2,
    unit: "RPM",
    min: 0,
    max: 8000,
    readonly: true,
    category: "sensor",
  },
  0x0003: {
    id: 0x0003,
    name: "Vehicle Speed",
    description: "Vehicle speed",
    length: 1,
    unit: "km/h",
    min: 0,
    max: 255,
    readonly: true,
    category: "sensor",
  },
  0x0004: {
    id: 0x0004,
    name: "Throttle Position",
    description: "Throttle valve position",
    length: 1,
    unit: "%",
    min: 0,
    max: 100,
    readonly: true,
    category: "sensor",
  },
  0x0005: {
    id: 0x0005,
    name: "Mass Air Flow",
    description: "Mass air flow rate",
    length: 2,
    unit: "g/s",
    readonly: true,
    category: "sensor",
  },
};

export const TOYOTA_DEFAULT_CONFIG: ToyotaConfig = {
  protocol: "iso9141",
  supportsEnhanced: false,
  subaruMode: false,
  diagnosticLines: ["K-Line"], // Toyota typically uses K-Line only
};

export const TOYOTA_ECU_FAMILIES = [
  "1AZ",
  "2AZ",
  "2ZR", // Gasoline engines
  "1AD",
  "2AD", // Diesel engines
  "1NZ",
  "2NZ", // Hybrid engines
  "ECT",
  "ECT-i", // Engine control systems
];

export const TOYOTA_TRANSPORT_CONFIGS = {
  iso9141: {
    baudRate: 10400,
    initSequence: Buffer.from([0x81, 0x11, 0xf1, 0x81, 0x04]), // Toyota specific init
    w1: 300, // Wake-up pulse timing
    w2: 25, // Post-wake-up delay
    w3: 25, // Address wait time
    w4: 25, // Byte wait time
    w5: 300, // Wait time
  },
  uds: {
    baudRate: 500000,
    canId: 0x7e0,
  },
};
