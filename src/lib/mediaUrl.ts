/**
 * Stored file URLs are built from the uploaded file's name, and recordings
 * routinely arrive as "WhatsApp Audio 2026-10-12 at 11.18 AM.mpeg". Until the
 * backend started encoding them, those URLs went into the database with raw
 * spaces (and `+`, `(`, `#`), which no browser can fetch — the object was in
 * the bucket but the player had nothing to load.
 *
 * `toPlayableUrl` repairs such a URL on read, so submissions recorded before
 * the backend fix still play without a data migration.
 */

/** Percent-encode one path segment without double-encoding an already-escaped one. */
function reencodeSegment(segment: string): string {
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    // A stray `%` that is not a valid escape — encode the segment as it stands.
  }
  return encodeURIComponent(decoded);
}

export function toPlayableUrl(url?: string | null): string {
  if (!url) return '';

  try {
    const parsed = new URL(url);
    parsed.pathname = parsed.pathname.split('/').map(reencodeSegment).join('/');
    return parsed.toString();
  } catch {
    // Not an absolute URL (a relative path, say) — leave it untouched.
    return url;
  }
}
