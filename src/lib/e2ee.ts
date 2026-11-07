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

export async function encryptMessage(aesKey: CryptoKey, plaintext: string, additionalDataStr?: string) {
  const crypto = getCrypto();
  const enc = new TextEncoder();
  const encoded = enc.encode(plaintext);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const algorithm: AesGcmParams = {
    name: "AES-GCM",
    iv,
    ...(additionalDataStr ? { additionalData: enc.encode(additionalDataStr) } : {})
  };

  const ciphertext = await crypto.subtle.encrypt(
    algorithm,
    aesKey,
    encoded
  );

  return {
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(ciphertext)
  };
}

export async function decryptMessage(
  aesKey: CryptoKey,
  ivBase64: string,
  ciphertextBase64: string,
  additionalDataStr?: string
) {
  const crypto = getCrypto();
  const enc = new TextEncoder();
  const iv = base64ToBuffer(ivBase64);
  const ciphertext = base64ToBuffer(ciphertextBase64);
  const algorithm: AesGcmParams = {
    name: "AES-GCM",
    iv,
    ...(additionalDataStr ? { additionalData: enc.encode(additionalDataStr) } : {})
  };

  const decrypted = await crypto.subtle.decrypt(
    algorithm,
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
  keyId?: string | null;
  includeKeyMetadata?: boolean;
}): Promise<{ iv: string; ciphertext: string; envelope: string; keyId: string }> {
  const { senderPrivateKey, recipientPublicKeyJwkOrStr, plaintext, keyId, includeKeyMetadata } = params;

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

  const resolvedKeyId = keyId || computeKeyId(jwk);
  const otherPubKey = await importPublicKey(jwk);
  const sharedKey = await deriveAESKey(senderPrivateKey, otherPubKey);

  if (includeKeyMetadata || keyId) {
    const aadHeader = `ENCRYPTED:${resolvedKeyId}`;
    const encrypted = await encryptMessage(sharedKey, plaintext, aadHeader);
    const envelope = `${aadHeader}:${encrypted.iv}:${encrypted.ciphertext}`;
    return {
      iv: encrypted.iv,
      ciphertext: encrypted.ciphertext,
      envelope,
      keyId: resolvedKeyId
    };
  }

  const encrypted = await encryptMessage(sharedKey, plaintext);
  const envelope = `ENCRYPTED:${encrypted.iv}:${encrypted.ciphertext}`;

  return {
    iv: encrypted.iv,
    ciphertext: encrypted.ciphertext,
    envelope,
    keyId: resolvedKeyId
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

function parseCandidateJwk(raw: unknown): JsonWebKey | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && parsed.kty === "EC" ? (parsed as JsonWebKey) : null;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (obj.kty === "EC") return obj as unknown as JsonWebKey;
    if (obj.publicKey) return parseCandidateJwk(obj.publicKey);
    if (obj.key) return parseCandidateJwk(obj.key);
  }
  return null;
}

/**
 * Decrypt an ENCRYPTED:... envelope using the active private key or any historical key in the profile's keyring,
 * while also trying any rotated historical public keys of the peer (`peerPublicKeyHistory`) and authenticating
 * any 4-part key metadata header (`ENCRYPTED:<keyId>:<iv>:<cipher>`).
 */
