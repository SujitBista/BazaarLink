"use client";

import { formatModerationActionKey } from "@/lib/admin/vendor-moderation";
import type { AdminVendorModerationLog } from "@/types/admin-vendor";

export function AdminVendorModerationHistory({ logs }: { logs: AdminVendorModerationLog[] }) {
  if (!logs.length) {
    return (
      <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Moderation history</h2>
        <p className="mt-2 text-sm text-stone-600">No moderation events recorded yet.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-900">Moderation history</h2>
      <ol className="mt-4 space-y-4 border-l border-stone-200 pl-4">
        {logs.map((log) => (
          <li key={log.id} className="relative">
            <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-orange-500 ring-4 ring-white" />
            <p className="text-sm font-semibold text-stone-900">{formatModerationActionKey(log.action)}</p>
            <p className="text-xs text-stone-500">
              {new Date(log.createdAt).toLocaleString()}
              {log.admin?.email ? ` · ${log.admin.email}` : ""}
            </p>
            {log.note ? (
              <p className="mt-1 rounded-md border border-stone-100 bg-stone-50 p-2 text-sm text-stone-800">{log.note}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
