"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { fetchApiJson } from "@/lib/client/api-json";
import { AdminVendorBusinessSection } from "@/components/admin/vendor/AdminVendorBusinessSection";
import { AdminVendorDocumentsSection } from "@/components/admin/vendor/AdminVendorDocumentsSection";
import { AdminVendorModerationHistory } from "@/components/admin/vendor/AdminVendorModerationHistory";
import { AdminVendorModerationPanel } from "@/components/admin/vendor/AdminVendorModerationPanel";
import { AdminVendorReviewSummary } from "@/components/admin/vendor/AdminVendorReviewSummary";
import { AdminVendorStoreSection } from "@/components/admin/vendor/AdminVendorStoreSection";
import type { AdminVendorDetail } from "@/types/admin-vendor";
import type { VendorStatus } from "@/types/enums";

type MeUser = {
  id: string;
  email: string;
  role: "CUSTOMER" | "VENDOR" | "ADMIN";
};

type MeResponse = { user: MeUser | null };

type VendorResponse = { vendor: AdminVendorDetail };

export function VendorDetailClient() {
  const params = useParams();
  const vendorId = typeof params.vendorId === "string" ? params.vendorId : "";

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeUser | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [vendor, setVendor] = useState<AdminVendorDetail | null>(null);

  const loadVendor = useCallback(async () => {
    if (!vendorId) return;
    setLoadError(null);
    setLoading(true);
    const meRes = await fetchApiJson<MeResponse>("/api/auth/me");
    if (!meRes.ok) {
      setLoadError(meRes.error);
      setMe(null);
      setVendor(null);
      setLoading(false);
      return;
    }
    if (!meRes.data.user) {
      setMe(null);
      setForbidden(false);
      setVendor(null);
      setLoading(false);
      return;
    }
    setMe(meRes.data.user);
    if (meRes.data.user.role !== "ADMIN") {
      setForbidden(true);
      setVendor(null);
      setLoading(false);
      return;
    }
    setForbidden(false);

    const res = await fetchApiJson<VendorResponse>(`/api/admin/vendors/${encodeURIComponent(vendorId)}`);
    if (!res.ok) {
      setLoadError(res.error);
      setVendor(null);
      setLoading(false);
      return;
    }
    setVendor(res.data.vendor);
    setLoading(false);
  }, [vendorId]);

  useEffect(() => {
    void loadVendor();
  }, [loadVendor]);

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
          onClick={() => void loadVendor()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Vendor application</h2>
        <p className="mt-2 text-stone-600">Sign in as an administrator to review this application.</p>
        <a
          href={`/admin/login?next=/admin/vendors/${encodeURIComponent(vendorId)}`}
          className="mt-4 inline-flex rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-orange-700"
        >
          Admin sign in
        </a>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Access denied</h2>
        <p className="mt-2 text-stone-600">You need an admin account to view this page.</p>
      </div>
    );
  }

  if (loading || !vendor) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-8 text-stone-600 shadow-sm">
        {loadError ? (
          <div>
            <p className="text-red-800">{loadError}</p>
            <button
              type="button"
              className="mt-3 text-sm font-medium text-orange-800 underline"
              onClick={() => void loadVendor()}
            >
              Retry
            </button>
          </div>
        ) : (
          "Loading application…"
        )}
      </div>
    );
  }

  const status = vendor.status as VendorStatus;

  return (
    <div className="space-y-8">
      <AdminVendorReviewSummary vendor={vendor} />

      <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="space-y-6">
          <AdminVendorBusinessSection vendor={vendor} />
          <AdminVendorStoreSection vendor={vendor} />
          <AdminVendorDocumentsSection vendor={vendor} />
          <AdminVendorModerationHistory logs={vendor.moderationLogs} />
        </div>
        <AdminVendorModerationPanel
          vendorId={vendor.id}
          status={status}
          rejectionReason={vendor.rejectionReason}
          onModerated={() => void loadVendor()}
        />
      </div>
    </div>
  );
}
