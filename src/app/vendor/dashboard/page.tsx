"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchApiJson } from "@/lib/client/api-json";

type OrderItemRow = {
  id: string;
  quantity: number;
  price: string;
  order: { id: string; status: string; user: { email: string } };
  productVariant: { product: { name: string } };
};

export default function VendorDashboardPage() {
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetchApiJson<{ orderItems: OrderItemRow[] }>("/api/vendors/me/orders");
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        setError("Vendor access only. Complete onboarding and approval first.");
        return;
      }
      setError(res.error);
      return;
    }
    setItems(res.data.orderItems);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">Vendor dashboard</h1>
      <p className="mt-1 text-sm text-gray-600">Manage catalog and see orders that include your products.</p>

      <nav className="mt-6 flex flex-wrap gap-4 text-sm">
        <a href="/vendor/onboarding" className="text-orange-700 underline">
          Onboarding
        </a>
        <span className="text-gray-400">(Use API or future UI for products: /api/vendors/me/products)</span>
      </nav>

      {error ? <p className="mt-4 text-sm text-red-800">{error}</p> : null}

      <section className="mt-8">
        <h2 className="text-lg font-medium text-gray-900">Recent line items</h2>
        <ul className="mt-3 space-y-2">
          {items.map((row) => (
            <li key={row.id} className="rounded border border-gray-200 px-3 py-2 text-sm">
              <span className="font-medium">{row.productVariant.product.name}</span> × {row.quantity} — order{" "}
              <span className="font-mono text-xs">{row.order.id}</span> ({row.order.status}) — customer{" "}
              {row.order.user.email}
            </li>
          ))}
        </ul>
        {items.length === 0 && !error ? (
          <p className="mt-2 text-sm text-gray-500">No orders yet.</p>
        ) : null}
      </section>
    </main>
  );
}
