import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getProductById } from "@/services/catalog";
import { prisma } from "@/lib/db";

/** Public: get product by id. ACTIVE = everyone; DRAFT = only owner vendor or admin. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const product = await getProductById(productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (product.status !== "ACTIVE") {
      const user = await getSession();
      const isAdmin = user?.role === "ADMIN";
      const isOwner = product.vendor.userId === user?.id;
      if (!isAdmin && !isOwner) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }
    }
    return NextResponse.json({ product });
  } catch (e) {
    const err = e as Error;
    return NextResponse.json({ error: err.message ?? "Failed to get product" }, { status: 500 });
  }
}
