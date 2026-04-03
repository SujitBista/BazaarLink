"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchApiJson, formatValidationDetails } from "@/lib/client/api-json";
import { UserRole } from "@/types/enums";
import { NonCustomerCartNotice } from "@/components/marketplace/non-customer-cart-notice";

type Address = {
  id: string;
  line1: string;
  city: string;
  postalCode: string;
  country: string;
};

type Order = { id: string; status: string; totalAmount: string };

type MeUser = {
  id: string;
  email: string;
  role: (typeof UserRole)[keyof typeof UserRole];
  emailVerified: boolean;
};

function TrustIndicators() {
  const items = [
    {
      label: "Secure checkout",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      ),
    },
    {
      label: "Payments protected",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      ),
    },
    {
      label: "Easy returns",
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />,
    },
  ];
  return (
    <ul className="mt-8 grid gap-3 sm:grid-cols-3">
      {items.map(({ label, icon }) => (
        <li
          key={label}
          className="flex items-center gap-2 rounded-xl border border-gray-100 bg-stone-50/80 px-3 py-2.5 text-xs font-medium text-gray-600"
        >
          <svg className="h-4 w-4 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {icon}
          </svg>
          {label}
        </li>
      ))}
    </ul>
  );
}

export default function CheckoutPage() {
  const [me, setMe] = useState<MeUser | null | undefined>(undefined);
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
    void (async () => {
      const meRes = await fetchApiJson<{ user: MeUser | null }>("/api/auth/me");
      if (!meRes.ok) {
        setMe(null);
        return;
      }
      setMe(meRes.data.user);
    })();
  }, []);

  useEffect(() => {
    if (me === undefined) return;
    if (me && me.role !== UserRole.CUSTOMER) {
      setLoading(false);
      return;
    }
    void load();
  }, [me, load]);

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
      if (res.status === 403) {
        setError(res.error);
        return;
      }
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

  const blockedNonCustomer = me !== undefined && me !== null && me.role !== UserRole.CUSTOMER;

  if (order?.status === "PAID") {
    return (
      <main className="min-h-screen bg-stone-50/80">
        <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Payment complete</h1>
            <p className="mt-2 text-sm text-gray-600">Order {order.id} is paid.</p>
            <a
              href="/account/orders"
              className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-orange-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-orange-700"
            >
              View orders
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50/80">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">Checkout</h1>
          <p className="mt-1 text-sm text-gray-500">Enter shipping details and place your order.</p>
        </div>

        {me === undefined ? <p className="text-gray-600">Loading…</p> : null}
        {blockedNonCustomer ? <NonCustomerCartNotice /> : null}

        {!blockedNonCustomer && loading ? <p className="text-gray-600">Loading…</p> : null}
        {!blockedNonCustomer && error ? (
          <p className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
        ) : null}

        {!blockedNonCustomer && !order ? (
          <>
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-base font-semibold text-gray-900">Shipping address</h2>
              <p className="mt-1 text-sm text-gray-500">Where should we deliver this order?</p>

              {addresses.length > 0 ? (
                <div className="mt-5">
                  <label htmlFor="address-select" className="sr-only">
                    Choose saved address
                  </label>
                  <select
                    id="address-select"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none ring-orange-500/20 transition focus:border-orange-400 focus:ring-4"
                    value={addressId}
                    onChange={(e) => setAddressId(e.target.value)}
                  >
                    {addresses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.line1}, {a.city}, {a.postalCode}, {a.country}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-600">No saved addresses yet. Add one below.</p>
              )}
            </section>

            <form
              onSubmit={(e) => void createAddress(e)}
              className="mt-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
            >
              <h2 className="text-base font-semibold text-gray-900">Add address</h2>
              <div className="space-y-3">
                <input
                  required
                  placeholder="Street address"
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none ring-orange-500/20 transition focus:border-orange-400 focus:ring-4"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    required
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none ring-orange-500/20 transition focus:border-orange-400 focus:ring-4"
                  />
                  <input
                    required
                    placeholder="Postal code"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none ring-orange-500/20 transition focus:border-orange-400 focus:ring-4"
                  />
                </div>
                <input
                  required
                  placeholder="Country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none ring-orange-500/20 transition focus:border-orange-400 focus:ring-4"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl border border-gray-200 bg-stone-50 px-5 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-stone-100"
              >
                Save address
              </button>
            </form>

            <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <button
                type="button"
                disabled={submitting || !addressId}
                onClick={() => void doCheckout()}
                className="flex w-full items-center justify-center rounded-xl bg-orange-600 px-4 py-4 text-base font-semibold text-white shadow-md transition hover:bg-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Placing order…" : "Place order"}
              </button>
              <TrustIndicators />
            </div>
          </>
        ) : !blockedNonCustomer && order ? (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-base font-semibold text-gray-900">Payment</h2>
            <p className="mt-3 text-sm text-gray-600">
              Order <span className="font-mono text-xs text-gray-800">{order.id}</span>
              <span className="mx-2 text-gray-300">·</span>
              Total{" "}
              <span className="font-semibold text-gray-900">
                {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                  Number.parseFloat(order.totalAmount) || 0,
                )}
              </span>
              <span className="mx-2 text-gray-300">·</span>
              Status {order.status}
            </p>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void doPay()}
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-orange-600 px-4 py-4 text-base font-semibold text-white shadow-md transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Processing…" : "Simulate payment"}
            </button>
            <p className="mt-3 text-xs text-gray-500">Dev: simulates PSP capture and records commissions.</p>
          </section>
        ) : null}

        {!blockedNonCustomer ? (
          <a
            href="/cart"
            className="mt-10 inline-flex text-sm font-medium text-gray-600 transition hover:text-gray-900"
          >
            ← Back to cart
          </a>
        ) : null}
      </div>
    </main>
  );
}
