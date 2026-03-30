import { NextResponse } from "next/server";

type ApiErrorOptions = {
  status?: number;
  code?: string;
  details?: unknown;
};

type ServiceError = Error & { statusCode?: number; code?: string; details?: unknown };

export function apiError(error: string, options: ApiErrorOptions = {}) {
  const status = options.status ?? 500;
  return NextResponse.json(
    {
      error,
      code: options.code ?? "INTERNAL_ERROR",
      ...(options.details !== undefined ? { details: options.details } : {}),
    },
    { status }
  );
}

export function fromServiceError(
  err: unknown,
  fallback: { error: string; code: string }
) {
  const known = err as ServiceError;
  return apiError(known.message ?? fallback.error, {
    status: known.statusCode ?? 500,
    code: known.code ?? fallback.code,
    details: known.details,
  });
}

export async function parseJsonBody(request: Request) {
  try {
    return { ok: true as const, body: await request.json() };
  } catch {
    return {
      ok: false as const,
      response: apiError("Malformed JSON payload", {
        status: 400,
        code: "MALFORMED_JSON",
      }),
    };
  }
}

export function validationError(details: unknown) {
  return apiError("Validation failed", {
    status: 400,
    code: "VALIDATION_ERROR",
    details,
  });
}
