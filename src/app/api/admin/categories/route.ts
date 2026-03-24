import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/rbac";
import { createCategory, listCategories } from "@/services/catalog";
import { createCategorySchema } from "@/lib/validations/catalog";

export async function GET() {
  try {
    await requireAdmin();
    const categories = await listCategories();
    return NextResponse.json({ categories });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    const status = err.statusCode ?? 500;
    return NextResponse.json({ error: err.message ?? "Failed to list categories" }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const parsed = createCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const category = await createCategory(parsed.data);
    return NextResponse.json({ category });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    const status = err.statusCode ?? 500;
    return NextResponse.json({ error: err.message ?? "Failed to create category" }, { status });
  }
}
