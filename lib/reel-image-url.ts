/** Same host allowlist as app/api/proxy-image */
const ALLOWED = new Set([
  "images.unsplash.com",
  "images.pexels.com",
  "upload.wikimedia.org",
  "img.freepik.com",
  "pixabay.com",
  "cdn.pixabay.com",
])

/** Same-origin proxy URL (fallback if direct <img> fails). */
export function reelImageProxyUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ""
  try {
    const u = new URL(trimmed)
    if (u.protocol !== "https:") return trimmed
    if (!ALLOWED.has(u.hostname)) return trimmed
    return `/api/proxy-image?url=${encodeURIComponent(trimmed)}`
  } catch {
    return trimmed
  }
}

/** Prefer loading the image directly in the browser (often works; avoids proxy rate limits). */
export function reelImageDirectUrl(url: string): string {
  return url.trim()
}

/** @deprecated use reelImageProxyUrl */
export const reelImageSrc = reelImageProxyUrl
