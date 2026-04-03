"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { ShopHeaderNav } from "@/components/marketplace/shop-header-nav";

type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: CategoryNode[];
};

type ProductRow = ProductCardData & {
  slug: string;
  category: { name: string; slug: string };
  vendor: ProductCardData["vendor"] & { id: string };
};

function buildCategoryTree(flat: { id: string; name: string; slug: string; parentId: string | null }[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();
  for (const c of flat) {
    byId.set(c.id, { ...c, children: [] });
  }
  const roots: CategoryNode[] = [];
  for (const c of Array.from(byId.values())) {
    if (c.parentId) {
      const parent = byId.get(c.parentId);
      if (parent) parent.children.push(c);
      else roots.push(c);
    } else {
      roots.push(c);
    }
  }
  const sortTree = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const n of nodes) sortTree(n.children);
  };
  sortTree(roots);
  return roots;
}

type Props = {
  initialCategorySlug: string;
  initialQ: string;
};

export default function ShopBrowse({ initialCategorySlug, initialQ }: Props) {
  const router = useRouter();
  const categorySlug = initialCategorySlug;
  const q = initialQ;

  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchDraft, setSearchDraft] = useState(q);

  useEffect(() => {
    setSearchDraft(q);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/categories", { credentials: "include" });
      const json = (await res.json()) as { categories?: { id: string; name: string; slug: string; parentId: string | null }[]; error?: string };
      if (cancelled) return;
      if (!res.ok) {
        setError(json.error ?? "Failed to load categories");
        return;
      }
      const flat = json.categories ?? [];
      setCategories(buildCategoryTree(flat));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (categorySlug) params.set("categorySlug", categorySlug);
    if (q.trim()) params.set("q", q.trim());

    void (async () => {
      setLoading(true);
      const res = await fetch(`/api/products?${params.toString()}`, { credentials: "include" });
      const json = (await res.json()) as { products?: ProductRow[]; error?: string };
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setError(json.error ?? "Failed to load products");
        return;
      }
      setError(null);
      setProducts(json.products ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [categorySlug, q]);

  const setFilters = useCallback(
    (next: { categorySlug?: string; q?: string }) => {
      const p = new URLSearchParams();
      const cat = next.categorySlug !== undefined ? next.categorySlug : categorySlug;
      const query = next.q !== undefined ? next.q : q;
      if (cat) p.set("category", cat);
      if (query.trim()) p.set("q", query.trim());
      const qs = p.toString();
      router.push(qs ? `/shop?${qs}` : "/shop");
    },
    [router, categorySlug, q]
  );

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ q: searchDraft });
  };

  const activeLabel = useMemo(() => {
    if (!categorySlug) return "All categories";
    const find = (nodes: CategoryNode[]): string | null => {
      for (const n of nodes) {
        if (n.slug === categorySlug) return n.name;
        const inner = find(n.children);
        if (inner) return inner;
      }
      return null;
    };
    return find(categories) ?? categorySlug;
  }, [categories, categorySlug]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Shop</h1>
          <p className="mt-1 text-sm text-gray-600">Browse by category or search active listings from approved sellers.</p>
        </div>
        <ShopHeaderNav />
      </div>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 rounded-lg border border-gray-200 bg-gray-50 p-4 lg:w-56">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Categories</h2>
          <ul className="mt-3 space-y-1 text-sm">
            <li>
              <button
                type="button"
                onClick={() => setFilters({ categorySlug: "" })}
                className={`w-full rounded px-2 py-1.5 text-left ${!categorySlug ? "bg-white font-medium text-orange-800 shadow-sm" : "text-gray-700 hover:bg-white/80"}`}
              >
                All products
              </button>
            </li>
            {categories.map((cat) => (
              <CategoryNavItem key={cat.id} node={cat} depth={0} activeSlug={categorySlug} onPick={(slug) => setFilters({ categorySlug: slug })} />
            ))}
          </ul>
        </aside>

        <div className="min-w-0 flex-1">
          <form onSubmit={onSearchSubmit} className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="sr-only" htmlFor="shop-search">
              Search products
            </label>
            <input
              id="shop-search"
              type="search"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Search by name or description…"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            <button type="submit" className="rounded-md bg-orange-700 px-4 py-2 text-sm font-medium text-white shadow hover:bg-orange-800">
              Search
            </button>
          </form>

          <p className="mb-4 text-sm text-gray-600">
            {loading ? (
              "Loading…"
            ) : (
              <>
                <span className="font-medium text-gray-900">{activeLabel}</span>
                {q.trim() ? (
                  <>
                    {" "}
                    · results for &ldquo;{q.trim()}&rdquo;
                  </>
                ) : null}{" "}
                ({products.length} {products.length === 1 ? "product" : "products"})
              </>
            )}
          </p>

          {error ? <p className="text-sm text-red-800">{error}</p> : null}

          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </ul>

          {!loading && products.length === 0 && !error ? (
            <p className="mt-8 text-sm text-gray-500">No products match your filters. Try another category or search term.</p>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function CategoryNavItem(props: {
  node: CategoryNode;
  depth: number;
  activeSlug: string;
  onPick: (slug: string) => void;
}) {
  const { node, depth, activeSlug, onPick } = props;
  const isActive = activeSlug === node.slug;
  const pad = 8 + depth * 12;
  return (
    <li>
      <button
        type="button"
        style={{ paddingLeft: pad }}
        onClick={() => onPick(node.slug)}
        className={`w-full rounded px-2 py-1.5 text-left ${isActive ? "bg-white font-medium text-orange-800 shadow-sm" : "text-gray-700 hover:bg-white/80"}`}
      >
        {node.name}
      </button>
      {node.children.length > 0 ? (
        <ul className="mt-0.5 space-y-1">
          {node.children.map((ch) => (
            <CategoryNavItem key={ch.id} node={ch} depth={depth + 1} activeSlug={activeSlug} onPick={onPick} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
