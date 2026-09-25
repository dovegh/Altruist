/**
 * The two WebCrypto calls supabase-js needs for PKCE, backed by expo-crypto.
 *
 * React Native has no `crypto` global. Without one, supabase-js does not fail —
 * it quietly degrades, which is worse:
 *
 *   - the PKCE verifier comes from `Math.random` instead of a secure source;
 *   - the challenge is sent `plain` instead of SHA-256, so the secret itself
 *     travels in the sign-in URL and whoever sees that URL can redeem the code.
 *
 * It said so only as a console warning. Import this before creating the client.
 * Anything the runtime already provides is left alone.
 */
import * as ExpoCrypto from 'expo-crypto';

const DIGESTS: Record<string, ExpoCrypto.CryptoDigestAlgorithm> = {
  'SHA-1': ExpoCrypto.CryptoDigestAlgorithm.SHA1,
  'SHA-256': ExpoCrypto.CryptoDigestAlgorithm.SHA256,
  'SHA-384': ExpoCrypto.CryptoDigestAlgorithm.SHA384,
  'SHA-512': ExpoCrypto.CryptoDigestAlgorithm.SHA512,
};

type MinimalCrypto = {
  getRandomValues?: typeof ExpoCrypto.getRandomValues;
  subtle?: { digest?: (algorithm: string | { name: string }, data: BufferSource) => Promise<ArrayBuffer> };
};

const digest: NonNullable<MinimalCrypto['subtle']>['digest'] = (algorithm, data) => {
  const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
  const mapped = DIGESTS[name.toUpperCase()];
  if (!mapped) return Promise.reject(new Error(`webcrypto: unsupported digest ${name}`));
  return ExpoCrypto.digest(mapped, data);
};

/**
 * Some runtimes ship a `crypto` that is frozen or read-only. Writing to it in
 * a release build would throw at import time and close the app on launch, so
 * every write is guarded, and a read-only global is replaced by a new object
 * only where that is allowed.
 */
try {
  const g = globalThis as { crypto?: MinimalCrypto };
  const existing = g.crypto;
  const needsRandom = !existing?.getRandomValues;
  const needsDigest = !existing?.subtle?.digest;

  if (needsRandom || needsDigest) {
    const patched: MinimalCrypto = {
      getRandomValues: existing?.getRandomValues?.bind(existing) ?? ExpoCrypto.getRandomValues,
      subtle: { ...(existing?.subtle ?? {}), digest: existing?.subtle?.digest ?? digest },
    };
    try {
      Object.defineProperty(globalThis, 'crypto', {
        value: patched,
        configurable: true,
        writable: true,
      });
    } catch {
      // Not configurable: supabase-js falls back to a plain PKCE challenge.
    }
  }
} catch {
  // Never let a missing crypto stop the app from starting.
}
