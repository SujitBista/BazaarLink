import { fetchApiJson } from "@/lib/client/api-json";

/**
 * Clears the session via POST /api/auth/logout and navigates the browser.
 * Call only from client components / event handlers.
 */
export async function signOutAndRedirect(redirectTo: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetchApiJson<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
  if (!res.ok) {
    return { ok: false, error: res.error };
  }
  window.location.assign(redirectTo);
  return { ok: true };
}
