import { prisma } from "@/lib/db";
import type { CreateCategoryInput, UpdateCategoryInput, CreateProductInput, UpdateProductInput } from "@/lib/validations/catalog";
import { VendorStatus, ProductStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import type { Prisma } from "@prisma/client";

function toDecimal(n: number): Decimal {
  return new Decimal(n);
}

function toJson(v: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined {
  return v == null ? undefined : (v as Prisma.InputJsonValue);
}

export async function listCategories(parentId?: string | null) {
  return prisma.category.findMany({
    where: parentId === undefined ? undefined : { parentId: parentId || null },
    include: { children: true },
    orderBy: { name: "asc" },
  });
}

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    include: { parent: true, children: true },
  });
}

export async function getCategoryById(id: string) {
  return prisma.category.findUnique({
    where: { id },
    include: { parent: true, children: true },
  });
}

export async function createCategory(input: CreateCategoryInput) {
  const existing = await prisma.category.findUnique({ where: { slug: input.slug } });
  if (existing) {
    const err = new Error("Category slug already exists");
    (err as Error & { statusCode?: number }).statusCode = 409;
    throw err;
  }
  return prisma.category.create({
    data: {
      name: input.name,
      slug: input.slug,
      parentId: input.parentId ?? null,
    },
  });
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  if (input.slug) {
    const existing = await prisma.category.findFirst({ where: { slug: input.slug, NOT: { id } } });
    if (existing) {
      const err = new Error("Category slug already exists");
      (err as Error & { statusCode?: number }).statusCode = 409;
      throw err;
    }
  }
  return prisma.category.update({
    where: { id },
    data: {
      ...(input.name != null && { name: input.name }),
      ...(input.slug != null && { slug: input.slug }),
      ...(input.parentId !== undefined && { parentId: input.parentId ?? null }),
    },
  });
}

export async function deleteCategory(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { children: true, products: { take: 1 } },
  });
  if (!category) {
    const err = new Error("Category not found");
    (err as Error & { statusCode?: number }).statusCode = 404;
    throw err;
  }
  if (category.children.length > 0 || category.products.length > 0) {
    const err = new Error("Category has children or products and cannot be deleted");
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }
  return prisma.category.delete({ where: { id } });
}

export async function createProduct(vendorId: string, userId: string, input: CreateProductInput) {
  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, userId },
    select: { status: true },
  });
  if (!vendor) {
    const err = new Error("Vendor not found");
    (err as Error & { statusCode?: number }).statusCode = 404;
    throw err;
  }
  if (vendor.status !== VendorStatus.APPROVED) {
    const err = new Error("Vendor must be approved to create products");
    (err as Error & { statusCode?: number }).statusCode = 403;
    throw err;
  }
  const status = (input.status === "ACTIVE" ? "ACTIVE" : "DRAFT") as ProductStatus;
  const slugExists = await prisma.product.findUnique({
    where: { vendorId_slug: { vendorId, slug: input.slug } },
  });
  if (slugExists) {
    const err = new Error("Product slug already exists for this vendor");
    (err as Error & { statusCode?: number }).statusCode = 409;
    throw err;
  }
  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category) {
    const err = new Error("Category not found");
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }
  return prisma.product.create({
    data: {
      vendorId,
      categoryId: input.categoryId,
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      status,
      images: input.images?.length
        ? { create: input.images.filter((img): img is { url: string; sortOrder: number } => !!img).map((img) => ({ url: img.url, sortOrder: img.sortOrder ?? 0 })) }
        : undefined,
      variants: {
        create: input.variants.map((v) => ({
          sku: v.sku ?? null,
          price: toDecimal(v.price),
          stock: v.stock,
          attributes: toJson(v.attributes),
        })),
      },
    },
    include: { images: true, variants: true, category: true },
  });
}

export async function updateProduct(
  productId: string,
  vendorId: string,
  userId: string,
  input: UpdateProductInput
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, vendorId, vendor: { userId } },
    include: { vendor: { select: { status: true } } },
  });
  if (!product) {
    const err = new Error("Product not found");
    (err as Error & { statusCode?: number }).statusCode = 404;
    throw err;
  }
  if (product.vendor.status === VendorStatus.SUSPENDED) {
    const err = new Error("Vendor is suspended");
    (err as Error & { statusCode?: number }).statusCode = 403;
    throw err;
  }
  if (input.status === "ACTIVE" && product.vendor.status !== VendorStatus.APPROVED) {
    const err = new Error("Vendor must be approved to activate products");
    (err as Error & { statusCode?: number }).statusCode = 403;
    throw err;
  }
  if (input.slug && input.slug !== product.slug) {
    const slugExists = await prisma.product.findUnique({
      where: { vendorId_slug: { vendorId, slug: input.slug } },
    });
    if (slugExists) {
      const err = new Error("Product slug already exists for this vendor");
      (err as Error & { statusCode?: number }).statusCode = 409;
      throw err;
    }
  }
  const updateData: Parameters<typeof prisma.product.update>[0]["data"] = {
    ...(input.categoryId != null && { categoryId: input.categoryId }),
    ...(input.name != null && { name: input.name }),
    ...(input.slug != null && { slug: input.slug }),
    ...(input.description !== undefined && { description: input.description ?? null }),
    ...(input.status != null && { status: input.status as ProductStatus }),
  };
  if (input.images) {
    await prisma.productImage.deleteMany({ where: { productId } });
    updateData.images = {
      create: input.images.map((img) => ({ url: img.url, sortOrder: img.sortOrder ?? 0 })),
    };
  }
  if (input.variants) {
    await prisma.productVariant.deleteMany({ where: { productId } });
    updateData.variants = {
      create: input.variants.map((v) => ({
        sku: v.sku ?? null,
        price: toDecimal(v.price),
        stock: v.stock,
        attributes: toJson(v.attributes),
      })),
    };
  }
  return prisma.product.update({
    where: { id: productId },
    data: updateData,
    include: { images: true, variants: true, category: true },
  });
}

export async function deleteProduct(productId: string, vendorId: string, userId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, vendorId, vendor: { userId } },
  });
  if (!product) {
    const err = new Error("Product not found");
    (err as Error & { statusCode?: number }).statusCode = 404;
    throw err;
  }
  return prisma.product.delete({ where: { id: productId } });
}

export async function getProductByVendorAndSlug(vendorId: string, slug: string) {
  return prisma.product.findUnique({
    where: { vendorId_slug: { vendorId, slug } },
    include: { images: true, variants: true, category: true, vendor: { include: { profile: true } } },
  });
}

export async function getProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: { images: true, variants: true, category: true, vendor: { include: { profile: true } } },
  });
}

/** Public list: ACTIVE products only, optional category filter */
export async function listProductsPublic(filters?: { categoryId?: string; categorySlug?: string }) {
  const where: { status: "ACTIVE"; categoryId?: string; category?: { slug: string } } = {
    status: "ACTIVE",
  };
  if (filters?.categoryId) where.categoryId = filters.categoryId;
  if (filters?.categorySlug) where.category = { slug: filters.categorySlug };
  return prisma.product.findMany({
    where,
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      variants: true,
      category: true,
      vendor: { include: { profile: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Vendor's own products */
export async function listProductsByVendor(vendorId: string, userId: string) {
  return prisma.product.findMany({
    where: { vendorId, vendor: { userId } },
    include: { images: true, variants: true, category: true },
    orderBy: { updatedAt: "desc" },
  });
}
