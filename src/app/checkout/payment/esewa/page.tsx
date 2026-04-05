"use client";

import { useEffect, useState } from "react";
import { fetchApiJson } from "@/lib/client/api-json";
import { PublicHeader } from "@/components/marketplace/public-header";

function postCancelPending(orderId: string) {
  return fetchApiJson(`/api/orders/${orderId}/payments/esewa/cancel`, { method: "POST" });
}

export default function EsewaReturnPage() {
  const [phase, setPhase] = useState<"loading" | "success" | "error" | "cancelled">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [orderIdOut, setOrderIdOut] = useState<string | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const data = sp.get("data");
    const failure = sp.get("failure");
    const orderId = sp.get("orderId");

    if (failure === "1") {
      void (async () => {
        if (orderId) {
          await postCancelPending(orderId);
        }
        setPhase("cancelled");
        setMessage(
          "Your eSewa session ended before completion. You can return to checkout and try again when you are ready.",
        );
      })();
      return;
    }

    if (!data) {
      setPhase("error");
      setMessage("We could not read the payment response. Please open your orders or try checkout again.");
      return;
    }

    void (async () => {
      try {
        const res = await fetchApiJson<{ order?: { id: string } }>("/api/payments/esewa/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        });
        if (!res.ok) {
          setPhase("error");
          setMessage(res.error);
          return;
        }
        setOrderIdOut(res.data.order?.id ?? null);
        setPhase("success");
        setMessage("Your payment was verified and your order is confirmed.");
      } catch (e) {
        setPhase("error");
        setMessage(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-stone-50/80">
      <PublicHeader />
      <main>
        <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 lg:px-8">
          <div
            className={`rounded-2xl border p-8 text-center shadow-sm ${
              phase === "success"
                ? "border-emerald-200 bg-white"
                : phase === "cancelled"
                  ? "border-amber-200 bg-amber-50/50"
                  : phase === "error"
                    ? "border-red-200 bg-red-50/50"
                    : "border-gray-200 bg-white"
            }`}
          >
            {phase === "loading" ? (
              <>
                <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                <h1 className="text-lg font-semibold text-gray-900">Confirming your payment…</h1>
                <p className="mt-2 text-sm text-gray-600">Please wait while we verify this with eSewa.</p>
              </>
            ) : null}

            {phase === "success" ? (
              <>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-xl font-semibold text-gray-900">Payment successful</h1>
                <p className="mt-2 text-sm text-gray-600">{message}</p>
                {orderIdOut ? (
                  <p className="mt-3 font-mono text-xs text-gray-500">Order reference: {orderIdOut}</p>
                ) : null}
                <a
                  href="/orders"
                  className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-orange-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-orange-700"
                >
                  View your orders
                </a>
              </>
            ) : null}

            {phase === "error" || phase === "cancelled" ? (
              <>
                <div
                  className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
                    phase === "cancelled" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-700"
                  }`}
                >
                  {phase === "cancelled" ? (
                    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  ) : (
                    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {phase === "cancelled" ? "Payment not completed" : "Payment could not be confirmed"}
                </h1>
                <p className="mt-2 text-sm text-gray-600">{message}</p>
                <a
                  href="/checkout"
                  className="mt-8 inline-flex w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-3.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50"
                >
                  Back to checkout
                </a>
              </>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
