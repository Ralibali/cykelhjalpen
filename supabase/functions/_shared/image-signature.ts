// Kontroll av bildfilers signatur (magic bytes) vid uppladdning.

/** Kontrollerar filens magiska bytes – content-type från klienten går att förfalska. */
export function matchesImageSignature(bytes: Uint8Array, type: string): boolean {
  const startsWith = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b)
  switch (type) {
    case 'image/jpeg': return startsWith([0xff, 0xd8, 0xff])
    case 'image/png': return startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    case 'image/webp': return startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)
    default: return false
  }
}
