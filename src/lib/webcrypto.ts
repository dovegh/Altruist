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

const g = globalThis as { crypto?: MinimalCrypto };
const cryptoObject: MinimalCrypto = g.crypto ?? {};

if (!cryptoObject.getRandomValues) {
  cryptoObject.getRandomValues = ExpoCrypto.getRandomValues;
}

if (!cryptoObject.subtle?.digest) {
  cryptoObject.subtle = {
    ...cryptoObject.subtle,
    digest: (algorithm, data) => {
      const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
      const mapped = DIGESTS[name.toUpperCase()];
      if (!mapped) return Promise.reject(new Error(`webcrypto: unsupported digest ${name}`));
      return ExpoCrypto.digest(mapped, data);
    },
  };
}

g.crypto = cryptoObject;
