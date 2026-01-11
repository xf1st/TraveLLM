import { NextResponse } from "next/server"
import { hfInference } from "@/lib/huggingface"

export async function GET() {
  try {
    let hfTestResult = "not_tested"
    
    // Test Hugging Face API
    if (process.env.HUGGING_FACE_TOKEN) {
      try {
        console.log("Testing HF API...")
        const testPrompt = "Generate a simple JSON: {\"test\": \"ok\"}"
        const testSystem = "You are a helpful assistant. Respond with JSON only."
        const result = await hfInference(testPrompt, testSystem)
        hfTestResult = "working"
        console.log("HF API test passed:", result.substring(0, 100))
      } catch (hfError: any) {
        hfTestResult = `failed: ${hfError.message}`
        console.error("HF API test failed:", hfError)
      }
    }

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
      api_tests: {
        huggingface: hfTestResult,
        groq: process.env.GROQ_API_KEY ? "available_requires_vpn" : "no_key"
      },
      api_endpoints: {
        groq: "/api/groq - POST - Route generation (Qwen3-32B only)",
        health: "/api/health - GET - This endpoint"
      },
      dependencies: {
        groq_sdk: "groq-sdk",
        huggingface: "custom fetch",
        supabase: "@supabase/supabase-js"
      },
      notes: {
        huggingface: "Qwen3-32B model - fast and efficient",
        groq: "Requires VPN for access",
        fallback: "Using Qwen3-32B for better performance"
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
