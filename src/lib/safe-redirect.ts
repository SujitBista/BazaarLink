/**
 * Returns a same-origin relative path for post-login redirects. Prevents open redirects.
 */
export function safeRelativePath(raw: string | undefined | null, fallback: string): string {
  if (!raw || typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return fallback;
  }
  return trimmed;
}