export async function decryptEnvelopeWithKeyring(params: {
  envelope: string;
  recipientProfileId?: string;
  primaryPrivateKey?: CryptoKey | null;
  primaryPublicKeyJwk?: JsonWebKey | string | null;
  senderPublicKeyJwkOrStr?: string | JsonWebKey | null | undefined;
  peerPublicKeyJwkOrStr?: string | JsonWebKey | null | undefined;
  peerPublicKeyHistory?: Array<unknown> | null | undefined;
  keyring?: Array<{ keyId?: string; privateKeyJwk: JsonWebKey; publicKeyJwk?: JsonWebKey; createdAt?: number | string }>;
}): Promise<string> {
  const {
    envelope,
    recipientProfileId,
    primaryPrivateKey,
    primaryPublicKeyJwk,
    senderPublicKeyJwkOrStr,
    peerPublicKeyJwkOrStr,
    peerPublicKeyHistory,
    keyring
  } = params;
  if (!envelope.startsWith("ENCRYPTED:")) return envelope;

  const candidatePeerJwks: JsonWebKey[] = [];
  const seenPeerKeyIds = new Set<string>();
  const addPeerCandidate = (raw: unknown) => {
    const parsed = parseCandidateJwk(raw);
    if (!parsed) return;
    const id = computeKeyId(parsed);
    if (!seenPeerKeyIds.has(id)) {
      seenPeerKeyIds.add(id);
      candidatePeerJwks.push(parsed);
    }
  };

  addPeerCandidate(senderPublicKeyJwkOrStr ?? peerPublicKeyJwkOrStr);
  if (Array.isArray(peerPublicKeyHistory)) {
    for (const histItem of peerPublicKeyHistory) {
      addPeerCandidate(histItem);
    }
  }

  if (candidatePeerJwks.length === 0) {
    throw new Error("E2EE_SENDER_KEY_UNAVAILABLE: Sender public key is missing.");
  }

  const parts = envelope.split(":");
  if (parts.length !== 3 && parts.length !== 4) {
    throw new Error("E2EE_MALFORMED_ENVELOPE: Envelope format is invalid.");
  }

  const hasKeyHeader = parts.length === 4;
  const headerKeyId = hasKeyHeader ? parts[1] : null;
  const iv = hasKeyHeader ? parts[2] : parts[1];
  const cipher = hasKeyHeader ? parts[3] : parts[2];

  if (hasKeyHeader && (!headerKeyId || !headerKeyId.trim())) {
    throw new Error("E2EE_AUTHENTICATION_FAILED: Envelope key metadata header is empty.");
  }

  const ring = keyring ?? (recipientProfileId ? getUserKeyring(recipientProfileId) : []);
  const parsedPrimaryPub =
    parseCandidateJwk(primaryPublicKeyJwk) ??
    (recipientProfileId && typeof localStorage !== "undefined"
      ? parseCandidateJwk(localStorage.getItem(`e2ee_pub_${recipientProfileId}`))
      : null);
  const primaryKeyId = parsedPrimaryPub ? computeKeyId(parsedPrimaryPub) : null;

  // Build candidate recipient private keys paired with their known keyId
  const recipientKeyCandidates: Array<{ keyId: string | null; getCryptoKey: () => Promise<CryptoKey> }> = [];
  if (primaryPrivateKey) {
    recipientKeyCandidates.push({
      keyId: primaryKeyId,
      getCryptoKey: async () => primaryPrivateKey
    });
  }
  for (const entry of ring) {
    const entryKeyId = entry.keyId || (entry.publicKeyJwk ? computeKeyId(entry.publicKeyJwk) : null);
    recipientKeyCandidates.push({
      keyId: entryKeyId,
      getCryptoKey: async () => importPrivateKey(entry.privateKeyJwk)
    });
  }

  let headerMismatchDetected = false;

  for (const peerJwk of candidatePeerJwks) {
    const peerKeyId = computeKeyId(peerJwk);
    const peerCryptoKey = await importPublicKey(peerJwk);

    for (const recCandidate of recipientKeyCandidates) {
      if (hasKeyHeader && headerKeyId) {
        const matchesRecipientKey = Boolean(recCandidate.keyId && recCandidate.keyId === headerKeyId);
        const matchesPeerKey = peerKeyId === headerKeyId;
        if (!matchesRecipientKey && !matchesPeerKey) {
          headerMismatchDetected = true;
          continue;
        }
      }

      try {
        const privKey = await recCandidate.getCryptoKey();
        const sharedKey = await deriveAESKey(privKey, peerCryptoKey);
        if (hasKeyHeader && headerKeyId) {
          // Authenticate the header against AES-GCM AAD first
          const aadHeader = `ENCRYPTED:${headerKeyId}`;
          return await decryptMessage(sharedKey, iv, cipher, aadHeader);
        }
        return await decryptMessage(sharedKey, iv, cipher);
      } catch {
        // Try next candidate pair
      }
    }
  }

  if (hasKeyHeader && headerMismatchDetected) {
    throw new Error("E2EE_AUTHENTICATION_FAILED: Envelope key metadata does not match cryptographic key.");
  }

  throw new Error("E2EE_DECRYPTION_FAILED: No matching key in keyring could decrypt the message.");
}

