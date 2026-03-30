"use client";

import { useEffect, useState } from "react";
import { fetchApiJson } from "@/lib/client/api-json";

type Analytics = {
  users: number;
  orders: number;
  vendors: number;
  products: number;
  paidRevenueTotal: string;
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetchApiJson<Analytics>("/api/admin/analytics");
      if (!res.ok) {
        setError(res.status === 401 || res.status === 403 ? "Admin only." : res.error);
        return;
      }
      setData(res.data);
    })();
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
      <p className="mt-1 text-sm text-gray-600">High-level marketplace counts.</p>

      {error ? <p className="mt-4 text-sm text-red-800">{error}</p> : null}

      {data ? (
        <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 p-4">
            <dt className="text-xs text-gray-500">Users</dt>
            <dd className="text-2xl font-semibold">{data.users}</dd>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <dt className="text-xs text-gray-500">Orders</dt>
            <dd className="text-2xl font-semibold">{data.orders}</dd>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <dt className="text-xs text-gray-500">Vendors</dt>
            <dd className="text-2xl font-semibold">{data.vendors}</dd>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <dt className="text-xs text-gray-500">Products</dt>
            <dd className="text-2xl font-semibold">{data.products}</dd>
          </div>
          <div className="rounded-lg border border-gray-200 p-4 sm:col-span-2">
            <dt className="text-xs text-gray-500">Paid revenue (sum)</dt>
            <dd className="text-2xl font-semibold">${data.paidRevenueTotal}</dd>
          </div>
        </dl>
      ) : !error ? (
        <p className="mt-6 text-sm text-gray-600">Loading…</p>
      ) : null}

      <div className="mt-10 flex gap-4 text-sm">
        <a href="/admin/vendors" className="text-orange-700 underline">
          Vendors
        </a>
        <a href="/" className="text-gray-600 underline">
          Home
        </a>
      </div>
    </main>
  );
}
