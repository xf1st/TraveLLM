/** Explicit project setting takes precedence over inherited proxy variables.
 * Set TRAVELLM_HTTP_PROXY=off for direct connections; never bypass a configured
 * proxy automatically after a network failure.
 */
export function getHttpProxyUrl(): string | undefined {
  const explicit = process.env.TRAVELLM_HTTP_PROXY
  if (explicit !== undefined) {
    const value = explicit.trim()
    return !value || value.toLowerCase() === "off" ? undefined : value
  }
  return process.env.HTTP_PROXY || process.env.http_proxy || undefined
}

/** Used only for an explicitly requested proxy test; an `off` setting still
 * controls normal traffic. Credentials never leave the server.
 */
export function getConfiguredHttpProxyUrl(): string | undefined {
  const explicit = process.env.TRAVELLM_HTTP_PROXY?.trim()
  return explicit && explicit.toLowerCase() !== "off" ? explicit :
    process.env.HTTP_PROXY?.trim() || process.env.http_proxy?.trim() || undefined
}
