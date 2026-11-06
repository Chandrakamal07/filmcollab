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

/**
 * Compute a deterministic key identifier for an ECDH P-256 public key JWK.
 */
export function computeKeyId(jwk: JsonWebKey | null | undefined): string {
  if (!jwk || !jwk.x || !jwk.y) return "default";
  return `${jwk.x.slice(0, 8)}_${jwk.y.slice(0, 8)}`;
}

export interface KeyringEntry {
  keyId: string;
  privateKeyJwk: JsonWebKey;
  publicKeyJwk: JsonWebKey;
  createdAt: number;
}

/**
 * Retrieve all historical keypairs stored for a profile in the local keyring.
 */
export function getUserKeyring(profileId: string): KeyringEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(`e2ee_keyring_${profileId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Append or preserve a keypair inside the profile's non-destructive local keyring.
 */
export function registerKeyInRing(profileId: string, privateKeyJwk: JsonWebKey, publicKeyJwk: JsonWebKey): string {
  const keyId = computeKeyId(publicKeyJwk);
  if (typeof localStorage === "undefined") return keyId;
  const ring = getUserKeyring(profileId);
  if (!ring.some((e) => e.keyId === keyId || (e.privateKeyJwk?.d && e.privateKeyJwk.d === privateKeyJwk.d))) {
    ring.unshift({
      keyId,
      privateKeyJwk,
      publicKeyJwk,
      createdAt: Date.now()
    });
    localStorage.setItem(`e2ee_keyring_${profileId}`, JSON.stringify(ring));
  }
  return keyId;
}

/**
 * Decrypt an ENCRYPTED:... envelope using the active private key or any historical key in the profile's keyring.
 */
export async function decryptEnvelopeWithKeyring(params: {
  envelope: string;
  recipientProfileId?: string;
  primaryPrivateKey?: CryptoKey | null;
  senderPublicKeyJwkOrStr?: string | JsonWebKey | null | undefined;
  peerPublicKeyJwkOrStr?: string | JsonWebKey | null | undefined;
  keyring?: Array<{ keyId?: string; privateKeyJwk: JsonWebKey; publicKeyJwk?: JsonWebKey; createdAt?: number | string }>;
}): Promise<string> {
  const {
    envelope,
    recipientProfileId,
    primaryPrivateKey,
    senderPublicKeyJwkOrStr,
    peerPublicKeyJwkOrStr,
    keyring
  } = params;
  if (!envelope.startsWith("ENCRYPTED:")) return envelope;
  const effectiveSenderPub = senderPublicKeyJwkOrStr ?? peerPublicKeyJwkOrStr;
  if (!effectiveSenderPub) {
    throw new Error("E2EE_SENDER_KEY_UNAVAILABLE: Sender public key is missing.");
  }

  const jwk: JsonWebKey =
    typeof effectiveSenderPub === "string"
      ? JSON.parse(effectiveSenderPub)
      : effectiveSenderPub;
  const senderPubKey = await importPublicKey(jwk);

  const parts = envelope.split(":");
  const iv = parts.length === 4 ? parts[2] : parts[1];
  const cipher = parts.length === 4 ? parts[3] : parts[2];

  if (primaryPrivateKey) {
    try {
      const sharedKey = await deriveAESKey(primaryPrivateKey, senderPubKey);
      return await decryptMessage(sharedKey, iv, cipher);
    } catch {
      // Fall through to historical keyring
    }
  }

  const ring = keyring ?? (recipientProfileId ? getUserKeyring(recipientProfileId) : []);
  for (const entry of ring) {
    try {
      const privKey = await importPrivateKey(entry.privateKeyJwk);
      const sharedKey = await deriveAESKey(privKey, senderPubKey);
      return await decryptMessage(sharedKey, iv, cipher);
    } catch {
      // Try next historical key
    }
  }

  throw new Error("E2EE_DECRYPTION_FAILED: No matching key in keyring could decrypt the message.");
}

/**
 * Retrieve or generate a local ECDH P-256 keypair for a profile.
 * Stored safely in localStorage with profile ID namespace and non-destructive keyring history.
 */
export async function getOrInitUserE2EE(profileId: string) {
  let privKeyStr = typeof localStorage !== 'undefined' ? localStorage.getItem(`e2ee_priv_${profileId}`) : null;
  let pubKeyStr = typeof localStorage !== 'undefined' ? localStorage.getItem(`e2ee_pub_${profileId}`) : null;
  let privKey: CryptoKey;
  let pubKeyJwk: JsonWebKey;
  let privKeyJwk: JsonWebKey;

  if (privKeyStr && pubKeyStr) {
    privKeyJwk = JSON.parse(privKeyStr);
    pubKeyJwk = JSON.parse(pubKeyStr);
    privKey = await importPrivateKey(privKeyJwk);
  } else {
    const keys = await generateKeyPair();
    privKeyJwk = keys.privateKeyJwk;
    pubKeyJwk = keys.publicKeyJwk;
    privKeyStr = JSON.stringify(privKeyJwk);
    pubKeyStr = JSON.stringify(pubKeyJwk);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`e2ee_priv_${profileId}`, privKeyStr);
      localStorage.setItem(`e2ee_pub_${profileId}`, pubKeyStr);
    }
    privKey = await importPrivateKey(privKeyJwk);
  }

  const keyId = registerKeyInRing(profileId, privKeyJwk, pubKeyJwk);

  return { privKey, pubKeyStr, pubKeyJwk, keyId };
}
