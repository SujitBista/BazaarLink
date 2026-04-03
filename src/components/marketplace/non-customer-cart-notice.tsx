/** Shown when a signed-in user is not a CUSTOMER on cart/checkout. */
export function NonCustomerCartNotice() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-8 text-center shadow-sm">
      <p className="text-gray-900">
        Vendors cannot place orders. Switch to a customer account to continue.
      </p>
      <a
        href="/vendor/dashboard"
        className="mt-6 inline-flex w-full max-w-sm items-center justify-center rounded-xl bg-orange-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-orange-700"
      >
        Go to vendor dashboard
      </a>
    </div>
  );
}
