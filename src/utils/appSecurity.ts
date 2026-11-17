const PIN_SALT = 'PurePDF::AppPinLock::v1::';

export function isValidFourDigitPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

export async function hashFourDigitPin(pin: string): Promise<string> {
  if (!isValidFourDigitPin(pin)) {
    throw new Error('PIN must be exactly 4 digits (0-9).');
  }
  const encoded = new TextEncoder().encode(`${PIN_SALT}${pin}`);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Deterministic fallback for restricted non-secure contexts
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < encoded.length; i++) {
    h1 ^= encoded[i];
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= encoded[i] + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

export async function verifyFourDigitPin(pin: string, expectedHash: string | null): Promise<boolean> {
  if (!expectedHash || !isValidFourDigitPin(pin)) {
    return false;
  }
  try {
    const actual = await hashFourDigitPin(pin);
    if (actual.length !== expectedHash.length) return false;
    let diff = 0;
    for (let i = 0; i < actual.length; i++) {
      diff |= actual.charCodeAt(i) ^ expectedHash.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}
