import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/role";
import { getVendorByUserId } from "@/services/vendor";
import { listProductsByVendor } from "@/services/catalog";
import { createProduct } from "@/services/catalog";
import { createProductSchema } from "@/lib/validations/catalog";

export async function GET() {
  try {
    const user = await getSession();
    requireRole(user, "VENDOR");
    const vendor = await getVendorByUserId(user.id);
    if (!vendor) {
      return NextResponse.json({ error: "Vendor profile not found. Register as vendor first." }, { status: 404 });
    }
    const products = await listProductsByVendor(vendor.id, user.id);
    return NextResponse.json({ products });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    const status = err.statusCode ?? 500;
    return NextResponse.json({ error: err.message ?? "Failed to list products" }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSession();
    requireRole(user, "VENDOR");
    const vendor = await getVendorByUserId(user.id);
    if (!vendor) {
      return NextResponse.json({ error: "Vendor profile not found. Register as vendor first." }, { status: 404 });
    }
    const body = await request.json();
    const parsed = createProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const product = await createProduct(vendor.id, user.id, parsed.data);
    return NextResponse.json({ product });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    const status = err.statusCode ?? 500;
    return NextResponse.json({ error: err.message ?? "Failed to create product" }, { status });
  }
}
