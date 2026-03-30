/**
 * Public site origin for verification links (signup).
 * Order: `NEXT_PUBLIC_APP_URL` → `X-Forwarded-*` (proxies) → `request.url` origin (reliable in dev) → localhost.
 */
export function getRequestOrigin(request: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    const host = forwardedHost.split(",")[0].trim();
    const proto = (forwardedProto ?? "https").split(",")[0].trim();
    return `${proto}://${host}`;
  }

  try {
    return new URL(request.url).origin;
  } catch {
    const host = request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") ?? "http";
    if (host) {
      return `${proto}://${host}`;
    }
    return "http://localhost:3000";
  }
}
