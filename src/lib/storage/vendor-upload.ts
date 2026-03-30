import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export type VendorUploadKind = "logo" | "document";

const LOGO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const DOC_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

const LOGO_MAX = 2 * 1024 * 1024;
const DOC_MAX = 10 * 1024 * 1024;

function extForMime(contentType: string, kind: VendorUploadKind): string {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "application/pdf") return "pdf";
  const sub = contentType.split("/")[1];
  if (sub) return sub.replace("jpeg", "jpg");
  return kind === "logo" ? "png" : "bin";
}

export async function uploadVendorAsset(input: {
  buffer: Buffer;
  contentType: string;
  kind: VendorUploadKind;
  userId: string;
  requestOrigin: string;
}): Promise<{ url: string }> {
  const { buffer, contentType, kind, userId, requestOrigin } = input;
  const allowed = kind === "logo" ? LOGO_TYPES : DOC_TYPES;
  if (!allowed.has(contentType)) {
    const err = new Error("Unsupported file type") as Error & { code?: string };
    err.code = "INVALID_FILE_TYPE";
    throw err;
  }
  const max = kind === "logo" ? LOGO_MAX : DOC_MAX;
  if (buffer.length > max) {
    const err = new Error("File is too large") as Error & { code?: string };
    err.code = "FILE_TOO_LARGE";
    throw err;
  }

  const ext = extForMime(contentType, kind);
  const key = `vendor/${userId}/${randomUUID()}.${ext}`;

  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION || "us-east-1";
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (bucket && accessKey && secretKey) {
    const client = new S3Client({ region, credentials: { accessKeyId: accessKey, secretAccessKey: secretKey } });
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000",
      })
    );
    const base =
      process.env.AWS_S3_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
      `https://${bucket}.s3.${region}.amazonaws.com`;
    return { url: `${base}/${key}` };
  }

  if (process.env.NODE_ENV !== "development") {
    const err = new Error("File uploads are not configured (set AWS S3 env vars)") as Error & { code?: string };
    err.code = "STORAGE_NOT_CONFIGURED";
    throw err;
  }

  const dir = path.join(process.cwd(), "public", "uploads", "vendor");
  await mkdir(dir, { recursive: true });
  const fname = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, fname), buffer);
  const origin = requestOrigin.replace(/\/$/, "");
  return { url: `${origin}/uploads/vendor/${fname}` };
}
