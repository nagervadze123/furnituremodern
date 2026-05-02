// lib/security/nonce.ts
//
// Per-request CSP nonce generator. Runs in the Edge runtime (proxy.ts).
//
// Why 16 bytes?
//   The W3C CSP spec recommends "at least 128 bits of entropy" for nonces.
//   16 bytes = 128 bits, base64-encoded that's 24 URL-safe characters.
//
// Why crypto.getRandomValues(Uint8Array) and not crypto.randomUUID()?
//   Both are cryptographically secure. getRandomValues is the explicit
//   "Web Crypto API" call the Phase 3 spec asks for, and it produces a
//   shorter token that's easier to grep for in browser dev tools.

export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // btoa expects a binary string. String.fromCharCode on a 16-byte array
  // is fine — no surrogate-pair concerns at this size.
  return btoa(String.fromCharCode(...bytes));
}
