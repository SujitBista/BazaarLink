"use client";

import { AdminVendorStatusBadge } from "@/components/admin/vendor/AdminVendorStatusBadge";
import { getStatusMeta } from "@/lib/admin/vendor-moderation";
import type { AdminVendorDetail } from "@/types/admin-vendor";
import type { VendorStatus } from "@/types/enums";

export function AdminVendorReviewSummary({ vendor }: { vendor: AdminVendorDetail }) {
  const status = vendor.status as VendorStatus;
  const meta = getStatusMeta(status);

  return (
    <header className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <a href="/admin/vendors" className="text-sm font-medium text-orange-700 hover:text-orange-800">
            ← Back to applications
          </a>
          <h1 className="mt-2 text-2xl font-semibold text-stone-900">
            {vendor.profile?.businessName ?? "Vendor application"}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <AdminVendorStatusBadge status={status} />
            <span className="text-sm text-stone-500">{meta.description}</span>
          </div>
        </div>
      </div>
      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Vendor account email</dt>
          <dd className="mt-0.5 font-medium text-stone-900">{vendor.user.email}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Submitted</dt>
          <dd className="mt-0.5 text-stone-800">{new Date(vendor.createdAt).toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Last updated</dt>
          <dd className="mt-0.5 text-stone-800">{new Date(vendor.updatedAt).toLocaleString()}</dd>
        </div>
        {vendor.approvedAt ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Approved at</dt>
            <dd className="mt-0.5 text-stone-800">{new Date(vendor.approvedAt).toLocaleString()}</dd>
          </div>
        ) : null}
      </dl>
    </header>
  );
}
