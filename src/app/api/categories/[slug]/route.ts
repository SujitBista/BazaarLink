import { NextResponse } from "next/server";
import { getCategoryBySlug } from "@/services/catalog";

/** Public: get category by slug */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const category = await getCategoryBySlug(slug);
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    return NextResponse.json({ category });
  } catch (e) {
    const err = e as Error;
    return NextResponse.json({ error: err.message ?? "Failed to get category" }, { status: 500 });
  }
}