/**
 * Retrieve or generate a local ECDH P-256 keypair for a profile.
 * Stored safely in localStorage with profile ID namespace and non-destructive keyring history.
 * If `existingRemotePublicKey` is provided and no local key exists in `localStorage`, sets
 * `requiresExplicitKeyRotation = true` so callers do not silently overwrite the server key without rotation awareness.
 */
export async function getOrInitUserE2EE(
  profileId: string,
  options?: { existingRemotePublicKey?: string | null; allowOverwriteRemoteKey?: boolean }
) {
  let privKeyStr = typeof localStorage !== "undefined" ? localStorage.getItem(`e2ee_priv_${profileId}`) : null;
  let pubKeyStr = typeof localStorage !== "undefined" ? localStorage.getItem(`e2ee_pub_${profileId}`) : null;
  let privKey: CryptoKey;
  let pubKeyJwk: JsonWebKey;
  let privKeyJwk: JsonWebKey;
  let requiresExplicitKeyRotation = false;

  if (privKeyStr && pubKeyStr) {
    privKeyJwk = JSON.parse(privKeyStr);
    pubKeyJwk = JSON.parse(pubKeyStr);
    privKey = await importPrivateKey(privKeyJwk);
    if (
      options?.existingRemotePublicKey &&
      options.existingRemotePublicKey !== pubKeyStr &&
      !options?.allowOverwriteRemoteKey
    ) {
      requiresExplicitKeyRotation = true;
    }
  } else {
    if (options?.existingRemotePublicKey && !options?.allowOverwriteRemoteKey) {
      requiresExplicitKeyRotation = true;
    }
    const keys = await generateKeyPair();
    privKeyJwk = keys.privateKeyJwk;
    pubKeyJwk = keys.publicKeyJwk;
    privKeyStr = JSON.stringify(privKeyJwk);
    pubKeyStr = JSON.stringify(pubKeyJwk);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(`e2ee_priv_${profileId}`, privKeyStr);
      localStorage.setItem(`e2ee_pub_${profileId}`, pubKeyStr);
    }
    privKey = await importPrivateKey(privKeyJwk);
  }

  const keyId = registerKeyInRing(profileId, privKeyJwk, pubKeyJwk);

  return { privKey, pubKeyStr, pubKeyJwk, keyId, requiresExplicitKeyRotation };
}

export interface SenderE2EEPublicationResult {
  ready: boolean;
  privKey: CryptoKey | null;
  pubKeyStr: string | null;
  pubKeyJwk: JsonWebKey | null;
  keyId: string | null;
  requiresExplicitKeyRotation: boolean;
  error?: string;
}

/**
 * Ensures the caller's E2EE keypair is initialized and its public key is verified-published
 * on `profiles.public_key` without silently rotating an existing remote device key.
 *
 * - If `existingRemotePublicKey` is present and differs from the local browser key, and
 *   `allowExplicitKeyRotation` is false, returns `ready: false` and `requiresExplicitKeyRotation: true`
 *   without overwriting `profiles.public_key`.
 * - If `existingRemotePublicKey` is absent or `allowExplicitKeyRotation` is true, publishes `pubKeyStr`
 *   to `profiles.public_key` and inspects `{ data, error }` so a PostgREST `42501` or 0-row update
 *   fails closed (`ready: false`, `privKey: null`).
 */
