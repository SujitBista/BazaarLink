"use client";

import { useEffect, useState } from "react";

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  images: { url: string }[];
  variants: { price: string }[];
  vendor: { id: string; profile: { businessName: string } | null };
};

export default function ShopPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/products", { credentials: "include" });
      const json = (await res.json()) as { products?: ProductRow[]; error?: string };
      if (cancelled) return;
      if (!res.ok) {
        setError(json.error ?? "Failed to load products");
        return;
      }
      setProducts(json.products ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Shop</h1>
          <p className="mt-1 text-sm text-gray-600">Active listings from approved sellers.</p>
        </div>
        <nav className="flex gap-4 text-sm">
          <a href="/cart" className="text-orange-700 underline">
            Cart
          </a>
          <a href="/" className="text-gray-600 underline">
            Home
          </a>
        </nav>
      </div>

      {error ? <p className="text-sm text-red-800">{error}</p> : null}

      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => {
          const img = p.images[0]?.url;
          const price = p.variants[0]?.price;
          return (
            <li key={p.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <a href={`/shop/product/${p.id}`} className="block">
                <div className="aspect-square w-full overflow-hidden rounded-md bg-gray-100">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-gray-400">No image</div>
                  )}
                </div>
                <h2 className="mt-3 font-medium text-gray-900">{p.name}</h2>
                <p className="mt-1 text-xs text-gray-500">{p.vendor.profile?.businessName ?? "Seller"}</p>
                {price != null ? <p className="mt-2 text-sm font-semibold text-gray-900">${price}</p> : null}
              </a>
            </li>
          );
        })}
      </ul>

      {products.length === 0 && !error ? (
        <p className="mt-8 text-sm text-gray-500">No products yet. Vendors can publish from the vendor dashboard.</p>
      ) : null}
    </main>
  );
}
