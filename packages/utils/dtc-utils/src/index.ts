/**
 * @ecu/dtc-utils
 * Shared utilities for DTC (Diagnostic Trouble Code) operations.
 */

/**
 * SAE J2012 / ISO 15031-6 DTC category detection.
 * Extracts the top 2 bits of the high byte to determine category.
 *
 * DTC format: P (powertrain), C (chassis), B (body), U (network)
 * Bits 15-14 determine category:
 *   0b00 -> powertrain (P)
 *   0b01 -> chassis (C)
 *   0b10 -> body (B)
 *   0b11 -> network (U)
 */
export function detectCategory(code: number): 'powertrain' | 'chassis' | 'body' | 'network' {
  const high = (code >> 8) & 0xc0; // top 2 bits of high byte
  switch (high) {
    case 0x00:
      return 'powertrain';
    case 0x40:
      return 'chassis';
    case 0x80:
      return 'body';
    case 0xc0:
      return 'network';
    default:
      return 'powertrain'; // fallback for invalid codes
  }
}

/**
 * Convert a 16-bit DTC code to its string representation (e.g., P0300)
 */
export function codeToString(code: number): string {
  const category = detectCategory(code);
  const prefix = category === 'powertrain' ? 'P' :
                 category === 'chassis' ? 'C' :
                 category === 'body' ? 'B' : 'U';
  const number = code & 0x3fff; // lower 14 bits
  return `${prefix}${number.toString(16).toUpperCase().padStart(4, '0')}`;
}
