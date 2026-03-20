import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { TokenUsage } from "@/lib/deepseek";

type UsageLike = Partial<TokenUsage> | null | undefined;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizeUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

function getServiceRoleClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

export async function getRequestUserId(): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const cookieStore = await cookies();
  const authClient = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
    },
  });

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();

  if (error) {
    console.error("[getRequestUserId] Auth error:", error.message);
    return null;
  }

  return user?.id || null;
}

const MONTHLY_GENERATION_LIMIT = 10;

export async function checkMonthlyGenerationLimit(userId: string): Promise<{
  allowed: boolean;
  count: number;
  limit: number;
  resetAt: string; // ISO date string of first day of next month
}> {
  const client = getServiceRoleClient();
  const limit = MONTHLY_GENERATION_LIMIT;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const resetAt = nextMonth.toISOString();

  if (!client) return { allowed: true, count: 0, limit, resetAt };

  const { count, error } = await client
    .from("ai_usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("source", "route-generation")
    .gte("created_at", monthStart);

  if (error) {
    console.error("[Generation limit] Count query failed:", error.message);
    return { allowed: true, count: 0, limit, resetAt };
  }

  const used = count ?? 0;
  return { allowed: used < limit, count: used, limit, resetAt };
}

export async function recordAiUsageEvent(params: {
  userId: string;
  source: string;
  usage?: UsageLike;
  tripId?: string | null;
  provider?: string | null;
  model?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const client = getServiceRoleClient();
  if (!client) return;

  const promptTokens = Math.max(0, Math.round(toNumber(params.usage?.promptTokens)));
  const completionTokens = Math.max(0, Math.round(toNumber(params.usage?.completionTokens)));
  const computedTotal = promptTokens + completionTokens;
  const totalTokens = Math.max(0, Math.round(toNumber(params.usage?.totalTokens || computedTotal)));
  const costUsd = Math.max(0, toNumber(params.usage?.costUsd));
  const costRub = Math.max(0, toNumber(params.usage?.costRub));

  const payload = {
    user_id: params.userId,
    trip_id: normalizeUuid(params.tripId),
    source: params.source,
    provider: params.provider || "deepseek",
    model: params.model || params.usage?.model || null,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
    cost_usd: costUsd,
    cost_rub: costRub,
    meta: params.metadata || {},
  };

  const { error } = await client.from("ai_usage_events").insert(payload);

  if (error && error.code !== "42P01") {
    console.error("[AI Usage] Failed to persist event:", error.message);
  }
}
