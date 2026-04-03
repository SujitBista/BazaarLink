"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchApiJson } from "@/lib/client/api-json";
import { ProductImage } from "@/components/product-image";

type Variant = { id: string; price: string; stock: number; sku: string | null };
type ProductDetail = {
  id: string;
  name: string;
  description: string | null;
  images: { url: string; sortOrder: number }[];
  variants: Variant[];
  vendor: { id: string; profile: { businessName: string } | null };
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = typeof params.productId === "string" ? params.productId : "";
  const isPreviewMode = searchParams.get("preview") === "vendor";
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/products/${productId}`, { credentials: "include" });
      const json = (await res.json()) as { product?: ProductDetail; error?: string };
      if (cancelled) return;
      if (!res.ok) {
        setError(json.error ?? "Not found");
        return;
      }
      if (json.product) {
        setProduct(json.product);
        const first = json.product.variants[0];
        if (first) setVariantId(first.id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(id);
  }, [toast]);

  async function addToCart() {
    if (!variantId || isPreviewMode) return;
    setAdding(true);
    setMsg(null);
    const res = await fetchApiJson<{ item: unknown }>("/api/cart/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productVariantId: variantId, quantity: qty }),
    });
    setAdding(false);
    if (!res.ok) {
      if (res.status === 401) {
        setMsg("Please sign in (e.g. via /become-vendor or your auth flow) to use the cart.");
        return;
      }
      if (res.status === 403) {
        setToast("Vendors cannot add items to cart");
        return;
      }
      setMsg(res.error);
      return;
    }
    router.push("/cart");
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-red-800">{error}</p>
        <a href="/shop" className="mt-4 inline-block text-sm text-orange-700 underline">
          Back to shop
        </a>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-gray-600">Loading…</p>
      </main>
    );
  }

  const img = product.images[0]?.url;
  const selected = product.variants.find((v) => v.id === variantId);

  return (
    <main className="relative mx-auto max-w-4xl px-4 py-10">
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-50 max-w-md -translate-x-1/2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-950 shadow-lg"
        >
          {toast}
        </div>
      ) : null}
      <a href={isPreviewMode ? "/vendor/products" : "/shop"} className="text-sm text-orange-700 underline">
        {isPreviewMode ? "← Back to vendor products" : "← Back to shop"}
      </a>
      {isPreviewMode ? (
        <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <p className="font-medium">Preview mode - this is how customers see your product</p>
          <a href={`/shop/product/${product.id}`} className="mt-1 inline-block text-blue-800 underline">
            Open public page
          </a>
        </div>
      ) : null}
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
          <ProductImage src={img} alt={product.name} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{product.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{product.vendor.profile?.businessName ?? "Seller"}</p>
          {product.description ? <p className="mt-4 text-sm text-gray-700">{product.description}</p> : null}

          <div className="mt-6 space-y-3">
            <label className="block text-sm font-medium text-gray-700" htmlFor="variant">
              Variant
            </label>
            <select
              id="variant"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
            >
              {product.variants.map((v) => (
                <option key={v.id} value={v.id} disabled={v.stock < 1}>
                  {v.sku ? `${v.sku} · ` : ""}${v.price} · stock {v.stock}
                </option>
              ))}
            </select>
            {!isPreviewMode ? (
              <div>
                <label className="text-sm font-medium text-gray-700" htmlFor="qty">
                  Quantity
                </label>
                <input
                  id="qty"
                  type="number"
                  min={1}
                  max={99}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value) || 1)}
                  className="mt-1 w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            ) : null}
          </div>

          {selected ? <p className="mt-4 text-lg font-semibold">${selected.price}</p> : null}

          {!isPreviewMode && msg ? <p className="mt-3 text-sm text-amber-800">{msg}</p> : null}

          {!isPreviewMode ? (
            <button
              type="button"
              disabled={adding || !selected || selected.stock < qty}
              onClick={() => void addToCart()}
              className="mt-6 w-full rounded-md bg-gray-900 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {adding ? "Adding…" : "Add to cart"}
            </button>
          ) : null}
        </div>
      </div>
    </main>
  );
}
