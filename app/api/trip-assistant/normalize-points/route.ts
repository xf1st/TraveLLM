import { NextResponse } from "next/server"
import { deepseekInference } from "@/lib/deepseek"

type ActivityInput = {
  title?: string
  placeName?: string
  place_name?: string
  desc?: string
  description?: string
}

export async function POST(req: Request) {
  try {
    const { activities, destination } = await req.json()

    if (!Array.isArray(activities) || activities.length === 0) {
      return NextResponse.json({ error: "Invalid activities" }, { status: 400 })
    }

    const compactActivities = (activities as ActivityInput[]).slice(0, 25).map((a) => ({
      title: a.title || a.placeName || a.place_name || "Activity",
      desc: a.desc || a.description || "",
    }))

    const prompt = `You are a strict JSON geocoding helper.
Given travel activities in ${destination || "the destination city"}, return likely coordinates.

Rules:
1. Keep "title" exactly as input.
2. Output only JSON.
3. JSON format:
{
  "points": [
    { "title": "...", "lat": 0.0, "lng": 0.0, "description": "short note" }
  ]
}
4. Keep description short (<= 12 words).
5. If place is generic, pick a central realistic spot in destination city.

Input:
${JSON.stringify(compactActivities)}`

    const raw = await deepseekInference(
      [
        { role: "system", content: "You output valid JSON only. No markdown." },
        { role: "user", content: prompt },
      ],
      {
        maxTokens: 1400,
        temperature: 0.1,
        tripDays: 3,
      },
    )

    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim()
    const jsonCandidate = cleaned.match(/\{[\s\S]*\}/)?.[0] || cleaned
    const parsed = JSON.parse(jsonCandidate)

    if (!Array.isArray(parsed.points)) {
      return NextResponse.json({ error: "Invalid AI response shape" }, { status: 500 })
    }

    const safePoints = parsed.points
      .map((p: any) => ({
        title: String(p.title || ""),
        lat: Number(p.lat),
        lng: Number(p.lng),
        description: String(p.description || ""),
      }))
      .filter((p: any) => Number.isFinite(p.lat) && Number.isFinite(p.lng))

    return NextResponse.json({ points: safePoints })
  } catch (error) {
    console.error("Normalize points error:", error)
    return NextResponse.json({ error: "Failed to normalize points" }, { status: 500 })
  }
}
