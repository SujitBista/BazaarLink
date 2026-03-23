import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/role";
import { createCategory, listCategories } from "@/services/catalog";
import { createCategorySchema } from "@/lib/validations/catalog";

export async function GET() {
  try {
    const user = await getSession();
    requireRole(user, "ADMIN");
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
    const user = await getSession();
    requireRole(user, "ADMIN");
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
