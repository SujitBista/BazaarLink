import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { apiError } from "@/lib/api/errors";
import { uploadVendorAsset, type VendorUploadKind } from "@/lib/storage/vendor-upload";

export const runtime = "nodejs";

function getRequestOrigin(request: Request): string {
  const url = new URL(request.url);
  const forwarded = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const proto = forwarded ?? url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    if (user.role === "ADMIN") {
      return apiError("Not allowed", { status: 403, code: "FORBIDDEN" });
    }

    const form = await request.formData();
    const file = form.get("file");
    const kindRaw = form.get("kind");

    if (!(file instanceof Blob) || typeof file.size !== "number") {
      return apiError("Missing file", { status: 400, code: "MISSING_FILE" });
    }

    const kind = kindRaw === "document" ? "document" : kindRaw === "logo" ? "logo" : null;
    if (!kind) {
      return apiError('Invalid kind (use "logo" or "document")', { status: 400, code: "INVALID_KIND" });
    }

    const contentType = file.type || "application/octet-stream";
    const buffer = Buffer.from(await file.arrayBuffer());
    const origin = getRequestOrigin(request);

    const { url } = await uploadVendorAsset({
      buffer,
      contentType,
      kind: kind as VendorUploadKind,
      userId: user.id,
      requestOrigin: origin,
    });

    return NextResponse.json({ url });
  } catch (e) {
    const err = e as Error & { code?: string; statusCode?: number };
    if (err.code === "INVALID_FILE_TYPE") {
      return apiError(err.message, { status: 400, code: err.code });
    }
    if (err.code === "FILE_TOO_LARGE") {
      return apiError(err.message, { status: 400, code: err.code });
    }
    if (err.code === "STORAGE_NOT_CONFIGURED") {
      return apiError(err.message, { status: 503, code: err.code });
    }
    if (err.message === "Unauthorized") {
      return apiError("Unauthorized", { status: 401, code: "UNAUTHORIZED" });
    }
    return apiError(err.message ?? "Upload failed", { status: 500, code: "UPLOAD_FAILED" });
  }
}
