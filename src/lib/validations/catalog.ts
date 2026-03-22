import { z } from "zod";
import { ProductStatus } from "@/types/enums";

export const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric and hyphens"),
  parentId: z.string().cuid().optional().nullable(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  parentId: z.string().cuid().optional().nullable(),
});

export const createProductSchema = z.object({
  categoryId: z.string().cuid(),
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric and hyphens"),
  description: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE"]).default("DRAFT"),
  images: z.array(z.object({ url: z.string().url(), sortOrder: z.number().int().min(0) }).optional()).optional(),
  variants: z.array(
    z.object({
      sku: z.string().optional(),
      price: z.number().positive(),
      stock: z.number().int().min(0),
      attributes: z.record(z.unknown()).optional(),
    })
  ).min(1, "At least one variant is required"),
});

export const updateProductSchema = z.object({
  categoryId: z.string().cuid().optional(),
  name: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE"]).optional(),
  images: z.array(z.object({ url: z.string().url(), sortOrder: z.number().int().min(0) })).optional(),
  variants: z.array(
    z.object({
      id: z.string().cuid().optional(),
      sku: z.string().optional(),
      price: z.number().positive(),
      stock: z.number().int().min(0),
      attributes: z.record(z.unknown()).optional(),
    })
  ).optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
