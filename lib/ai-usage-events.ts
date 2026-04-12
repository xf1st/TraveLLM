import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
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

/** Только для локальной отладки: при отсутствии service role / ошибке БД не блокировать лимиты. В проде не задавать. */
function limitsFailOpen(): boolean {
  return process.env.TRAVELLM_LIMIT_FAIL_OPEN === "1";
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

export const MONTHLY_GENERATION_LIMIT = 10;

/** Месячный лимит «чат + вспомогательный AI» (не генерация маршрута). Переопределение: profiles.chat_limit_override */
export const MONTHLY_CHAT_AI_LIMIT = 400;

/**
 * Источники ai_usage_events, которые суммируются в месячный лимит чата/ассистента.
 * Не включает route-generation (отдельный лимит gen_limit_override).
 */
export const MONTHLY_CHAT_AI_SOURCES = [
  "trip-assistant",
  "activity-chat",
  "map.normalize-points",
  "guide-chat",
  "main-chat",
  "modify-itinerary",
  "enrich-trip",
  "budget.economist",
  "memory-board.stats",
  "reviews.ai",
  "travel.search",
] as const;

export type MonthlyChatAiSource = (typeof MONTHLY_CHAT_AI_SOURCES)[number];

export type MonthlyLimitCheckResult = {
  allowed: boolean;
  count: number;
  limit: number;
  resetAt: string;
  /** Не удалось проверить лимиты (нет service role / ошибка БД). Не путать с исчерпанием квоты. */
  backendUnavailable?: boolean;
};

export async function checkMonthlyChatAiLimit(userId: string): Promise<MonthlyLimitCheckResult> {
  const client = getServiceRoleClient();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const resetAt = nextMonth.toISOString();

  if (!client) {
    if (limitsFailOpen()) {
      return { allowed: true, count: 0, limit: MONTHLY_CHAT_AI_LIMIT, resetAt };
    }
    return {
      allowed: false,
      count: 0,
      limit: MONTHLY_CHAT_AI_LIMIT,
      resetAt,
      backendUnavailable: true,
    };
  }

  const sources = [...MONTHLY_CHAT_AI_SOURCES];

  const [profileRes, countRes] = await Promise.all([
    client.from("profiles").select("chat_limit_override").eq("id", userId).maybeSingle(),
    client
      .from("ai_usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("source", sources)
      .gte("created_at", monthStart),
  ]);

  if (profileRes.error) {
    console.error("[Chat AI limit] Profile query failed:", profileRes.error.message);
    if (limitsFailOpen()) {
      return { allowed: true, count: 0, limit: MONTHLY_CHAT_AI_LIMIT, resetAt };
    }
    return {
      allowed: false,
      count: 0,
      limit: MONTHLY_CHAT_AI_LIMIT,
      resetAt,
      backendUnavailable: true,
    };
  }

  if (countRes.error) {
    console.error("[Chat AI limit] Count query failed:", countRes.error.message);
    if (limitsFailOpen()) {
      return { allowed: true, count: 0, limit: MONTHLY_CHAT_AI_LIMIT, resetAt };
    }
    return {
      allowed: false,
      count: 0,
      limit: MONTHLY_CHAT_AI_LIMIT,
      resetAt,
      backendUnavailable: true,
    };
  }

  const limit =
    profileRes.data?.chat_limit_override != null
      ? profileRes.data.chat_limit_override
      : MONTHLY_CHAT_AI_LIMIT;

  const used = countRes.count ?? 0;
  return { allowed: used < limit, count: used, limit, resetAt };
}

export function monthlyChatAiLimitResponse(result: MonthlyLimitCheckResult) {
  if (result.backendUnavailable) {
    return NextResponse.json(
      {
        error: "Сервис лимитов временно недоступен. Попробуйте позже.",
        code: "LIMITS_UNAVAILABLE",
      },
      { status: 503 },
    );
  }
  return NextResponse.json(
    {
      error:
        result.limit <= 0
          ? "AI-ассистент отключён для этого аккаунта."
          : "Достигнут месячный лимит AI-запросов (чат и вспомогательные функции). Лимит обновится в начале следующего месяца.",
      code: "CHAT_MONTHLY_LIMIT",
      count: result.count,
      limit: result.limit,
      resetAt: result.resetAt,
    },
    { status: 429 },
  );
}

/** Ответ 503 при сбое проверки лимита генераций маршрута (не исчерпание квоты). */
export function monthlyGenerationBackendUnavailableResponse() {
  return NextResponse.json(
    {
      error: "Сервис лимитов временно недоступен. Попробуйте позже.",
      code: "LIMITS_UNAVAILABLE",
    },
    { status: 503 },
  );
}

export async function checkMonthlyGenerationLimit(userId: string): Promise<MonthlyLimitCheckResult> {
  const client = getServiceRoleClient();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const resetAt = nextMonth.toISOString();

  if (!client) {
    if (limitsFailOpen()) {
      return { allowed: true, count: 0, limit: MONTHLY_GENERATION_LIMIT, resetAt };
    }
    return {
      allowed: false,
      count: 0,
      limit: MONTHLY_GENERATION_LIMIT,
      resetAt,
      backendUnavailable: true,
    };
  }

  // Fetch profile override and usage count in parallel
  const [profileRes, countRes] = await Promise.all([
    client.from("profiles").select("gen_limit_override").eq("id", userId).maybeSingle(),
    client
      .from("ai_usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("source", "route-generation")
      .gte("created_at", monthStart),
  ]);

  if (profileRes.error) {
    console.error("[Generation limit] Profile query failed:", profileRes.error.message);
    if (limitsFailOpen()) {
      return { allowed: true, count: 0, limit: MONTHLY_GENERATION_LIMIT, resetAt };
    }
    return {
      allowed: false,
      count: 0,
      limit: MONTHLY_GENERATION_LIMIT,
      resetAt,
      backendUnavailable: true,
    };
  }

  if (countRes.error) {
    console.error("[Generation limit] Count query failed:", countRes.error.message);
    if (limitsFailOpen()) {
      return { allowed: true, count: 0, limit: MONTHLY_GENERATION_LIMIT, resetAt };
    }
    return {
      allowed: false,
      count: 0,
      limit: MONTHLY_GENERATION_LIMIT,
      resetAt,
      backendUnavailable: true,
    };
  }

  const limit =
    profileRes.data?.gen_limit_override != null
      ? profileRes.data.gen_limit_override
      : MONTHLY_GENERATION_LIMIT;

  const used = countRes.count ?? 0;
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
