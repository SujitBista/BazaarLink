"use client";

export default function VendorOrdersPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">Vendor orders</h1>
      <p className="mt-2 text-sm text-gray-600">Orders section is coming soon.</p>

      <nav className="mt-6 flex flex-wrap gap-4 text-sm">
        <a href="/vendor/dashboard" className="text-gray-700 underline">
          Dashboard
        </a>
        <a href="/vendor/products" className="text-gray-700 underline">
          Products
        </a>
        <a href="/vendor/orders" className="text-orange-700 underline">
          Orders
        </a>
        <a href="/vendor/settings" className="text-gray-700 underline">
          Settings
        </a>
      </nav>
    </main>
  );
}
