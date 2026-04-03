"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchApiJson } from "@/lib/client/api-json";
import { UserRole } from "@/types/enums";
import { NonCustomerCartNotice } from "@/components/marketplace/non-customer-cart-notice";
import { PublicHeader } from "@/components/marketplace/public-header";

type CartItem = {
  id: string;
  quantity: number;
  productVariant: {
    id: string;
    price: string;
    product: {
      id: string;
      name: string;
      images: { id: string; url: string; sortOrder: number }[];
    };
  };
};

type Cart = { id: string; items: CartItem[] };

type CartSummary = {
  subtotal: string;
  shipping: string;
  tax: string;
  total: string;
};

type Address = {
  id: string;
  line1: string;
  city: string;
  postalCode: string;
  country: string;
};

type MeUser = {
  id: string;
  email: string;
  role: (typeof UserRole)[keyof typeof UserRole];
  emailVerified: boolean;
};

function formatMoney(amount: string | number) {
  const n = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  if (!Number.isFinite(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function lineSubtotal(price: string, qty: number) {
  const p = Number.parseFloat(price);
  if (!Number.isFinite(p)) return "0.00";
  return (p * qty).toFixed(2);
}

function TrustIndicators() {
  const items = [
    { label: "Secure checkout", icon: LockIcon },
    { label: "Payments protected", icon: ShieldIcon },
    { label: "Easy returns", icon: ReturnIcon },
  ];
  return (
    <ul className="mt-6 space-y-3 border-t border-gray-100 pt-5">
      {items.map(({ label, icon: Icon }) => (
        <li key={label} className="flex items-center gap-3 text-sm text-gray-600">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <Icon />
          </span>
          {label}
        </li>
      ))}
    </ul>
  );
}

function LockIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function ReturnIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
    </svg>
  );
}

export default function CartPage() {
  const [me, setMe] = useState<MeUser | null | undefined>(undefined);
  const [cart, setCart] = useState<Cart | null>(null);
  const [summary, setSummary] = useState<CartSummary | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [qtyUpdating, setQtyUpdating] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const cartRes = await fetchApiJson<{ cart: Cart; summary: CartSummary }>("/api/cart");
    setLoading(false);
    if (!cartRes.ok) {
      if (cartRes.status === 401) {
        setError("Sign in to view your cart.");
        return;
      }
      if (cartRes.status === 403) {
        setError(cartRes.error);
        return;
      }
      setError(cartRes.error);
      return;
    }
    setCart(cartRes.data.cart);
    setSummary(cartRes.data.summary);

    const addrRes = await fetchApiJson<{ addresses: Address[] }>("/api/addresses");
    if (addrRes.ok) {
      setAddresses(addrRes.data.addresses);
    }
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
    void refresh();
  }, [me, refresh]);

  async function updateQty(itemId: string, quantity: number) {
    if (quantity < 1 || quantity > 99) return;
    setQtyUpdating(itemId);
    const res = await fetchApiJson("/api/cart/items/" + itemId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    setQtyUpdating(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    void refresh();
  }

  async function remove(itemId: string) {
    const res = await fetchApiJson("/api/cart/items/" + itemId, { method: "DELETE" });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    void refresh();
  }

  const primary = cart && cart.items.length > 0 && summary;
  const blockedNonCustomer = me !== undefined && me !== null && me.role !== UserRole.CUSTOMER;

  return (
    <div className="min-h-screen bg-stone-50/80">
      <PublicHeader />
      <main>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">Shopping cart</h1>
            <p className="mt-1 text-sm text-gray-500">Review items and proceed when you&apos;re ready.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-4">
            <a
              href="/shop"
              className="text-sm font-medium text-orange-700 transition hover:text-orange-800"
            >
              ← Continue shopping
            </a>
          </div>
        </div>

        {me === undefined ? (
          <p className="text-gray-600">Loading your cart…</p>
        ) : null}
        {blockedNonCustomer && me ? <NonCustomerCartNotice role={me.role} /> : null}

        {!blockedNonCustomer && loading ? (
          <p className="text-gray-600">Loading your cart…</p>
        ) : null}
        {!blockedNonCustomer && error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
        ) : null}

        {!blockedNonCustomer && !loading && cart && cart.items.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <p className="text-gray-600">Your cart is empty.</p>
            <a
              href="/shop"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
            >
              Browse products
            </a>
          </div>
        ) : null}

        {!blockedNonCustomer && primary ? (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-12">
            <section aria-label="Cart items">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Items <span className="font-normal text-gray-500">({cart.items.length})</span>
                </h2>
              </div>
              <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                {cart.items.map((item) => {
                  const thumb = item.productVariant.product.images[0]?.url;
                  const busy = qtyUpdating === item.id;
                  return (
                    <li key={item.id} className="flex gap-4 p-4 sm:gap-5 sm:p-5">
                      <a
                        href={`/shop/product/${item.productVariant.product.id}`}
                        className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 sm:h-28 sm:w-28"
                      >
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                            No image
                          </span>
                        )}
                      </a>
                      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <a
                            href={`/shop/product/${item.productVariant.product.id}`}
                            className="font-medium text-gray-900 transition hover:text-orange-700"
                          >
                            {item.productVariant.product.name}
                          </a>
                          <p className="mt-1 text-sm text-gray-500">
                            {formatMoney(item.productVariant.price)} each
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white shadow-sm">
                              <button
                                type="button"
                                disabled={busy || item.quantity <= 1}
                                onClick={() => void updateQty(item.id, item.quantity - 1)}
                                className="flex h-9 w-9 items-center justify-center text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Decrease quantity"
                              >
                                −
                              </button>
                              <span className="min-w-[2.25rem] text-center text-sm font-medium tabular-nums text-gray-900">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                disabled={busy || item.quantity >= 99}
                                onClick={() => void updateQty(item.id, item.quantity + 1)}
                                className="flex h-9 w-9 items-center justify-center text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Increase quantity"
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => void remove(item.id)}
                              className="text-sm font-medium text-red-600 transition hover:text-red-700"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Subtotal</p>
                          <p className="mt-0.5 text-base font-semibold tabular-nums text-gray-900">
                            {formatMoney(lineSubtotal(item.productVariant.price, item.quantity))}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <aside className="space-y-6 lg:sticky lg:top-24">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-base font-semibold text-gray-900">Ship to</h2>
                {addresses.length > 0 ? (
                  <div className="mt-3 rounded-xl bg-stone-50 px-4 py-3 text-sm text-gray-700">
                    <p className="font-medium text-gray-900">{addresses[0].line1}</p>
                    <p className="mt-1 text-gray-600">
                      {addresses[0].city}, {addresses[0].postalCode}
                    </p>
                    <p className="text-gray-600">{addresses[0].country}</p>
                    <a
                      href="/checkout"
                      className="mt-3 inline-block text-sm font-medium text-orange-700 hover:text-orange-800"
                    >
                      Change at checkout
                    </a>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-gray-600">No saved address yet.</p>
                )}
                <a
                  href="/checkout"
                  className={`mt-4 flex w-full items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    addresses.length > 0
                      ? "border-gray-200 text-gray-800 hover:bg-gray-50"
                      : "border-orange-200 bg-orange-50 text-orange-900 hover:bg-orange-100"
                  }`}
                >
                  {addresses.length > 0 ? "Manage address" : "Add address"}
                </a>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-base font-semibold text-gray-900">Order summary</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-4 text-gray-600">
                    <dt>Subtotal</dt>
                    <dd className="tabular-nums text-gray-900">{formatMoney(summary.subtotal)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 text-gray-600">
                    <dt>Shipping</dt>
                    <dd className="tabular-nums text-gray-900">{formatMoney(summary.shipping)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 text-gray-600">
                    <dt>Tax</dt>
                    <dd className="tabular-nums text-gray-900">{formatMoney(summary.tax)}</dd>
                  </div>
                  <div className="border-t border-gray-100 pt-3">
                    <div className="flex justify-between gap-4 text-base font-semibold text-gray-900">
                      <dt>Total</dt>
                      <dd className="tabular-nums text-orange-700">{formatMoney(summary.total)}</dd>
                    </div>
                  </div>
                </dl>

                <a
                  href="/checkout"
                  className="mt-6 flex w-full items-center justify-center rounded-xl bg-orange-600 px-4 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
                >
                  Proceed to checkout
                </a>

                <TrustIndicators />
              </div>
            </aside>
          </div>
        ) : null}
      </div>
      </main>
    </div>
  );
}
