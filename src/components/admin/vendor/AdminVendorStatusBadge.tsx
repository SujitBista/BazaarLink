"use client";

import { getStatusMeta } from "@/lib/admin/vendor-moderation";
import type { VendorStatus } from "@/types/enums";

export function AdminVendorStatusBadge({ status }: { status: VendorStatus | string }) {
  const meta = getStatusMeta(status as VendorStatus);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClassName}`}
    >
      {meta.label}
    </span>
  );
}
