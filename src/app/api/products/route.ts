import { NextResponse } from "next/server";
import { listProductsPublic } from "@/services/catalog";

/** Public: list ACTIVE products with optional category filter */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const categorySlug = searchParams.get("categorySlug") ?? undefined;
    const products = await listProductsPublic({ categoryId, categorySlug });
    return NextResponse.json({ products });
  } catch (e) {
    const err = e as Error;
    return NextResponse.json({ error: err.message ?? "Failed to list products" }, { status: 500 });
  }
}
