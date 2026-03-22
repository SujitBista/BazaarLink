import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/role";
import { updateCategory, deleteCategory, getCategoryById } from "@/services/catalog";
import { updateCategorySchema } from "@/lib/validations/catalog";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const user = await getSession();
    requireRole(user, "ADMIN");
    const { categoryId } = await params;
    const category = await getCategoryById(categoryId);
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    return NextResponse.json({ category });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    const status = err.statusCode ?? 500;
    return NextResponse.json({ error: err.message ?? "Failed to get category" }, { status });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const user = await getSession();
    requireRole(user, "ADMIN");
    const { categoryId } = await params;
    const body = await request.json();
    const parsed = updateCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const category = await updateCategory(categoryId, parsed.data);
    return NextResponse.json({ category });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    const status = err.statusCode ?? 500;
    return NextResponse.json({ error: err.message ?? "Failed to update category" }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const user = await getSession();
    requireRole(user, "ADMIN");
    const { categoryId } = await params;
    await deleteCategory(categoryId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    const status = err.statusCode ?? 500;
    return NextResponse.json({ error: err.message ?? "Failed to delete category" }, { status });
  }
}
