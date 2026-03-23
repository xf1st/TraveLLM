/**
 * Client: update own profile via server route (no direct PostgREST PATCH from the browser).
 */

export class ProfilePatchError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message)
    this.name = "ProfilePatchError"
  }
}

export async function patchMyProfile(body: Record<string, unknown>): Promise<{ profile: Record<string, unknown> }> {
  const res = await fetch("/api/user/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean
    error?: string
    code?: string
    profile?: Record<string, unknown>
  }
  if (!res.ok || !data.ok || !data.profile) {
    throw new ProfilePatchError(data.error || `HTTP ${res.status}`, res.status, data.code)
  }
  return { profile: data.profile }
}
