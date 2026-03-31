"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchApiJson } from "@/lib/client/api-json";
import { AdminVendorApplicationRow } from "@/components/admin/vendor/AdminVendorApplicationRow";
import type { AdminVendorSummary } from "@/types/admin-vendor";
import type { VendorStatus } from "@/types/enums";

type MeUser = {
  id: string;
  email: string;
  role: "CUSTOMER" | "VENDOR" | "ADMIN";
};

type MeResponse = { user: MeUser | null };

type ListResponse = {
  vendors: AdminVendorSummary[];
  counts: Partial<Record<VendorStatus, number>>;
};

type StatusFilter = "ALL" | VendorStatus;

const SORT_OPTIONS = [
  { value: "created_desc", label: "Newest first" },
  { value: "created_asc", label: "Oldest first" },
  { value: "updated_desc", label: "Recently updated" },
] as const;

function buildListUrl(params: { status: StatusFilter; q: string; sort: string }) {
  const sp = new URLSearchParams();
  if (params.status !== "ALL") sp.set("status", params.status);
  if (params.q.trim()) sp.set("q", params.q.trim());
  if (params.sort && params.sort !== "created_desc") sp.set("sort", params.sort);
  const qs = sp.toString();
  return qs ? `/api/admin/vendors?${qs}` : "/api/admin/vendors";
}

export function AdminVendorApplicationList() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeUser | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [vendors, setVendors] = useState<AdminVendorSummary[]>([]);
  const [counts, setCounts] = useState<Partial<Record<VendorStatus, number>>>({});
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [qInput, setQInput] = useState("");
  const [qApplied, setQApplied] = useState("");
  const [sort, setSort] = useState<string>("created_desc");

  const loadList = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    const meRes = await fetchApiJson<MeResponse>("/api/auth/me");
    if (!meRes.ok) {
      setLoadError(meRes.error);
      setMe(null);
      setVendors([]);
      setLoading(false);
      return;
    }
    if (!meRes.data.user) {
      setMe(null);
      setForbidden(false);
      setVendors([]);
      setLoading(false);
      return;
    }
    setMe(meRes.data.user);
    if (meRes.data.user.role !== "ADMIN") {
      setForbidden(true);
      setVendors([]);
      setLoading(false);
      return;
    }
    setForbidden(false);
    const listRes = await fetchApiJson<ListResponse>(
      buildListUrl({ status: statusFilter, q: qApplied, sort })
    );
    if (!listRes.ok) {
      setLoadError(listRes.error);
      setVendors([]);
      setCounts({});
      setLoading(false);
      return;
    }
    setVendors(listRes.data.vendors);
    setCounts(listRes.data.counts ?? {});
    setLoading(false);
  }, [statusFilter, qApplied, sort]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    const t = window.setTimeout(() => setQApplied(qInput), 350);
    return () => window.clearTimeout(t);
  }, [qInput]);

  const filterOptions: { value: StatusFilter; label: string }[] = useMemo(
    () => [
      { value: "ALL", label: "All" },
      { value: "PENDING", label: "Pending" },
      { value: "CHANGES_REQUESTED", label: "Changes requested" },
      { value: "APPROVED", label: "Approved" },
      { value: "REJECTED", label: "Rejected" },
      { value: "SUSPENDED", label: "Suspended" },
      { value: "DRAFT", label: "Draft" },
    ],
    []
  );

  if (loading && !me && !loadError) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-8 text-stone-600 shadow-sm">Loading…</div>
    );
  }

  if (loadError && !me) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">
        <p>{loadError}</p>
        <button
          type="button"
          className="mt-3 text-sm font-medium text-red-800 underline"
          onClick={() => void loadList()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Vendor applications</h2>
        <p className="mt-2 text-stone-600">Sign in as an administrator to review vendor onboarding.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="/admin/login?next=/admin/vendors"
            className="inline-flex rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-orange-700"
          >
            Admin sign in
          </a>
        </div>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Access denied</h2>
        <p className="mt-2 text-stone-600">You need an admin account to view this page.</p>
        <p className="mt-1 text-sm text-stone-500">
          Signed in as {me.email} ({me.role})
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[min(100%,20rem)] flex-1">
          <label htmlFor="vendor-search" className="block text-xs font-medium uppercase tracking-wide text-stone-500">
            Search
          </label>
          <input
            id="vendor-search"
            type="search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Business name, email, PAN/VAT…"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
        <div>
          <label htmlFor="vendor-status" className="block text-xs font-medium uppercase tracking-wide text-stone-500">
            Status
          </label>
          <select
            id="vendor-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="mt-1 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            {filterOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
                {o.value !== "ALL" && counts[o.value as VendorStatus] != null
                  ? ` (${counts[o.value as VendorStatus]})`
                  : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="vendor-sort" className="block text-xs font-medium uppercase tracking-wide text-stone-500">
            Sort
          </label>
          <select
            id="vendor-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="mt-1 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
          onClick={() => void loadList()}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {loadError ? <p className="text-sm text-red-800">{loadError}</p> : null}

      {loading ? (
        <p className="text-stone-600">Loading applications…</p>
      ) : vendors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/80 px-6 py-12 text-center text-stone-600">
          No vendor applications found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <th className="py-3 pl-4 pr-4 font-semibold">Business</th>
                <th className="py-3 pr-4 font-semibold">Emails</th>
                <th className="py-3 pr-4 font-semibold">Type</th>
                <th className="py-3 pr-4 font-semibold">Status</th>
                <th className="py-3 pr-4 font-semibold">Dates</th>
                <th className="py-3 pr-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <AdminVendorApplicationRow key={v.id} vendor={v} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
