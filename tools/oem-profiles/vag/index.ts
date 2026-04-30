/**
 * VAG (Volkswagen Group) OEM Profile
 * Implements VAG-specific protocols, DIDs, and configurations
 */

import { DIDDefinition } from "@ecu/did-registry";

export interface VAGConfig {
  protocol: "kwp2000" | "uds";
  supportsXCP: boolean;
  longCodingSupport: boolean;
  adaptationChannels: string[];
}

export const VAG_DIDS: Record<number, DIDDefinition> = {
  // VAG-specific DIDs
  0xf101: {
    id: 0xf101,
    name: "VW HW Number",
    description: "Volkswagen hardware part number",
    length: 12,
    readonly: true,
    category: "system",
  },
  0xf102: {
    id: 0xf102,
    name: "VW SW Number",
    description: "Volkswagen software version",
    length: 10,
    readonly: true,
    category: "system",
  },
  0xf103: {
    id: 0xf103,
    name: "VW Coding",
    description: "ECU coding data",
    length: 4,
    readonly: false,
    category: "configuration",
  },
  0xf104: {
    id: 0xf104,
    name: "VW Adaptation",
    description: "Adaptation channel values",
    length: 0, // Variable
    readonly: false,
    category: "configuration",
  },
  // VAG-specific sensor DIDs
  0x2000: {
    id: 0x2000,
    name: "Engine Temperature Modelled",
    description: "Modelled engine coolant temperature",
    length: 1,
    unit: "°C",
    readonly: true,
    category: "sensor",
  },
  0x2001: {
    id: 0x2001,
    name: "Fuel Consumption",
    description: "Current fuel consumption rate",
    length: 2,
    unit: "L/h",
    readonly: true,
    category: "sensor",
  },
};

export const VAG_DEFAULT_CONFIG: VAGConfig = {
  protocol: "kwp2000",
  supportsXCP: false,
  longCodingSupport: true,
  adaptationChannels: ["00001", "00002", "00003"], // Common adaptation channels
};

export const VAG_ECU_FAMILIES = [
  "ED1",
  "EDC15",
  "EDC16",
  "EDC17", // Diesel
  "MPI",
  "MPi2",
  "MPi3", // Gasoline
  "ME7",
  "MED9",
  "MED17", // Gasoline direct injection
  "BSG", // Belt-driven starter generator
];

export const VAG_TRANSPORT_CONFIGS = {
  kwp2000: {
    baudRate: 10400,
    initSequence: Buffer.from([0x81, 0x11, 0xf1, 0x81, 0x04]), // VAG specific init
  },
  uds: {
    baudRate: 500000,
    canId: 0x7e0, // VAG UDS tester present
  },
};
