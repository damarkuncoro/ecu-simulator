/**
 * @ecu/dtc-utils
 * Shared DTC-related utilities (DRY principle)
 */

/**
 * SAE J2012 / ISO 15031-6 DTC category detection
 * Extracts category from 5-bit (0-31) or 7-bit (0-127) prefix
 */
export function detectCategory(code: number): "powertrain" | "chassis" | "body" | "network" | "unknown" {
  const prefix = code >> 16; // top 5 or 7 bits depending on code size

  if (prefix >= 0 && prefix <= 0x1F) {
    // 0x00–0x1F → powertrain (0x00–0x3F when using 2-byte code)
    return "powertrain";
  }
  if (prefix >= 0x20 && prefix <= 0x3F) {
    // 0x20–0x3F → chassis
    return "chassis";
  }
  if (prefix >= 0x40 && prefix <= 0x5F) {
    // 0x40–0x5F → body
    return "body";
  }
  if (prefix >= 0x60 && prefix <= 0x7F) {
    // 0x60–0x7F → network
    return "network";
  }

  return "unknown";
}
