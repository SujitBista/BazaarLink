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

type VendorMeResponse = {
  vendor: { id: string; status: "PENDING" | "APPROVED" | "SUSPENDED"; profile: { businessName: string } | null } | null;
};

type ProductCountResponse = { products: Array<{ id: string }> };

export default function VendorDashboardPage() {
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [productsCount, setProductsCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [showApprovalBanner, setShowApprovalBanner] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setNeedsSignIn(false);
    const [ordersRes, productsRes, vendorRes] = await Promise.all([
      fetchApiJson<{ orderItems: OrderItemRow[] }>("/api/vendors/me/orders"),
      fetchApiJson<ProductCountResponse>("/api/vendors/me/products"),
      fetchApiJson<VendorMeResponse>("/api/vendors/me"),
    ]);

    if (!ordersRes.ok) {
      if (ordersRes.status === 401) {
        setNeedsSignIn(true);
        setError("Sign in with a vendor account to view this dashboard.");
        return;
      }
      if (ordersRes.status === 403) {
        setError("Vendor access only. Complete onboarding and approval first.");
        return;
      }
      setError(ordersRes.error);
      return;
    }
    setItems(ordersRes.data.orderItems);
    setOrdersCount(ordersRes.data.orderItems.length);

    if (productsRes.ok) {
      setProductsCount(productsRes.data.products.length);
    }

    if (vendorRes.ok && vendorRes.data.vendor?.status === "APPROVED") {
      const key = `vendor-approved-banner-seen-${vendorRes.data.vendor.id}`;
      const alreadySeen = localStorage.getItem(key) === "1";
      if (!alreadySeen) {
        setShowApprovalBanner(true);
        localStorage.setItem(key, "1");
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">Vendor dashboard</h1>
      <p className="mt-1 text-sm text-gray-600">Manage catalog and see orders that include your products.</p>

      <nav className="mt-6 flex flex-wrap gap-4 text-sm">
        <a href="/vendor/dashboard" className="text-orange-700 underline">
          Dashboard
        </a>
        <a href="/vendor/products" className="text-gray-700 underline">
          Products
        </a>
        <a href="/vendor/orders" className="text-gray-700 underline">
          Orders
        </a>
        <a href="/vendor/settings" className="text-gray-700 underline">
          Settings
        </a>
      </nav>

      {showApprovalBanner ? (
        <div className="mt-5 flex items-start justify-between gap-3 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          <p>🎉 Your store is approved! Start selling now.</p>
          <button type="button" onClick={() => setShowApprovalBanner(false)} className="text-xs font-medium underline">
            Dismiss
          </button>
        </div>
      ) : null}

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">Products</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{productsCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">Orders</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{ordersCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">Revenue</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">--</p>
        </div>
      </section>

      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <p>{error}</p>
          {needsSignIn ? (
            <a href="/vendor/login?next=/vendor/dashboard" className="mt-2 inline-block font-medium text-orange-800 underline">
              Sign in
            </a>
          ) : null}
        </div>
      ) : null}

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
