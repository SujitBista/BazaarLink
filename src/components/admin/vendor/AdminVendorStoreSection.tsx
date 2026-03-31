"use client";

import type { AdminVendorDetail } from "@/types/admin-vendor";

export function AdminVendorStoreSection({ vendor }: { vendor: AdminVendorDetail }) {
  const p = vendor.profile;
  const slug = p?.storeSlug?.trim();
  const storeUrl = slug ? `/store/${slug}` : null;

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-900">Store profile</h2>
      <div className="mt-4 flex flex-col gap-6 sm:flex-row">
        <div className="shrink-0">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Store logo</p>
          {p?.storeLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.storeLogoUrl}
              alt="Store logo"
              className="mt-2 h-24 w-24 rounded-lg border border-stone-200 object-cover"
            />
          ) : (
            <p className="mt-2 text-sm text-stone-500">No logo uploaded</p>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Description</dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-sm text-stone-900">
              {p?.storeDescription?.trim() ? p.storeDescription : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Public store URL</dt>
            <dd className="mt-0.5 text-sm">
              {storeUrl ? (
                <a
                  href={storeUrl}
                  className="font-medium text-orange-700 underline hover:text-orange-800"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {storeUrl}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Categories</dt>
            <dd className="mt-0.5 text-sm text-stone-900">
              {p?.categories?.length ? p.categories.join(", ") : "—"}
            </dd>
          </div>
        </div>
      </div>
    </section>
  );
}
