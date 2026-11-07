import { supabase } from "@/integrations/supabase/client";

export const DIRECTORY_STORAGE_BUCKET = "directory_assets";
const DEFAULT_SIGNED_URL_TTL_SECONDS = 3600;

interface CachedSignedUrl {
  signedUrl: string;
  expiresAt: number;
}

const directorySignedUrlCache = new Map<string, CachedSignedUrl>();

/**
 * Extracts a relative storage object path inside `directory_assets` (or specified bucket)
 * from a canonical `storage://` URI, a legacy Supabase Storage public/signed URL,
 * or a relative bucket path. Returns `null` for external non-storage URLs.
 */
export function extractDirectoryStoragePath(
  urlOrPath: string | null | undefined,
  bucket: string = DIRECTORY_STORAGE_BUCKET
): string | null {
  if (!urlOrPath || typeof urlOrPath !== "string") return null;
  const trimmed = urlOrPath.trim();
  if (!trimmed || trimmed === "#") return null;

  const canonicalPrefix = `storage://${bucket}/`;
  if (trimmed.startsWith(canonicalPrefix)) {
    return trimmed.slice(canonicalPrefix.length).split("?")[0] || null;
  }

  const markers = [
    `/object/public/${bucket}/`,
    `/object/sign/${bucket}/`,
    `/object/authenticated/${bucket}/`,
  ];

  for (const marker of markers) {
    const idx = trimmed.indexOf(marker);
    if (idx !== -1) {
      const extracted = trimmed.slice(idx + marker.length).split("?")[0];
      return extracted ? decodeURIComponent(extracted) : null;
    }
  }

  if (
    !trimmed.startsWith("http://") &&
    !trimmed.startsWith("https://") &&
    !trimmed.startsWith("blob:") &&
    !trimmed.startsWith("data:") &&
    !trimmed.startsWith("/")
  ) {
    return trimmed.split("?")[0] || null;
  }

  return null;
}

export function toCanonicalDirectoryStorageUri(
  storagePath: string,
  bucket: string = DIRECTORY_STORAGE_BUCKET
): string {
  const cleanPath = storagePath.replace(/^\/+/, "");
  return `storage://${bucket}/${cleanPath}`;
}

/**
 * Resolves a directory media reference (`storage://...`, storage path, or legacy storage URL)
 * to an authorized, time-bounded signed URL that respects `storage.objects` RLS policies.
 * External third-party URLs (e.g. curated demo Unsplash/SoundHelix links) are returned as-is.
 */
export async function resolveDirectoryMediaUrl(
  urlOrPath: string | null | undefined,
  options?: { bucket?: string; expiresIn?: number }
): Promise<string> {
  if (!urlOrPath || typeof urlOrPath !== "string") return "";
  const trimmed = urlOrPath.trim();
  if (!trimmed || trimmed === "#") return trimmed;

  const bucket = options?.bucket || DIRECTORY_STORAGE_BUCKET;
  const expiresIn = options?.expiresIn ?? DEFAULT_SIGNED_URL_TTL_SECONDS;
  const storagePath = extractDirectoryStoragePath(trimmed, bucket);

  if (!storagePath) {
    return trimmed;
  }

  const cacheKey = `${bucket}:${storagePath}`;
  const cached = directorySignedUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 30_000) {
    return cached.signedUrl;
  }

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, expiresIn);

    if (error || !data?.signedUrl) {
      directorySignedUrlCache.delete(cacheKey);
      return "";
    }

    directorySignedUrlCache.set(cacheKey, {
      signedUrl: data.signedUrl,
      expiresAt: Date.now() + expiresIn * 1000,
    });
    return data.signedUrl;
  } catch {
    directorySignedUrlCache.delete(cacheKey);
    return "";
  }
}

export async function resolveDirectoryMediaUrls(
  urlsOrPaths: string[] | null | undefined,
  options?: { bucket?: string; expiresIn?: number }
): Promise<string[]> {
  if (!Array.isArray(urlsOrPaths) || urlsOrPaths.length === 0) return [];
  const resolved = await Promise.all(
    urlsOrPaths.map((item) => resolveDirectoryMediaUrl(item, options))
  );
  return resolved.filter(Boolean);
}

export function invalidateDirectoryUrlCache(pathOrUserFragment?: string): void {
  if (!pathOrUserFragment) {
    directorySignedUrlCache.clear();
    return;
  }
  for (const key of Array.from(directorySignedUrlCache.keys())) {
    if (key.includes(pathOrUserFragment)) {
      directorySignedUrlCache.delete(key);
    }
  }
}

/**
 * Cleans up newly uploaded storage objects when a subsequent metadata insert fails (R7-01).
 */
export async function cleanupUploadedStorageObjects(
  paths: string[],
  bucket: string = DIRECTORY_STORAGE_BUCKET
): Promise<void> {
  const validPaths = Array.from(
    new Set(paths.map((p) => p?.trim()).filter((p): p is string => Boolean(p)))
  );
  if (validPaths.length === 0) return;

  try {
    await supabase.storage.from(bucket).remove(validPaths);
  } catch (cleanupErr) {
    console.error("Failed to clean up orphaned storage objects:", cleanupErr);
  }
}

