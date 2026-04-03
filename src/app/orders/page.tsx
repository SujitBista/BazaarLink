"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchApiJson } from "@/lib/client/api-json";
import { PublicHeader } from "@/components/marketplace/public-header";

type OrderItemRow = {
  id: string;
  quantity: number;
  price: string;
  productVariant: {
    id: string;
    product: { id: string; name: string };
  };
};

type OrderRow = {
  id: string;
  status: string;
  createdAt: string;
  totalAmount: string;
  items: OrderItemRow[];
};

function formatMoney(amount: string) {
  const n = Number.parseFloat(amount);
  if (!Number.isFinite(n)) return amount;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetchApiJson<{ orders: OrderRow[] }>("/api/orders");
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      setOrders(null);
      return;
    }
    setOrders(res.data.orders);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen bg-stone-50/80">
      <PublicHeader />
      <main>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">Your orders</h1>
            <p className="mt-1 text-sm text-gray-500">Order history and status for your account.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-4">
            <a href="/shop" className="text-sm font-medium text-orange-700 hover:text-orange-800">
              Continue shopping
            </a>
          </div>
        </div>

        {loading ? <p className="text-gray-600">Loading orders…</p> : null}
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
        ) : null}

        {!loading && !error && orders && orders.length === 0 ? (
          <p className="text-sm text-gray-600">
            No orders yet.{" "}
            <a href="/shop" className="font-medium text-orange-700 underline">
              Browse the shop
            </a>
          </p>
        ) : null}

        {!loading && orders && orders.length > 0 ? (
          <ul className="space-y-6">
            {orders.map((order) => (
              <li
                key={order.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-6">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Order</p>
                    <p className="font-mono text-sm text-gray-900">{order.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                    <p className="mt-1 inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-800">
                      {order.status}
                    </p>
                  </div>
                </div>
                <ul className="divide-y divide-gray-100 px-4 py-2 sm:px-6">
                  {order.items.map((line) => {
                    const unit = Number.parseFloat(line.price);
                    const lineTotal = Number.isFinite(unit) ? unit * line.quantity : NaN;
                    return (
                      <li key={line.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm">
                        <span className="text-gray-900">
                          {line.productVariant.product.name}
                          <span className="text-gray-500"> × {line.quantity}</span>
                        </span>
                        <span className="text-gray-700">
                          {Number.isFinite(lineTotal) ? formatMoney(lineTotal.toFixed(2)) : formatMoney(line.price)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex justify-end border-t border-gray-100 bg-stone-50/80 px-4 py-3 sm:px-6">
                  <p className="text-sm font-semibold text-gray-900">Total {formatMoney(order.totalAmount)}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      </main>
    </div>
  );
}
