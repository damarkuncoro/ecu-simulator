/**
 * Honda OEM Profile
 * Implements Honda-specific protocols, DIDs, and configurations
 */

import { DIDDefinition } from "@ecu/did-registry";

export interface HondaConfig {
  protocol: "iso9141" | "uds";
  supportsHDS: boolean; // Honda Diagnostic System support
  pgmFiSupport: boolean; // PGM-FI (Programmed Fuel Injection) support
  srsSupport: boolean; // Supplemental Restraint System support
  absSupport: boolean; // Anti-lock Braking System support
}

export const HONDA_DIDS: Record<number, DIDDefinition> = {
  // Honda-specific DIDs
  0xf101: {
    id: 0xf101,
    name: "Honda HW Number",
    description: "Honda hardware part number",
    length: 10,
    readonly: true,
    category: "system",
  },
  0xf102: {
    id: 0xf102,
    name: "Honda SW Number",
    description: "Honda software calibration ID",
    length: 8,
    readonly: true,
    category: "system",
  },
  0xf103: {
    id: 0xf103,
    name: "Honda VIN",
    description: "Vehicle Identification Number",
    length: 17,
    readonly: true,
    category: "system",
  },
  0xf104: {
    id: 0xf104,
    name: "Honda Serial Number",
    description: "ECU serial number",
    length: 10,
    readonly: true,
    category: "system",
  },
  // Honda-specific sensor DIDs
  0x0001: {
    id: 0x0001,
    name: "ECT Sensor",
    description: "Engine coolant temperature sensor",
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
    description: "Engine speed",
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
    description: "Vehicle speed sensor",
    length: 1,
    unit: "km/h",
    min: 0,
    max: 200,
    readonly: true,
    category: "sensor",
  },
  0x0004: {
    id: 0x0004,
    name: "TPS",
    description: "Throttle position sensor",
    length: 1,
    unit: "%",
    min: 0,
    max: 100,
    readonly: true,
    category: "sensor",
  },
  0x0005: {
    id: 0x0005,
    name: "MAP Sensor",
    description: "Manifold absolute pressure",
    length: 1,
    unit: "kPa",
    min: 0,
    max: 255,
    readonly: true,
    category: "sensor",
  },
  0x0006: {
    id: 0x0006,
    name: "IAT Sensor",
    description: "Intake air temperature",
    length: 1,
    unit: "°C",
    min: -40,
    max: 140,
    readonly: true,
    category: "sensor",
  },
};

export const HONDA_DEFAULT_CONFIG: HondaConfig = {
  protocol: "iso9141",
  supportsHDS: false,
  pgmFiSupport: true,
  srsSupport: false,
  absSupport: false,
};

export const HONDA_ECU_FAMILIES = [
  "P28",
  "P30",
  "P72", // OBD1 ECUs
  "P2E",
  "P2P",
  "P2T", // OBD2 ECUs
  "K20",
  "K24", // K-series engines
  "J30",
  "J32", // J-series engines
  "PGM-FI", // Honda fuel injection system
];

export const HONDA_TRANSPORT_CONFIGS = {
  iso9141: {
    baudRate: 10400,
    initSequence: Buffer.from([0x81, 0x11, 0xf1, 0x81, 0x04]),
    w1: 300, // Wake-up timing
    w2: 25,
    w3: 25,
    w4: 25,
    w5: 300,
  },
  uds: {
    baudRate: 500000,
    canId: 0x7e0,
  },
};
