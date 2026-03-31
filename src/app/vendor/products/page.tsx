"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchApiJson, formatValidationDetails } from "@/lib/client/api-json";

type MeUser = {
  id: string;
  email: string;
  role: "CUSTOMER" | "VENDOR" | "ADMIN";
};

type MeResponse = { user: MeUser | null };

type VendorRow = {
  id: string;
  status: "PENDING" | "APPROVED" | "SUSPENDED";
  profile: { businessName: string } | null;
};

type VendorMeResponse = { vendor: VendorRow | null };

type CategoryNode = {
  id: string;
  name: string;
  children?: CategoryNode[];
};

type CategoriesResponse = { categories: CategoryNode[] };

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  status: "DRAFT" | "ACTIVE";
  category: { id: string; name: string };
  images?: { id: string; url: string; sortOrder: number }[];
  variants: { id: string; price: unknown; stock: number; sku: string | null }[];
};

type ProductsResponse = { products: ProductRow[] };

function flattenCategories(nodes: CategoryNode[], prefix = ""): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = [];
  for (const n of nodes) {
    const label = prefix ? `${prefix} › ${n.name}` : n.name;
    out.push({ id: n.id, label });
    if (n.children?.length) {
      out.push(...flattenCategories(n.children, label));
    }
  }
  return out;
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function VendorProductsPage() {
  const [me, setMe] = useState<MeUser | null | undefined>(undefined);
  /** `undefined` = not loaded yet (vendor role). */
  const [vendor, setVendor] = useState<VendorRow | null | undefined>(undefined);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formDetails, setFormDetails] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [sku, setSku] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    const meRes = await fetchApiJson<MeResponse>("/api/auth/me");
    if (!meRes.ok) {
      setMe(null);
      setVendor(undefined);
      setLoadError(meRes.error);
      return;
    }
    if (!meRes.data.user) {
      setMe(null);
      setVendor(undefined);
      return;
    }
    setMe(meRes.data.user);

    if (meRes.data.user.role !== "VENDOR") {
      setVendor(undefined);
      setProducts([]);
      return;
    }

    const vRes = await fetchApiJson<VendorMeResponse>("/api/vendors/me");
    if (!vRes.ok) {
      setLoadError(vRes.error);
      setVendor(undefined);
      setProducts([]);
      return;
    }
    setVendor(vRes.data.vendor);

    const pRes = await fetchApiJson<ProductsResponse>("/api/vendors/me/products");
    if (!pRes.ok) {
      setLoadError(pRes.error);
      setProducts([]);
      return;
    }
    setProducts(pRes.data.products);

    const cRes = await fetchApiJson<CategoriesResponse>("/api/categories");
    if (cRes.ok) {
      setCategories(flattenCategories(cRes.data.categories));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const approved = vendor?.status === "APPROVED";
  const canAdd = approved && categories.length > 0;

  const nextSlug = useMemo(() => slugify(name), [name]);
  const editingProduct = useMemo(() => products.find((p) => p.id === editingId) ?? null, [editingId, products]);

  useEffect(() => {
    if (!slugTouched && name) {
      setSlug(nextSlug);
    }
  }, [name, nextSlug, slugTouched]);

  async function uploadSelectedImage() {
    if (!imageFile) return null;
    setUploadingImage(true);
    const form = new FormData();
    form.append("file", imageFile);
    form.append("kind", "logo");
    const res = await fetchApiJson<{ url: string }>("/api/uploads/vendor", {
      method: "POST",
      body: form,
    });
    setUploadingImage(false);
    if (!res.ok) {
      setFormError(res.error);
      return null;
    }
    setUploadedImageUrl(res.data.url);
    return res.data.url;
  }

  function resetForm() {
    setName("");
    setSlug("");
    setSlugTouched(false);
    setDescription("");
    setPrice("");
    setStock("0");
    setSku("");
    setImageFile(null);
    setImagePreviewUrl(null);
    setUploadedImageUrl(null);
    setEditingId(null);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormDetails([]);
    const normalizedSlug = (slug.trim() || nextSlug).toLowerCase();
    const priceNum = Number(price);
    const stockNum = Number.parseInt(stock, 10);
    if (!name.trim()) {
      setFormError("Product name is required.");
      return;
    }
    if (!categoryId) {
      setFormError("Category is required.");
      return;
    }
    if (!normalizedSlug || !/^[a-z0-9-]+$/.test(normalizedSlug)) {
      setFormError("Slug must contain only lowercase letters, numbers, and hyphens.");
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setFormError("Enter a valid price.");
      return;
    }
    if (!Number.isFinite(stockNum) || stockNum < 0) {
      setFormError("Enter a valid stock quantity.");
      return;
    }

    let imageUrl = uploadedImageUrl;
    if (imageFile && !imageUrl) {
      imageUrl = await uploadSelectedImage();
      if (!imageUrl) return;
    }

    setSubmitting(true);
    const body = {
      categoryId,
      name: name.trim(),
      slug: normalizedSlug,
      description: description.trim() || undefined,
      status: editingId ? (editingProduct?.status ?? "DRAFT") : ("DRAFT" as const),
      images: imageUrl ? [{ url: imageUrl, sortOrder: 0 }] : undefined,
      variants: [{ price: priceNum, stock: stockNum, sku: sku.trim() || undefined }],
    };
    const res = editingId
      ? await fetchApiJson<{ product: unknown }>(`/api/vendors/me/products/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await fetchApiJson<{ product: unknown }>("/api/vendors/me/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
    setSubmitting(false);
    if (!res.ok) {
      setFormError(res.error);
      if (res.details) setFormDetails(formatValidationDetails(res.details));
      return;
    }
    resetForm();
    await load();
  }

  async function onPublish(productId: string) {
    setFormError(null);
    setFormDetails([]);
    setPublishingId(productId);
    const res = await fetchApiJson<{ product: unknown }>(`/api/vendors/me/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ACTIVE" }),
    });
    setPublishingId(null);
    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    await load();
  }

  function onEdit(product: ProductRow) {
    const firstVariant = product.variants[0];
    setEditingId(product.id);
    setName(product.name);
    setSlug(product.slug);
    setSlugTouched(true);
    setDescription("");
    setPrice(String(firstVariant?.price ?? ""));
    setStock(String(firstVariant?.stock ?? 0));
    setSku(firstVariant?.sku ?? "");
    setUploadedImageUrl(product.images?.[0]?.url ?? null);
    setImagePreviewUrl(product.images?.[0]?.url ?? null);
    setImageFile(null);
    setCategoryId(product.category.id);
  }

  useEffect(() => {
    if (categoryId || categories.length === 0) return;
    setCategoryId(categories[0].id);
  }, [categories, categoryId]);

  if (me === undefined && !loadError) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-gray-600">Loading…</p>
      </main>
    );
  }

  if (!me) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold text-gray-900">Vendor products</h1>
        <p className="mt-3 text-gray-700">Sign in to manage your catalog.</p>
        {loadError ? <p className="mt-3 text-sm text-red-800">{loadError}</p> : null}
        <a
          href="/vendor/login?next=/vendor/products"
          className="mt-6 inline-block rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-orange-700"
        >
          Sign in
        </a>
        <p className="mt-4 text-sm">
          <a href="/" className="text-orange-700 underline">
            Home
          </a>
        </p>
      </main>
    );
  }

  if (me.role !== "VENDOR") {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold text-gray-900">Vendor products</h1>
        <p className="mt-3 text-gray-700">This area is for vendor accounts. Complete vendor onboarding to list products.</p>
        <a href="/become-vendor" className="mt-6 inline-block text-sm text-orange-700 underline">
          Become a vendor
        </a>
      </main>
    );
  }

  if (vendor === undefined) {
    if (loadError) {
      return (
        <main className="mx-auto max-w-4xl px-4 py-10">
          <h1 className="text-2xl font-semibold text-gray-900">Vendor products</h1>
          <p className="mt-3 text-sm text-red-800">{loadError}</p>
          <button type="button" className="mt-4 text-sm text-orange-700 underline" onClick={() => void load()}>
            Retry
          </button>
        </main>
      );
    }
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-gray-600">Loading vendor profile…</p>
      </main>
    );
  }

  if (!vendor) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold text-gray-900">Vendor products</h1>
        <p className="mt-3 text-gray-700">You do not have a vendor profile yet. Finish onboarding first.</p>
        <a href="/vendor/onboarding" className="mt-6 inline-block text-sm text-orange-700 underline">
          Vendor onboarding
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">Vendor products</h1>
      <p className="mt-1 text-sm text-gray-600">
        {vendor.profile?.businessName ?? "Your store"} · signed in as {me.email}
      </p>

      <nav className="mt-5 flex flex-wrap gap-4 text-sm">
        <a href="/vendor/dashboard" className="text-gray-700 underline">
          Dashboard
        </a>
        <a href="/vendor/products" className="text-orange-700 underline">
          Products
        </a>
        <a href="/vendor/orders" className="text-gray-700 underline">
          Orders
        </a>
        <a href="/vendor/settings" className="text-gray-700 underline">
          Settings
        </a>
      </nav>

      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
        <span className="font-medium text-gray-800">Account status:</span>{" "}
        <span className="text-gray-700">{vendor.status}</span>
        {vendor.status === "PENDING" ? (
          <p className="mt-2 text-gray-600">
            An administrator must approve your vendor application before you can add products. You can still review this page and prepare your catalog.
          </p>
        ) : null}
        {vendor.status === "SUSPENDED" ? (
          <p className="mt-2 text-gray-600">Your selling access is suspended. Contact support if you believe this is a mistake.</p>
        ) : null}
        {vendor.status === "APPROVED" ? (
          <p className="mt-2 text-gray-600">Draft products are not visible until published.</p>
        ) : null}
      </div>

      {loadError ? <p className="mt-4 text-sm text-red-800">{loadError}</p> : null}

      <section className="mt-10">
        <h2 className="text-lg font-medium text-gray-900">Your products</h2>
        {products.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm">
            <p className="text-gray-700">You don’t have any products yet</p>
            <button
              type="button"
              onClick={() => {
                const form = document.getElementById("product-form");
                form?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="mt-3 rounded-md bg-orange-600 px-3 py-2 text-xs font-medium text-white hover:bg-orange-700"
            >
              Add your first product
            </button>
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {products.map((p) => (
              <li key={p.id} className="rounded border border-gray-200 px-3 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-600">Category: {p.category.name}</p>
                    <p className="text-xs text-gray-600">Price: ${String(p.variants[0]?.price ?? "-")}</p>
                    <p className="text-xs text-gray-600">Stock: {p.variants[0]?.stock ?? 0}</p>
                    <p className="text-xs text-gray-600">
                      Status:{" "}
                      <span className={p.status === "ACTIVE" ? "font-medium text-green-700" : "font-medium text-amber-700"}>
                        {p.status === "ACTIVE" ? "Active" : "Draft"}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(p)}
                      className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={p.status === "ACTIVE" || publishingId === p.id}
                      onClick={() => void onPublish(p.id)}
                      className="rounded bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {publishingId === p.id ? "Publishing..." : p.status === "ACTIVE" ? "Published" : "Publish"}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="product-form" className="mt-10 border-t border-gray-200 pt-10">
        <h2 className="text-lg font-medium text-gray-900">{editingId ? "Edit product" : "Add a product"}</h2>
        {!approved ? (
          <p className="mt-2 text-sm text-gray-600">Available only when your vendor status is <strong>APPROVED</strong>.</p>
        ) : !canAdd ? (
          <p className="mt-2 text-sm text-gray-600">Loading categories…</p>
        ) : (
          <form onSubmit={(e) => void onCreate(e)} className="mt-4 max-w-lg space-y-4">
            <div>
              <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">
                Category <span className="text-red-600">*</span>
              </label>
              <select
                id="categoryId"
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pname" className="block text-sm font-medium text-gray-700">
                Product name <span className="text-red-600">*</span>
              </label>
              <input
                id="pname"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="pslug" className="block text-sm font-medium text-gray-700">
                URL slug <span className="text-red-600">*</span>
              </label>
              <input
                id="pslug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                placeholder={nextSlug}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono text-xs"
              />
              <p className="mt-1 text-xs text-gray-500">Auto-generated from product name. You can edit it.</p>
            </div>
            <div>
              <label htmlFor="pdesc" className="block text-sm font-medium text-gray-700">
                Description (optional)
              </label>
              <textarea
                id="pdesc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                  Price <span className="text-red-600">*</span>
                </label>
                <input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
                  Stock <span className="text-red-600">*</span>
                </label>
                <input
                  id="stock"
                  type="number"
                  min="0"
                  required
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label htmlFor="sku" className="block text-sm font-medium text-gray-700">
                SKU (optional)
              </label>
              <input
                id="sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="pimage" className="block text-sm font-medium text-gray-700">
                Product image
              </label>
              <input
                id="pimage"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setImageFile(file);
                  setUploadedImageUrl(null);
                  if (file) {
                    setImagePreviewUrl(URL.createObjectURL(file));
                  } else {
                    setImagePreviewUrl(editingProduct?.images?.[0]?.url ?? null);
                  }
                }}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              {imagePreviewUrl ? (
                <img src={imagePreviewUrl} alt="Product preview" className="mt-3 h-24 w-24 rounded-md border border-gray-200 object-cover" />
              ) : null}
            </div>

            {formError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                <p>{formError}</p>
                {formDetails.length > 0 ? (
                  <ul className="mt-2 list-inside list-disc text-xs">
                    {formDetails.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting || uploadingImage || !categoryId}
              className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-orange-700 disabled:opacity-50"
            >
              {submitting ? "Saving..." : editingId ? "Save changes" : "Create draft product"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="ml-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            ) : null}
          </form>
        )}
      </section>
    </main>
  );
}
