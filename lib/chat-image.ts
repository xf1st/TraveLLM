/**
 * Client-side image resize for trip-assistant uploads (keeps request size small).
 */

const MAX_EDGE = 1280
const JPEG_QUALITY = 0.82

export async function resizeImageFileToJpeg(file: File): Promise<Blob> {
    const bitmap = await createImageBitmap(file)
    try {
        let { width, height } = bitmap
        const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
        width = Math.round(width * scale)
        height = Math.round(height * scale)

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) throw new Error("Canvas unsupported")
        ctx.drawImage(bitmap, 0, 0, width, height)

        const blob: Blob | null = await new Promise((resolve) =>
            canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY)
        )
        if (!blob) throw new Error("toBlob failed")
        return blob
    } finally {
        bitmap.close()
    }
}
