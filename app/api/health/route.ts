import { NextResponse } from "next/server"

export async function GET() {
  try {
    const healthCheck = {
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        GROQ_API_KEY_EXISTS: !!process.env.GROQ_API_KEY,
        HUGGING_FACE_TOKEN_EXISTS: !!process.env.HUGGING_FACE_TOKEN,
        NEXT_PUBLIC_SUPABASE_URL_EXISTS: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY_EXISTS: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
      api_endpoints: {
        groq: "/api/groq - POST - Route generation",
        health: "/api/health - GET - This endpoint"
      },
      dependencies: {
        groq_sdk: "groq-sdk",
        huggingface: "custom fetch",
        supabase: "@supabase/supabase-js"
      }
    }

    return NextResponse.json(healthCheck, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
