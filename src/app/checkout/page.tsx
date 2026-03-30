"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchApiJson, formatValidationDetails } from "@/lib/client/api-json";

type Address = {
  id: string;
  line1: string;
  city: string;
  postalCode: string;
  country: string;
};

type Order = { id: string; status: string; totalAmount: string };

export default function CheckoutPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");

  const load = useCallback(async () => {
    setError(null);
    const res = await fetchApiJson<{ addresses: Address[] }>("/api/addresses");
    setLoading(false);
    if (!res.ok) {
      if (res.status === 401) {
        setError("Sign in to checkout.");
        return;
      }
      setError(res.error);
      return;
    }
    setAddresses(res.data.addresses);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (addresses.length > 0 && !addressId) {
      setAddressId(addresses[0].id);
    }
  }, [addresses, addressId]);

  async function createAddress(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetchApiJson<{ address: Address }>("/api/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ line1, city, postalCode, country }),
    });
    if (!res.ok) {
      setError(res.error);
      if (res.details) setError(res.error + " " + formatValidationDetails(res.details).join("; "));
      return;
    }
    setAddresses((a) => [res.data.address, ...a]);
    setAddressId(res.data.address.id);
    setLine1("");
    setCity("");
    setPostalCode("");
    setCountry("");
  }

  async function doCheckout() {
    if (!addressId) {
      setError("Select or create a shipping address.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetchApiJson<{ order: Order }>("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addressId }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setOrder(res.data.order);
  }

  async function doPay() {
    if (!order) return;
    setSubmitting(true);
    setError(null);
    const res = await fetchApiJson<{ order: Order }>(`/api/orders/${order.id}/pay`, { method: "POST" });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setOrder(res.data.order);
  }

  if (order?.status === "PAID") {
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="text-xl font-semibold text-gray-900">Payment complete</h1>
        <p className="mt-2 text-sm text-gray-600">Order {order.id} is paid.</p>
        <a href="/account/orders" className="mt-6 inline-block text-sm text-orange-700 underline">
          View orders
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-xl font-semibold text-gray-900">Checkout</h1>
      {loading ? <p className="mt-4 text-sm text-gray-600">Loading…</p> : null}
      {error ? <p className="mt-4 text-sm text-red-800">{error}</p> : null}

      {!order ? (
        <>
          <section className="mt-6">
            <h2 className="text-sm font-medium text-gray-700">Shipping address</h2>
            {addresses.length > 0 ? (
              <select
                className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={addressId}
                onChange={(e) => setAddressId(e.target.value)}
              >
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.line1}, {a.city}, {a.postalCode}, {a.country}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-2 text-sm text-gray-600">No saved addresses yet.</p>
            )}
          </section>

          <form onSubmit={(e) => void createAddress(e)} className="mt-8 space-y-3 rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-medium text-gray-700">Add address</h2>
            <input
              required
              placeholder="Line 1"
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="Postal code"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded bg-gray-200 px-3 py-2 text-sm font-medium">
              Save address
            </button>
          </form>

          <button
            type="button"
            disabled={submitting || !addressId}
            onClick={() => void doCheckout()}
            className="mt-8 w-full rounded-md bg-gray-900 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Placing order…" : "Place order"}
          </button>
        </>
      ) : (
        <section className="mt-6 rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">
            Order <span className="font-mono text-xs">{order.id}</span> — total ${order.totalAmount} — status{" "}
            {order.status}
          </p>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void doPay()}
            className="mt-4 w-full rounded-md bg-orange-600 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Processing…" : "Simulate payment"}
          </button>
          <p className="mt-2 text-xs text-gray-500">Dev: simulates PSP capture and records commissions.</p>
        </section>
      )}

      <a href="/cart" className="mt-8 inline-block text-sm text-gray-600 underline">
        Back to cart
      </a>
    </main>
  );
}
