"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductCard, type ProductCardData } from "@/components/product-card";

type Props = {
  initialQ: string;
};

export default function HomeContent({ initialQ }: Props) {
  const router = useRouter();
  const q = initialQ;
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchDraft, setSearchDraft] = useState(q);

  useEffect(() => {
    setSearchDraft(q);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/products?${params.toString()}`, { credentials: "include" });
        let json: { products?: ProductCardData[]; error?: string } = {};
        try {
          json = (await res.json()) as { products?: ProductCardData[]; error?: string };
        } catch {
          if (!cancelled) {
            setError("Invalid response from server.");
            setProducts([]);
          }
          return;
        }
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error ?? "Failed to load products");
          setProducts([]);
          return;
        }
        setError(null);
        setProducts(json.products ?? []);
      } catch {
        if (!cancelled) {
          setError("Could not load products. Check your connection and try again.");
          setProducts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchDraft.trim();
    router.push(trimmed ? `/?q=${encodeURIComponent(trimmed)}` : "/");
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <a href="/" className="text-lg font-semibold tracking-tight text-stone-900">
            BazaarLink
          </a>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <a href="/shop" className="font-medium text-orange-800 hover:text-orange-900">
              Shop
            </a>
            <a href="/cart" className="text-stone-600 hover:text-stone-900">
              Cart
            </a>
            <a href="/checkout" className="text-stone-600 hover:text-stone-900">
              Checkout
            </a>
            <a href="/become-vendor" className="text-stone-600 hover:text-stone-900">
              Sell
            </a>
            <a href="/orders" className="text-stone-600 hover:text-stone-900">
              Orders
            </a>
            <a href="/vendor" className="text-stone-500 hover:text-stone-800">
              Vendor
            </a>
            <a href="/admin/vendors" className="text-stone-500 hover:text-stone-800">
              Admin
            </a>
          </nav>
        </div>
      </header>

      <section className="border-b border-orange-100 bg-gradient-to-b from-orange-50 to-amber-50/40">
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:pb-16 sm:pt-14">
          <p className="text-sm font-medium uppercase tracking-wide text-orange-900/70">Marketplace</p>
          <h1 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            Discover products from independent sellers
          </h1>
          <p className="mt-3 max-w-xl text-stone-600">
            Search the catalog, then explore categories and filters on the full shop.
          </p>

          <form onSubmit={onSearchSubmit} className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-stretch">
            <label className="sr-only" htmlFor="home-search">
              Search products
            </label>
            <input
              id="home-search"
              type="search"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Search by name or description…"
              className="min-h-[44px] flex-1 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            />
            <button
              type="submit"
              className="min-h-[44px] rounded-lg bg-orange-800 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-orange-900"
            >
              Search
            </button>
          </form>
          <p className="mt-3 text-sm text-stone-500">
            <a href="/shop" className="font-medium text-orange-900 underline decoration-orange-300 underline-offset-2 hover:text-orange-950">
              Browse all categories
            </a>
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-stone-900">
            {q.trim() ? `Results for “${q.trim()}”` : "Popular picks"}
          </h2>
          {!loading ? (
            <span className="text-sm text-stone-500">
              {products.length} {products.length === 1 ? "product" : "products"}
            </span>
          ) : (
            <span className="text-sm text-stone-400">Loading…</span>
          )}
        </div>

        {error ? <p className="text-sm text-red-800">{error}</p> : null}

        {loading ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <li key={i} className="animate-pulse rounded-lg border border-stone-200 bg-white p-4">
                <div className="aspect-square rounded-md bg-stone-200" />
                <div className="mt-3 h-3 w-1/4 rounded bg-stone-200" />
                <div className="mt-2 h-4 w-3/4 rounded bg-stone-200" />
                <div className="mt-2 h-3 w-1/2 rounded bg-stone-200" />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </ul>
        )}

        {!loading && products.length === 0 && !error ? (
          <p className="mt-4 text-stone-600">
            No products match that search.{" "}
            <a href="/" className="font-medium text-orange-900 underline">
              Clear search
            </a>{" "}
            or try the{" "}
            <a href="/shop" className="font-medium text-orange-900 underline">
              shop
            </a>
            .
          </p>
        ) : null}
      </main>
    </div>
  );
}
