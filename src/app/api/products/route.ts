import { NextResponse } from "next/server";
import { listProductsPublic } from "@/services/catalog";

/** Public: list ACTIVE products with optional category filter, search (q), and subcategory inclusion */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const categorySlug = searchParams.get("categorySlug") ?? undefined;
    const q = searchParams.get("q") ?? searchParams.get("search") ?? undefined;
    const includeSubcategories = searchParams.get("includeSubcategories") !== "false";
    const products = await listProductsPublic({
      categoryId,
      categorySlug,
      search: q ?? undefined,
      includeSubcategories,
    });
    return NextResponse.json({ products });
  } catch (e) {
    const err = e as Error;
    return NextResponse.json({ error: err.message ?? "Failed to list products" }, { status: 500 });
  }
}
