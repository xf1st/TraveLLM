import { ImageResponse } from "next/og"

export const runtime = "nodejs"

/**
 * PNG icons for web manifest (192 / 512). Generated so repo does not ship binary assets.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ size: string }> },
) {
  const { size: raw } = await context.params
  const px = raw === "512" ? 512 : raw === "180" ? 180 : 192
  const radius = px >= 512 ? 72 : px >= 192 ? 28 : 26
  const fontSize = Math.round(px * 0.26)

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #0b0e14 0%, #1e3a8a 55%, #0f172a 100%)",
          borderRadius: radius,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#85adff",
            fontSize,
            fontWeight: 800,
            letterSpacing: "-0.06em",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          TL
        </div>
      </div>
    ),
    { width: px, height: px },
  )
}
