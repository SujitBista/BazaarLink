import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/role";
import { getVendorByUserId } from "@/services/vendor";

export async function GET() {
  try {
    const user = await getSession();
    requireRole(user, "VENDOR");
    const vendor = await getVendorByUserId(user.id);
    if (!vendor) {
      return NextResponse.json({ vendor: null }, { status: 200 });
    }
    return NextResponse.json({ vendor });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    const status = err.statusCode ?? 500;
    return NextResponse.json({ error: err.message ?? "Failed to get vendor" }, { status });
  }
}
