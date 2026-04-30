/**
 * @ecu/checksum
 * ISO 14230 / KWP2000 checksum utilities.
 */

/**
 * ISO 14230 standard checksum: XOR of all bytes, truncated to uint8.
 * Used by KWP2000 frames and ISO 9141 responses.
 */
export function iso14230Checksum(data: Buffer): number {
  let sum = 0;
  for (const byte of data) {
    sum ^= byte;
  }
  return sum & 0xff;
}

/**
 * Simple byte sum modulo 256 — used by some OEM variants.
 */
export function sumChecksum(data: Buffer): number {
  let sum = 0;
  for (const byte of data) {
    sum += byte;
  }
  return sum & 0xff;
}

/**
 * Validate a KWP2000 frame checksum.
 * Frame layout: [header...] [data...] [checksum]
 */
export function validateKwp2000Frame(frame: Buffer): boolean {
  if (frame.length < 2) return false;
  const payload = frame.subarray(0, frame.length - 1);
  const expected = iso14230Checksum(payload);
  return frame[frame.length - 1] === expected;
}

/**
 * Append checksum byte to a KWP2000 frame buffer.
 */
export function appendChecksum(data: Buffer): Buffer {
  const checksum = iso14230Checksum(data);
  return Buffer.concat([data, Buffer.from([checksum])]);
}

/**
 * CRC-16/CCITT for UDS/CAN transport layer (future use).
 */
export function crc16(data: Buffer): number {
  let crc = 0xffff;
  for (const byte of data) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }
  return crc;
}
