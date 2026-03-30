"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchApiJson, formatValidationDetails } from "@/lib/client/api-json";

type MeUser = {
  id: string;
  email: string;
  role: "CUSTOMER" | "VENDOR" | "ADMIN";
  emailVerified: boolean;
};

type MeResponse = { user: MeUser | null };

type AdminVendorRow = {
  id: string;
  userId: string;
  status: "PENDING" | "APPROVED" | "SUSPENDED";
  approvedAt: string | null;
  approvedById: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string };
  profile: { businessName: string } | null;
};

type ListResponse = { vendors: AdminVendorRow[] };

type SingleVendorResponse = { vendor: AdminVendorRow };

type FilterMode = "pending" | "all" | "APPROVED" | "SUSPENDED";

function listUrl(mode: FilterMode): string {
  if (mode === "pending") return "/api/admin/vendors?pending=true";
  if (mode === "all") return "/api/admin/vendors";
  return `/api/admin/vendors?status=${mode}`;
}

export default function AdminVendorsPage() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeUser | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [vendors, setVendors] = useState<AdminVendorRow[]>([]);
  const [filter, setFilter] = useState<FilterMode>("pending");
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ id: string; message: string; details: string[] } | null>(null);

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
    const listRes = await fetchApiJson<ListResponse>(listUrl(filter));
    if (!listRes.ok) {
      setLoadError(listRes.error);
      setVendors([]);
      setLoading(false);
      return;
    }
    setVendors(listRes.data.vendors);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  async function approve(id: string) {
    setActionError(null);
    setActionId(id);
    const res = await fetchApiJson<SingleVendorResponse>(`/api/admin/vendors/${encodeURIComponent(id)}/approve`, {
      method: "POST",
    });
    setActionId(null);
    if (!res.ok) {
      setActionError({
        id,
        message: res.error,
        details: res.details ? formatValidationDetails(res.details) : [],
      });
      return;
    }
    setVendors((prev) => prev.map((v) => (v.id === id ? res.data.vendor : v)));
  }

  async function suspend(id: string) {
    setActionError(null);
    setActionId(id);
    const res = await fetchApiJson<SingleVendorResponse>(`/api/admin/vendors/${encodeURIComponent(id)}/suspend`, {
      method: "POST",
    });
    setActionId(null);
    if (!res.ok) {
      setActionError({
        id,
        message: res.error,
        details: res.details ? formatValidationDetails(res.details) : [],
      });
      return;
    }
    setVendors((prev) => prev.map((v) => (v.id === id ? res.data.vendor : v)));
  }

  if (loading && !me && !loadError) {
    return (
      <main className="mx-auto max-w-4xl p-8">
        <p className="text-gray-600">Loading…</p>
      </main>
    );
  }

  if (loadError && !me) {
    return (
      <main className="mx-auto max-w-4xl p-8">
        <p className="text-red-800">{loadError}</p>
        <button type="button" className="mt-4 text-sm text-blue-700 underline" onClick={() => void loadList()}>
          Retry
        </button>
        <a href="/" className="mt-4 block text-sm text-blue-700 underline">
          Home
        </a>
      </main>
    );
  }

  if (!me) {
    return (
      <main className="mx-auto max-w-4xl p-8">
        <h1 className="text-xl font-semibold">Admin · Vendors</h1>
        <p className="mt-3 text-gray-700">Sign in as an administrator to approve or suspend vendor accounts.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="/admin/login"
            className="inline-block rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-orange-700"
          >
            Admin sign in
          </a>
          <a
            href="/login?next=/admin/vendors"
            className="inline-block rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Sign in (return here)
          </a>
        </div>
        <a href="/" className="mt-6 block text-sm text-gray-600 underline">
          Home
        </a>
      </main>
    );
  }

  if (forbidden) {
    return (
      <main className="mx-auto max-w-4xl p-8">
        <h1 className="text-xl font-semibold">Admin · Vendors</h1>
        <p className="mt-3 text-gray-700">You need an admin account to access this page.</p>
        <p className="mt-1 text-sm text-gray-500">Signed in as {me.email} ({me.role})</p>
        <a href="/" className="mt-6 inline-block text-sm text-blue-700 underline">
          Home
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-xl font-semibold">Admin · Vendors</h1>
      <p className="mt-1 text-sm text-gray-600">{me.email}</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label htmlFor="filter" className="text-sm font-medium text-gray-700">
          View
        </label>
        <select
          id="filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterMode)}
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        >
          <option value="pending">Pending (moderation queue)</option>
          <option value="all">All vendors</option>
          <option value="APPROVED">Approved only</option>
          <option value="SUSPENDED">Suspended only</option>
        </select>
        <button
          type="button"
          className="text-sm text-blue-700 underline"
          onClick={() => void loadList()}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {loadError ? <p className="mt-4 text-sm text-red-800">{loadError}</p> : null}

      {loading ? (
        <p className="mt-6 text-gray-600">Loading vendors…</p>
      ) : vendors.length === 0 ? (
        <p className="mt-6 text-gray-600">No vendors in this view.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="py-2 pr-4 font-medium">Business</th>
                <th className="py-2 pr-4 font-medium">Account email</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Created</th>
                <th className="py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id} className="border-b border-gray-100">
                  <td className="py-2 pr-4">{v.profile?.businessName ?? "—"}</td>
                  <td className="py-2 pr-4">{v.user.email}</td>
                  <td className="py-2 pr-4">{v.status}</td>
                  <td className="py-2 pr-4 text-gray-600">{new Date(v.createdAt).toLocaleString()}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      {(v.status === "PENDING" || v.status === "SUSPENDED") && (
                        <button
                          type="button"
                          disabled={actionId === v.id}
                          className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
                          onClick={() => void approve(v.id)}
                        >
                          Approve
                        </button>
                      )}
                      {(v.status === "PENDING" || v.status === "APPROVED") && (
                        <button
                          type="button"
                          disabled={actionId === v.id}
                          className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
                          onClick={() => void suspend(v.id)}
                        >
                          Suspend
                        </button>
                      )}
                    </div>
                    {actionError?.id === v.id ? (
                      <div className="mt-2 text-xs text-red-800">
                        <p>{actionError.message}</p>
                        {actionError.details.length > 0 ? (
                          <ul className="mt-1 list-inside list-disc">
                            {actionError.details.map((d) => (
                              <li key={d}>{d}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <a href="/" className="mt-10 inline-block text-sm text-blue-700 underline">
        Home
      </a>
    </main>
  );
}
