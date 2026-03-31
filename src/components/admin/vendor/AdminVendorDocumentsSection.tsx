"use client";

import type { AdminVendorDetail } from "@/types/admin-vendor";

function fileLabel(url: string | null | undefined) {
  if (!url) return "—";
  try {
    const pathname = new URL(url).pathname;
    const last = pathname.split("/").filter(Boolean).pop();
    return last ?? url;
  } catch {
    return url;
  }
}

export function AdminVendorDocumentsSection({ vendor }: { vendor: AdminVendorDetail }) {
  const docUrl = vendor.profile?.documentUrl?.trim();

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-900">Documents</h2>
      <ul className="mt-4 space-y-3">
        <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-100 bg-stone-50/80 px-3 py-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Registration / KYC document</p>
            <p className="text-sm text-stone-800">{fileLabel(docUrl ?? null)}</p>
          </div>
          {docUrl ? (
            <a
              href={docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 hover:bg-stone-50"
            >
              View file
            </a>
          ) : null}
        </li>
      </ul>
    </section>
  );
}
