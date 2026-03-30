/**
 * Browser fetch helper for same-origin API routes (session cookie).
 */

export type ApiErrorBody = {
  error: string;
  code?: string;
  details?: unknown;
};

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string; code?: string; details?: unknown };

export async function fetchApiJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<ApiResult<T>> {
  const res = await fetch(input, { credentials: "include", ...init });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  if (!res.ok) {
    const body = json && typeof json === "object" && json !== null ? (json as Record<string, unknown>) : null;
    return {
      ok: false,
      status: res.status,
      error: typeof body?.error === "string" ? body.error : res.statusText,
      code: typeof body?.code === "string" ? body.code : undefined,
      details: body?.details,
    };
  }
  return { ok: true, status: res.status, data: json as T };
}

export function formatValidationDetails(details: unknown): string[] {
  if (!details || typeof details !== "object") return [];
  const d = details as { fieldErrors?: Record<string, string[] | undefined>; formErrors?: string[] };
  const lines: string[] = [];
  if (d.formErrors?.length) lines.push(...d.formErrors);
  if (d.fieldErrors) {
    for (const [key, msgs] of Object.entries(d.fieldErrors)) {
      if (msgs?.length) lines.push(`${key}: ${msgs.join(", ")}`);
    }
  }
  return lines;
}
