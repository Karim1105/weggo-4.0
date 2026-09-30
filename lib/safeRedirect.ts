// Only allow same-origin relative paths. Browsers and the URL parser treat
// `\` like `/`, so `/\evil.com` would otherwise become `//evil.com`.
export function getSafeRedirectPath(value: string, origin: string): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return null
  try {
    const base = new URL(origin)
    const resolved = new URL(value, base)
    if (resolved.origin !== base.origin) return null
    return `${resolved.pathname}${resolved.search}${resolved.hash}`
  } catch {
    return null
  }
}
