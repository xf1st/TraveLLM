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
    return null;
  }

  return user?.id || null;
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
