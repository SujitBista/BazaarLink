"use client";

import { AdminVendorStatusBadge } from "@/components/admin/vendor/AdminVendorStatusBadge";
import type { AdminVendorSummary } from "@/types/admin-vendor";
import type { VendorStatus } from "@/types/enums";

function businessTypeLabel(t: "INDIVIDUAL" | "COMPANY" | null | undefined) {
  if (t === "INDIVIDUAL") return "Individual";
  if (t === "COMPANY") return "Company";
  return "—";
}

function categorySummary(categories: string[] | undefined): string {
  if (!categories?.length) return "—";
  if (categories.length <= 3) return categories.join(", ");
  return `${categories.slice(0, 3).join(", ")} +${categories.length - 3}`;
}

export function AdminVendorApplicationRow({ vendor }: { vendor: AdminVendorSummary }) {
  const status = vendor.status as VendorStatus;
  const pendingHighlight = status === "PENDING";

  return (
    <tr
      className={`border-b border-stone-100 ${pendingHighlight ? "bg-amber-50/60" : "bg-white"}`}
    >
      <td className="py-3 pr-4 align-top">
        <div className="font-medium text-stone-900">{vendor.profile?.businessName ?? "—"}</div>
        <div className="mt-0.5 text-xs text-stone-500">{categorySummary(vendor.profile?.categories)}</div>
      </td>
      <td className="py-3 pr-4 align-top text-sm text-stone-700">
        <div>{vendor.user.email}</div>
        {vendor.profile?.contactEmail && vendor.profile.contactEmail !== vendor.user.email ? (
          <div className="text-xs text-stone-500">{vendor.profile.contactEmail}</div>
        ) : null}
      </td>
      <td className="py-3 pr-4 align-top text-sm text-stone-600">{businessTypeLabel(vendor.profile?.businessType ?? null)}</td>
      <td className="py-3 pr-4 align-top">
        <AdminVendorStatusBadge status={status} />
      </td>
      <td className="py-3 pr-4 align-top text-sm text-stone-600">
        <div>{new Date(vendor.createdAt).toLocaleString()}</div>
        <div className="text-xs text-stone-500">Updated {new Date(vendor.updatedAt).toLocaleString()}</div>
      </td>
      <td className="py-3 align-top">
        <a
          href={`/admin/vendors/${encodeURIComponent(vendor.id)}`}
          className="inline-flex rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 hover:bg-stone-50"
        >
          Review
        </a>
      </td>
    </tr>
  );
}
