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

type VendorProfile = {
  id: string;
  vendorId: string;
  businessName: string;
  createdAt: string;
  updatedAt: string;
} | null;

type VendorRow = {
  id: string;
  userId: string;
  status: "PENDING" | "APPROVED" | "SUSPENDED";
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  profile: VendorProfile;
};

type VendorMeResponse = { vendor: VendorRow | null };

type OnboardingPostResponse = { vendor: VendorRow };

export default function VendorOnboardingPage() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeUser | null>(null);
  const [vendor, setVendor] = useState<VendorRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationLines, setValidationLines] = useState<string[]>([]);

  const refresh = useCallback(async () => {
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
    setMe(meRes.data.user);
    if (!meRes.data.user) {
      setVendor(null);
      setLoading(false);
      return;
    }
    const vRes = await fetchApiJson<VendorMeResponse>("/api/vendors/me");
    if (!vRes.ok) {
      setLoadError(vRes.error);
      setVendor(null);
      setLoading(false);
      return;
    }
    setVendor(vRes.data.vendor);
    const p = vRes.data.vendor?.profile;
    if (p) {
      setBusinessName(p.businessName);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setValidationLines([]);
    setSubmitting(true);
    const payload = {
      businessName: businessName.trim(),
      documentUrl: documentUrl.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
    };
    const res = await fetchApiJson<OnboardingPostResponse>("/api/vendors/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (!res.ok) {
      setSubmitError(res.error);
      if (res.details) setValidationLines(formatValidationDetails(res.details));
      return;
    }
    setVendor(res.data.vendor);
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-lg p-8">
        <p className="text-gray-600">Loading…</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-lg p-8">
        <p className="text-red-800">{loadError}</p>
        <button type="button" className="mt-4 text-sm text-blue-700 underline" onClick={() => void refresh()}>
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
      <main className="mx-auto max-w-lg p-8">
        <h1 className="text-xl font-semibold">Vendor onboarding</h1>
        <p className="mt-3 text-gray-700">Sign in to submit vendor onboarding.</p>
        <p className="mt-4 text-sm text-gray-500">
          There is no sign-in page in this app yet; use{" "}
          <code className="rounded bg-gray-200 px-1">POST /api/auth/login</code> with your session cookie, then return
          here.
        </p>
        <a href="/" className="mt-6 inline-block text-sm text-blue-700 underline">
          Home
        </a>
      </main>
    );
  }

  if (!me.emailVerified) {
    return (
      <main className="mx-auto max-w-lg p-8">
        <h1 className="text-xl font-semibold">Vendor onboarding</h1>
        <p className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-gray-800">
          Your email address must be verified before you can submit vendor onboarding. Check your inbox for a
          verification link, or use the verification API if your client triggers it.
        </p>
        <p className="mt-2 text-sm text-gray-600">Signed in as {me.email}</p>
        <a href="/" className="mt-6 inline-block text-sm text-blue-700 underline">
          Home
        </a>
      </main>
    );
  }

  if (me.role === "ADMIN") {
    return (
      <main className="mx-auto max-w-lg p-8">
        <h1 className="text-xl font-semibold">Vendor onboarding</h1>
        <p className="mt-3 text-gray-700">Admin accounts cannot submit vendor onboarding.</p>
        <a href="/" className="mt-6 inline-block text-sm text-blue-700 underline">
          Home
        </a>
      </main>
    );
  }

  const status = vendor?.status;
  const canEdit = !vendor || status === "PENDING";

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-xl font-semibold">Vendor onboarding</h1>
      <p className="mt-1 text-sm text-gray-600">Signed in as {me.email}</p>

      {vendor ? (
        <section className="mt-6 rounded border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-medium text-gray-500">Current status</h2>
          <p className="mt-1 text-lg font-semibold">{vendor.status}</p>
          {vendor.approvedAt ? (
            <p className="mt-1 text-xs text-gray-500">Approved at: {new Date(vendor.approvedAt).toLocaleString()}</p>
          ) : null}
          {vendor.profile ? (
            <p className="mt-2 text-sm text-gray-700">
              Business: <span className="font-medium">{vendor.profile.businessName}</span>
            </p>
          ) : null}
        </section>
      ) : (
        <p className="mt-4 text-gray-700">You have not submitted onboarding yet.</p>
      )}

      {!canEdit ? (
        <p className="mt-6 text-sm text-gray-600">
          Updates are only allowed while status is PENDING. Contact support if your application needs changes.
        </p>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4">
          <div>
            <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">
              Business name
            </label>
            <input
              id="businessName"
              name="businessName"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="documentUrl" className="block text-sm font-medium text-gray-700">
              Document URL (optional)
            </label>
            <input
              id="documentUrl"
              name="documentUrl"
              type="url"
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              placeholder="https://…"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">
              Contact email (optional)
            </label>
            <input
              id="contactEmail"
              name="contactEmail"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700">
              Contact phone (optional)
            </label>
            <input
              id="contactPhone"
              name="contactPhone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          {submitError ? (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              <p>{submitError}</p>
              {validationLines.length > 0 ? (
                <ul className="mt-2 list-inside list-disc text-xs">
                  {validationLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Submitting…" : vendor ? "Update application" : "Submit application"}
          </button>
        </form>
      )}

      <a href="/" className="mt-8 inline-block text-sm text-blue-700 underline">
        Home
      </a>
    </main>
  );
}
