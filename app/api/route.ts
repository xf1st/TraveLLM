import { NextResponse } from "next/server"

/** Explicit 404 for GET /api (no nested resource) — avoids ambiguous HTML not-found handling. */
export function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 })
}
