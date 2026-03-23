import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/role";
import { approveVendor } from "@/services/vendor";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const user = await getSession();
    requireRole(user, "ADMIN");
    const { vendorId } = await params;
    const vendor = await approveVendor(vendorId, user!.id);
    return NextResponse.json({ vendor });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    const status = err.statusCode ?? 500;
    return NextResponse.json({ error: err.message ?? "Approval failed" }, { status });
  }
}
