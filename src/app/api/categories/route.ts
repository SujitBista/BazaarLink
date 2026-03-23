import { NextResponse } from "next/server";
import { listCategories } from "@/services/catalog";

/** Public: list all categories (optional parentId query) */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parentId");
    const categories = await listCategories(parentId ?? undefined);
    return NextResponse.json({ categories });
  } catch (e) {
    const err = e as Error;
    return NextResponse.json({ error: err.message ?? "Failed to list categories" }, { status: 500 });
  }
}
