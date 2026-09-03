import { timingSafeEqual } from "crypto";

/** Constant-time compare for Bearer secrets (pads to equal length first). */
export function safeEqualSecret(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      // Still compare against itself to keep timing roughly constant.
      timingSafeEqual(bufA, bufA);
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
