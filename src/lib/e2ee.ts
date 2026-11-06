/**
 * End-to-End Encryption Utility
 * 
 * Uses Web Crypto API for:
 * 1. ECDH (P-256) Key generation
 * 2. Key derivation (AES-GCM)
 * 3. Message encryption & decryption
 */

const getCrypto = () => {
  if (typeof globalThis !== "undefined" && globalThis.crypto) return globalThis.crypto;
  if (typeof window !== "undefined" && window.crypto) return window.crypto;
  throw new Error("Web Crypto API is not available in this environment.");
};

export async function generateKeyPair() {
  const crypto = getCrypto();
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );

  const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

  return { publicKeyJwk, privateKeyJwk };
}

export async function importPublicKey(jwk: JsonWebKey) {
  const crypto = getCrypto();
  return await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
}

export async function importPrivateKey(jwk: JsonWebKey) {
  const crypto = getCrypto();
  return await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );
}

export async function deriveAESKey(privateKey: CryptoKey, publicKey: CryptoKey) {
  const crypto = getCrypto();
  return await crypto.subtle.deriveKey(
    { name: "ECDH", public: publicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

// Helper to convert ArrayBuffer to Base64
export function bufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof btoa !== "undefined" ? btoa(binary) : Buffer.from(binary, "binary").toString("base64");
}

// Helper to convert Base64 to ArrayBuffer
export function base64ToBuffer(base64: string) {
  const binary = typeof atob !== "undefined" ? atob(base64) : Buffer.from(base64, "base64").toString("binary");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function encryptMessage(aesKey: CryptoKey, plaintext: string) {
  const crypto = getCrypto();
  const enc = new TextEncoder();
  const encoded = enc.encode(plaintext);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    aesKey,
    encoded
  );

  return {
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(ciphertext)
  };
}

export async function decryptMessage(aesKey: CryptoKey, ivBase64: string, ciphertextBase64: string) {
  const crypto = getCrypto();
  const iv = base64ToBuffer(ivBase64);
  const ciphertext = base64ToBuffer(ciphertextBase64);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    aesKey,
    ciphertext
  );

  const dec = new TextDecoder();
  return dec.decode(decrypted);
}

/**
 * Mandatory production E2EE send helper.
 * Fails closed immediately if sender private key or recipient public key is absent or invalid.
 * Under no circumstances does this function allow plaintext transmission.
 */
export async function encryptForRecipientOrThrow(params: {
  senderPrivateKey: CryptoKey | null | undefined;
  recipientPublicKeyJwkOrStr: string | JsonWebKey | null | undefined;
  plaintext: string;
}): Promise<{ iv: string; ciphertext: string; envelope: string }> {
  const { senderPrivateKey, recipientPublicKeyJwkOrStr, plaintext } = params;

  if (!senderPrivateKey) {
    throw new Error("E2EE_KEY_UNAVAILABLE: Sender private key is missing or not yet initialized.");
  }

  if (!recipientPublicKeyJwkOrStr) {
    throw new Error("E2EE_RECIPIENT_KEY_UNAVAILABLE: Recipient has not published an active encryption key.");
  }

  let jwk: JsonWebKey;
  if (typeof recipientPublicKeyJwkOrStr === "string") {
    try {
      jwk = JSON.parse(recipientPublicKeyJwkOrStr);
    } catch {
      throw new Error("E2EE_INVALID_RECIPIENT_KEY: Recipient public key is malformed.");
    }
  } else {
    jwk = recipientPublicKeyJwkOrStr;
  }

  if (!jwk || !jwk.kty || jwk.kty !== "EC") {
    throw new Error("E2EE_INVALID_RECIPIENT_KEY: Recipient key is not a valid ECDH P-256 key.");
  }

  const otherPubKey = await importPublicKey(jwk);
  const sharedKey = await deriveAESKey(senderPrivateKey, otherPubKey);
  const encrypted = await encryptMessage(sharedKey, plaintext);
  const envelope = `ENCRYPTED:${encrypted.iv}:${encrypted.ciphertext}`;

  return {
    iv: encrypted.iv,
    ciphertext: encrypted.ciphertext,
    envelope
  };
}
