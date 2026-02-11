export const DEFAULT_TRAVEL_IMAGE = "/tbilisi-old-town.jpg"

const BLOCKED_OR_UNSTABLE_PATTERNS = [
  "images.unsplash.com",
  "source.unsplash.com",
  "loremflickr.com",
  "picsum.photos",
  "pexels.com",
  "pollinations.ai",
]

export const isProbablyBlockedImage = (src?: string | null) => {
  if (!src) return true
  const lower = String(src).toLowerCase().trim()
  if (!lower) return true
  if (lower.startsWith("data:") || lower.startsWith("blob:")) return false
  return BLOCKED_OR_UNSTABLE_PATTERNS.some((pattern) => lower.includes(pattern))
}

export const buildImageQuery = (...candidates: Array<string | undefined | null>) => {
  const clean = candidates
    .map((v) => String(v || "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()

  return clean || "travel landmark"
}

export const getImageApiUrl = (query: string) => `/api/image?query=${encodeURIComponent(buildImageQuery(query))}`

export const getGalleryApiUrl = (query: string, count: number = 6) => `/api/gallery?query=${encodeURIComponent(buildImageQuery(query))}&count=${Math.max(1, Math.min(10, count))}`

export const resolveDirectImageUrl = (src?: string | null) => {
  if (!src) return null
  return isProbablyBlockedImage(src) ? null : String(src)
}
