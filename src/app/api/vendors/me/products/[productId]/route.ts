import { NextResponse } from "next/server";
import { requireApprovedVendor, requireVendor } from "@/lib/auth/rbac";
import { getVendorByUserId } from "@/services/vendor";
import { updateProduct, deleteProduct, getProductById } from "@/services/catalog";
import { updateProductSchema } from "@/lib/validations/catalog";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { user, vendor } = await requireApprovedVendor();
    const { productId } = await params;
    const body = await request.json();
    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const product = await updateProduct(productId, vendor.id, user.id, parsed.data);
    return NextResponse.json({ product });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    const status = err.statusCode ?? 500;
    return NextResponse.json({ error: err.message ?? "Failed to update product" }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { user, vendor } = await requireApprovedVendor();
    const { productId } = await params;
    await deleteProduct(productId, vendor.id, user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    const status = err.statusCode ?? 500;
    return NextResponse.json({ error: err.message ?? "Failed to delete product" }, { status });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const user = await requireVendor();
    const vendor = await getVendorByUserId(user.id);
    if (!vendor) {
      return NextResponse.json({ error: "Vendor profile not found." }, { status: 404 });
    }
    const { productId } = await params;
    const product = await getProductById(productId);
    if (!product || product.vendorId !== vendor.id) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ product });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    const status = err.statusCode ?? 500;
    return NextResponse.json({ error: err.message ?? "Failed to get product" }, { status });
  }
}
