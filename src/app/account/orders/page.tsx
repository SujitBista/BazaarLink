"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchApiJson } from "@/lib/client/api-json";

type OrderRow = {
  id: string;
  status: string;
  totalAmount: string;
  createdAt: string;
};

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetchApiJson<{ orders: OrderRow[] }>("/api/orders");
    setLoading(false);
    if (!res.ok) {
      if (res.status === 401) {
        setError("Sign in to view orders.");
        return;
      }
      setError(res.error);
      return;
    }
    setOrders(res.data.orders);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function pay(orderId: string) {
    const res = await fetchApiJson(`/api/orders/${orderId}/pay`, { method: "POST" });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    void load();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">My orders</h1>
      {loading ? <p className="mt-4 text-sm text-gray-600">Loading…</p> : null}
      {error ? <p className="mt-4 text-sm text-red-800">{error}</p> : null}

      <ul className="mt-6 space-y-3">
        {orders.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 px-4 py-3">
            <div>
              <p className="font-mono text-xs text-gray-500">{o.id}</p>
              <p className="text-sm text-gray-900">
                ${o.totalAmount} · {o.status}
              </p>
              <p className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleString()}</p>
            </div>
            {o.status === "PENDING" ? (
              <button
                type="button"
                onClick={() => void pay(o.id)}
                className="rounded bg-orange-600 px-3 py-1.5 text-xs font-medium text-white"
              >
                Pay
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      {orders.length === 0 && !loading && !error ? (
        <p className="mt-6 text-sm text-gray-600">No orders yet.</p>
      ) : null}

      <a href="/shop" className="mt-8 inline-block text-sm text-orange-700 underline">
        Shop
      </a>
    </main>
  );
}