export async function ensureSenderE2EEPublicationReady(params: {
  supabaseClient: any;
  profileId: string;
  existingRemotePublicKey?: string | null;
  allowExplicitKeyRotation?: boolean;
}): Promise<SenderE2EEPublicationResult> {
  const { supabaseClient, profileId, allowExplicitKeyRotation = false } = params;
  if (!profileId) {
    return {
      ready: false,
      privKey: null,
      pubKeyStr: null,
      pubKeyJwk: null,
      keyId: null,
      requiresExplicitKeyRotation: false,
      error: "E2EE_SENDER_PROFILE_MISSING: Sender profile ID is required."
    };
  }

  let remotePublicKey: string | null = null;
  let remoteLookupState: "known_key" | "known_empty" | "lookup_failed" = "lookup_failed";

  if (params.existingRemotePublicKey !== undefined) {
    if (params.existingRemotePublicKey === null) {
      remoteLookupState = "known_empty";
      remotePublicKey = null;
    } else {
      remoteLookupState = "known_key";
      remotePublicKey = params.existingRemotePublicKey;
    }
  } else if (supabaseClient?.from) {
    try {
      const { data: profData, error: profErr } = await supabaseClient
        .from("profiles")
        .select("id, public_key")
        .eq("id", profileId)
        .maybeSingle();

      if (profErr) {
        remoteLookupState = "lookup_failed";
      } else if (profData) {
        if (profData.public_key) {
          remoteLookupState = "known_key";
          remotePublicKey = profData.public_key;
        } else {
          remoteLookupState = "known_empty";
          remotePublicKey = null;
        }
      } else {
        remoteLookupState = "lookup_failed";
      }
    } catch {
      remoteLookupState = "lookup_failed";
    }
  } else {
    remoteLookupState = "lookup_failed";
  }

  // R9-03: Fail closed on unverified/failed remote lookup without performing any unconfirmed key write
  if (remoteLookupState === "lookup_failed") {
    return {
      ready: false,
      privKey: null,
      pubKeyStr: null,
      pubKeyJwk: null,
      keyId: null,
      requiresExplicitKeyRotation: false,
      error: "E2EE_REMOTE_KEY_LOOKUP_FAILED: Failed to verify existing encryption key state from server."
    };
  }

  const { privKey, pubKeyStr, pubKeyJwk, keyId } = await getOrInitUserE2EE(profileId, {
    existingRemotePublicKey: remotePublicKey,
    allowOverwriteRemoteKey: allowExplicitKeyRotation
  });

  const remoteJwk = parseCandidateJwk(remotePublicKey);
  const remoteKeyId = remoteJwk ? computeKeyId(remoteJwk) : null;
  const keysMatch = Boolean(remoteKeyId && remoteKeyId === keyId) || remotePublicKey === pubKeyStr;

  if (remotePublicKey && !keysMatch && !allowExplicitKeyRotation) {
    return {
      ready: false,
      privKey,
      pubKeyStr,
      pubKeyJwk,
      keyId,
      requiresExplicitKeyRotation: true,
      error: "E2EE_KEY_ROTATION_REQUIRED: New device detected; confirm encryption key rotation before sending."
    };
  }

  // If remote key matches, local key is already synchronized on server; no write needed
  if (remotePublicKey && keysMatch) {
    return {
      ready: true,
      privKey,
      pubKeyStr,
      pubKeyJwk,
      keyId,
      requiresExplicitKeyRotation: false
    };
  }

  // Publish either verified initial key (known_empty) or explicitly confirmed rotation (!keysMatch && allowExplicitKeyRotation)
  if (remoteLookupState === "known_empty" || (!keysMatch && allowExplicitKeyRotation)) {
    try {
      let updateQuery = supabaseClient
        .from("profiles")
        .update({ public_key: pubKeyStr })
        .eq("id", profileId);

      // Race-safety: If initial publication without explicit rotation, enforce public_key IS NULL at write time
      if (!allowExplicitKeyRotation && typeof updateQuery?.is === "function") {
        updateQuery = updateQuery.is("public_key", null);
      }

      const updateRes =
        typeof updateQuery?.select === "function"
          ? await updateQuery.select("id, public_key")
          : await updateQuery;

      const updateErr = updateRes?.error;
      const updateData = updateRes?.data;
      const zeroRowsUpdated = Array.isArray(updateData) && updateData.length === 0;

      if (updateErr || zeroRowsUpdated) {
        return {
          ready: false,
          privKey: null,
          pubKeyStr: null,
          pubKeyJwk: null,
          keyId: null,
          requiresExplicitKeyRotation: Boolean(remotePublicKey && !keysMatch) || zeroRowsUpdated,
          error:
            updateErr?.message ||
            "E2EE_KEY_PUBLICATION_FAILED: Could not verify sender encryption key publication on server (key may have been updated concurrently)."
        };
      }
    } catch (err: any) {
      return {
        ready: false,
        privKey: null,
        pubKeyStr: null,
        pubKeyJwk: null,
        keyId: null,
        requiresExplicitKeyRotation: Boolean(remotePublicKey && !keysMatch),
        error:
          err?.message ||
          "E2EE_KEY_PUBLICATION_FAILED: Could not publish sender encryption key to server."
      };
    }
  }

  return {
    ready: true,
    privKey,
    pubKeyStr,
    pubKeyJwk,
    keyId,
    requiresExplicitKeyRotation: false
  };
}

