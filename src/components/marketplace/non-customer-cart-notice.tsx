import { UserRole } from "@/types/enums";

type Props = {
  role: (typeof UserRole)[keyof typeof UserRole];
};

/** Shown when a signed-in user is not a CUSTOMER on cart/checkout (or similar). */
export function NonCustomerCartNotice({ role }: Props) {
  if (role === UserRole.ADMIN) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-8 text-center shadow-sm">
        <p className="text-gray-900">Admin accounts cannot purchase products or use the shopping cart.</p>
        <a
          href="/admin/analytics"
          className="mt-6 inline-flex w-full max-w-sm items-center justify-center rounded-xl bg-orange-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-orange-700"
        >
          Go to admin
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-8 text-center shadow-sm">
      <p className="text-gray-900">Vendor accounts cannot purchase products. Use a customer account to shop.</p>
      <a
        href="/vendor/dashboard"
        className="mt-6 inline-flex w-full max-w-sm items-center justify-center rounded-xl bg-orange-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-orange-700"
      >
        Go to vendor dashboard
      </a>
    </div>
  );
}
