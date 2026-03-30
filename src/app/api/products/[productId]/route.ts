import { NextResponse } from "next/server";
import { getResolvedSession } from "@/services/auth";
import { getProductById } from "@/services/catalog";
import { toNonAdminVendorResponse, toPublicProductVendor } from "@/services/vendor";
import { productIdParamSchema } from "@/lib/validations/vendor";
import { fromServiceError, validationError } from "@/lib/api/errors";

/** Public: get product by id. ACTIVE = everyone; DRAFT = only owner vendor or admin. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const parsed = productIdParamSchema.safeParse({ productId });
    if (!parsed.success) {
      return validationError(parsed.error.flatten());
    }
    const product = await getProductById(parsed.data.productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found", code: "NOT_FOUND" }, { status: 404 });
    }
    const session = await getResolvedSession();
    const isAdmin = session?.role === "ADMIN";
    const isOwner = product.vendor.userId === session?.id;
    if (product.status !== "ACTIVE") {
      if (!isAdmin && !isOwner) {
        return NextResponse.json({ error: "Product not found", code: "NOT_FOUND" }, { status: 404 });
      }
    }
    const vendorOut = isAdmin
      ? product.vendor
      : product.status === "ACTIVE"
        ? toPublicProductVendor(product.vendor)
        : toNonAdminVendorResponse(product.vendor);
    return NextResponse.json({ product: { ...product, vendor: vendorOut } });
  } catch (e) {
    return fromServiceError(e, { error: "Failed to get product", code: "GET_PRODUCT_FAILED" });
  }
}
