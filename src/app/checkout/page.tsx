"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchApiJson, formatValidationDetails } from "@/lib/client/api-json";
import { UserRole } from "@/types/enums";
import { NonCustomerCartNotice } from "@/components/marketplace/non-customer-cart-notice";
import { PublicHeader } from "@/components/marketplace/public-header";

type Address = {
  id: string;
  line1: string;
  city: string;
  postalCode: string;
  country: string;
};

type Order = { id: string; status: string; totalAmount: string };

type PaymentOptions = {
  mockPaymentEnabled: boolean;
};

type PaymentInfo = {
  id: string;
  status: string;
  amount: string;
  transactionUuid: string;
  externalId: string | null;
  createdAt: string;
} | null;

function formatMoney(amount: string | number) {
  const n = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  if (!Number.isFinite(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function paymentStatusLabel(status: string | undefined): string {
  switch (status) {
    case "PENDING":
      return "Awaiting payment";
    case "SUCCEEDED":
      return "Paid";
    case "FAILED":
      return "Failed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return "Not started";
  }
}

function submitPostForm(action: string, fields: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  form.enctype = "application/x-www-form-urlencoded";
  form.acceptCharset = "UTF-8";
  form.style.display = "none";
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

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
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | undefined>(undefined);
  const [paymentOptions, setPaymentOptions] = useState<PaymentOptions | null>(null);
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
    setOrder({
      id: res.data.order.id,
      status: res.data.order.status,
      totalAmount: String(res.data.order.totalAmount),
    });
  }

  const loadPaymentInfo = useCallback(async (orderId: string) => {
    const res = await fetchApiJson<{
      order: { id: string; status: string; totalAmount: string };
      payment: PaymentInfo;
    }>(`/api/orders/${orderId}/payment`);
    if (!res.ok) return;
    setPaymentInfo(res.data.payment);
    setOrder((prev) =>
      prev && prev.id === orderId
        ? { ...prev, status: res.data.order.status, totalAmount: res.data.order.totalAmount }
        : prev,
    );
  }, []);

  useEffect(() => {
    if (!order?.id) return;
    void loadPaymentInfo(order.id);
  }, [order?.id, loadPaymentInfo]);

  useEffect(() => {
    if (!order) return;
    void (async () => {
      const res = await fetchApiJson<PaymentOptions>("/api/payments/options");
      if (res.ok) setPaymentOptions(res.data);
    })();
  }, [order?.id]);

  async function payWithEsewa() {
    if (!order) return;
    setSubmitting(true);
    setError(null);
    const res = await fetchApiJson<{
      formAction: string;
      fields: Record<string, string>;
    }>(`/api/orders/${order.id}/payments/esewa/init`, { method: "POST" });
    if (!res.ok) {
      setSubmitting(false);
      setError(res.error);
      return;
    }
    submitPostForm(res.data.formAction, res.data.fields);
  }

  async function completeMockPayment() {
    if (!order) return;
    setSubmitting(true);
    setError(null);
    const res = await fetchApiJson<{ order: Order }>(`/api/orders/${order.id}/pay`, { method: "POST" });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setOrder({
      id: res.data.order.id,
      status: res.data.order.status,
      totalAmount: String(res.data.order.totalAmount),
    });
  }

  const blockedNonCustomer = me !== undefined && me !== null && me.role !== UserRole.CUSTOMER;

  if (order?.status === "PAID") {
    return (
      <div className="min-h-screen bg-stone-50/80">
        <PublicHeader />
        <main>
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
              href="/orders"
              className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-orange-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-orange-700"
            >
              View orders
            </a>
          </div>
        </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50/80">
      <PublicHeader />
      <main>
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">Checkout</h1>
          <p className="mt-1 text-sm text-gray-500">Enter shipping details and place your order.</p>
        </div>

        {me === undefined ? <p className="text-gray-600">Loading…</p> : null}
        {blockedNonCustomer && me ? <NonCustomerCartNotice role={me.role} /> : null}

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
          <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 shadow-[0_1px_0_rgba(15,23,42,0.06),0_12px_32px_rgba(15,23,42,0.06)] sm:p-8">
            <div className="border-b border-slate-100 bg-white/80 px-6 py-5 sm:px-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900">Pay securely</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    You will be redirected to eSewa to complete your payment securely.
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                  eSewa
                </span>
              </div>
            </div>

            <div className="space-y-5 px-6 py-6 sm:px-8">
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Payment method</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">eSewa</p>
                <p className="mt-1 text-xs text-slate-600">Mobile wallet · selected for this order</p>
              </div>

              <div className="rounded-xl border border-amber-100 bg-amber-50/90 p-4 text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/80">eSewa test (EPAYTEST)</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-amber-950/90">
                  <li>
                    Use <span className="font-mono font-semibold">one</span> test ID, e.g.{" "}
                    <span className="font-mono">9806800001</span> — not the whole &quot;9806800001/2/3/4/5&quot; line from
                    the docs.
                  </li>
                  <li>Password <span className="font-mono">Nepal@123</span>, MPIN <span className="font-mono">1122</span>;</li>
                  <li>
                    If login fails and reCAPTCHA shows a quota message, that is eSewa&apos;s sandbox (not this shop).
                    In local development you can use <strong>Complete payment (local simulation)</strong> below
                    instead, or try again later.
                  </li>
                </ul>
              </div>

              {paymentOptions?.mockPaymentEnabled ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-left">
                  <p className="text-xs font-semibold text-slate-800">Local simulation (development)</p>
                  <p className="mt-1 text-xs text-slate-600">
                    On by default in <code className="rounded bg-slate-200/80 px-1">next dev</code>; set{" "}
                    <code className="rounded bg-slate-200/80 px-1">ENABLE_MOCK_PAYMENT=false</code> to require real
                    eSewa.
                  </p>
                  <button
                    type="button"
                    disabled={
                      submitting ||
                      order.status !== "PENDING" ||
                      paymentInfo === undefined ||
                      paymentInfo?.status === "SUCCEEDED"
                    }
                    onClick={() => void completeMockPayment()}
                    className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? "Processing…" : "Complete payment (local simulation)"}
                  </button>
                </div>
              ) : null}

              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <dt className="text-xs font-medium text-slate-500">Total due</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                    {formatMoney(order.totalAmount)}
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <dt className="text-xs font-medium text-slate-500">Payment status</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">
                    {paymentInfo === undefined ? "Loading…" : paymentStatusLabel(paymentInfo?.status)}
                  </dd>
                </div>
                <div className="sm:col-span-2 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <dt className="text-xs font-medium text-slate-500">Order reference</dt>
                  <dd className="mt-1 break-all font-mono text-xs text-slate-800">{order.id}</dd>
                </div>
                {paymentInfo?.transactionUuid ? (
                  <div className="sm:col-span-2 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                    <dt className="text-xs font-medium text-slate-500">eSewa transaction reference</dt>
                    <dd className="mt-1 break-all font-mono text-xs text-slate-800">{paymentInfo.transactionUuid}</dd>
                  </div>
                ) : null}
              </dl>

              <button
                type="button"
                disabled={
                  submitting ||
                  order.status !== "PENDING" ||
                  paymentInfo === undefined ||
                  paymentInfo?.status === "SUCCEEDED"
                }
                onClick={() => void payWithEsewa()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 px-4 py-4 text-base font-semibold text-white shadow-md transition hover:from-orange-700 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Redirecting to eSewa…" : "Pay with eSewa"}
              </button>
              <p className="text-center text-xs text-slate-500">
                After paying, you&apos;ll return here briefly while we confirm your payment with eSewa.
              </p>
            </div>
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
    </div>
  );
}
