import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/rbac";
import { registerVendor } from "@/services/vendor";
import { registerVendorSchema } from "@/lib/validations/vendor";

export async function POST(request: Request) {
  try {
    const user = await requireVendor();
    const body = await request.json();
    const parsed = registerVendorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const vendor = await registerVendor(user.id, parsed.data);
    return NextResponse.json({ vendor });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    const status = err.statusCode ?? 500;
    return NextResponse.json({ error: err.message ?? "Registration failed" }, { status });
  }
}
