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
  businessType: "INDIVIDUAL" | "COMPANY" | null;
  panOrVatNumber: string | null;
  businessRegistrationNumber: string | null;
  businessAddress: {
    province: string | null;
    city: string | null;
    fullAddress: string | null;
  };
  bankDetails: {
    bankName: string | null;
    accountNumber: string | null;
    accountHolder: string | null;
  };
  storeProfile: {
    logoUrl: string | null;
    description: string | null;
    slug: string | null;
  };
  categories: string[];
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: string;
  updatedAt: string;
} | null;

type VendorRow = {
  id: string;
  userId: string;
  status: "PENDING" | "APPROVED" | "SUSPENDED";
  rejectionReason: string | null;
  termsAccepted: boolean;
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
  const [businessType, setBusinessType] = useState<"individual" | "company">("individual");
  const [panOrVatNumber, setPanOrVatNumber] = useState("");
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState("");
  const [businessAddressProvince, setBusinessAddressProvince] = useState("");
  const [businessAddressCity, setBusinessAddressCity] = useState("");
  const [businessAddressFull, setBusinessAddressFull] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [storeLogoUrl, setStoreLogoUrl] = useState("");
  const [storeDescription, setStoreDescription] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [categoriesText, setCategoriesText] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [documentUrl, setDocumentUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [step, setStep] = useState(1);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationLines, setValidationLines] = useState<string[]>([]);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [devVerifyUrl, setDevVerifyUrl] = useState<string | null>(null);
  const [urlFlags, setUrlFlags] = useState<{
    emailVerified: boolean;
    verifyError: string | null;
    checkEmail: boolean;
  }>({ emailVerified: false, verifyError: null, checkEmail: false });

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setUrlFlags({
      emailVerified: sp.get("emailVerified") === "1",
      verifyError: sp.get("verifyError"),
      checkEmail: sp.get("checkEmail") === "1",
    });
  }, []);

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
      setBusinessType(p.businessType === "COMPANY" ? "company" : "individual");
      if (p.panOrVatNumber) setPanOrVatNumber(p.panOrVatNumber);
      if (p.businessRegistrationNumber) setBusinessRegistrationNumber(p.businessRegistrationNumber);
      if (p.businessAddress.province) setBusinessAddressProvince(p.businessAddress.province);
      if (p.businessAddress.city) setBusinessAddressCity(p.businessAddress.city);
      if (p.businessAddress.fullAddress) setBusinessAddressFull(p.businessAddress.fullAddress);
      if (p.bankDetails.bankName) setBankName(p.bankDetails.bankName);
      if (p.bankDetails.accountNumber) setBankAccountNumber(p.bankDetails.accountNumber);
      if (p.bankDetails.accountHolder) setBankAccountHolder(p.bankDetails.accountHolder);
      if (p.storeProfile.logoUrl) setStoreLogoUrl(p.storeProfile.logoUrl);
      if (p.storeProfile.description) setStoreDescription(p.storeProfile.description);
      if (p.storeProfile.slug) setStoreSlug(p.storeProfile.slug);
      if (p.categories.length > 0) setCategoriesText(p.categories.join(", "));
      if (p.contactEmail) setContactEmail(p.contactEmail);
      if (p.contactPhone) setContactPhone(p.contactPhone);
    } else if (!vRes.data.vendor && meRes.data.user) {
      setContactEmail((prev) => (prev.trim() ? prev : meRes.data.user!.email));
    }
    setTermsAccepted(Boolean(vRes.data.vendor?.termsAccepted));
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    try {
      const u = sessionStorage.getItem("bazaarlink_dev_email_verify_url");
      if (u) setDevVerifyUrl(u);
    } catch {
      /* ignore */
    }
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (!me) return;
    setResendState("sending");
    const res = await fetchApiJson<{ ok: boolean }>("/api/auth/verify/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: me.email }),
    });
    setResendState(res.ok ? "sent" : "error");
  }, [me]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setValidationLines([]);
    setSubmitting(true);
    const categories = categoriesText
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    const payload = {
      businessName: businessName.trim(),
      businessType,
      panOrVatNumber: panOrVatNumber.trim(),
      businessRegistrationNumber: businessRegistrationNumber.trim(),
      businessAddress: {
        province: businessAddressProvince.trim(),
        city: businessAddressCity.trim(),
        fullAddress: businessAddressFull.trim(),
      },
      bankDetails: {
        bankName: bankName.trim(),
        accountNumber: bankAccountNumber.trim(),
        accountHolder: bankAccountHolder.trim(),
      },
      storeProfile: {
        logoUrl: storeLogoUrl.trim(),
        description: storeDescription.trim(),
        slug: storeSlug.trim(),
      },
      categories,
      termsAccepted,
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
        <a
          href="/vendor/login?next=/vendor/onboarding"
          className="mt-4 inline-block text-sm font-medium text-orange-700 underline"
        >
          Vendor sign in
        </a>
        <p className="mt-3 text-sm text-gray-600">
          New seller?{" "}
          <a href="/vendor/signup" className="font-medium text-orange-700 underline">
            Create an account
          </a>
        </p>
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
  const emailVerifiedJustNow = urlFlags.emailVerified;
  const canSubmit = canEdit && me.emailVerified;
  const stepLabels = ["Business details", "Address and bank", "Store profile"];

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-xl font-semibold text-gray-900">Vendor onboarding</h1>
      <p className="mt-1 text-sm text-gray-600">Signed in as {me.email}</p>

      {!me.emailVerified ? (
        <section className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-gray-800">
          <p>
            Your seller application can be submitted now, but you should still verify {me.email} to avoid delays.
          </p>
          {urlFlags.verifyError ? (
            <p className="mt-2 text-red-900">
              {urlFlags.verifyError === "missing_token"
                ? "Verification link was incomplete. Request a new email below."
                : "That verification link is invalid or expired. Request a new one below."}
            </p>
          ) : null}
          {urlFlags.checkEmail ? <p className="mt-2">We sent you a verification link. Open it when you can.</p> : null}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={resendState === "sending"}
              onClick={() => {
                void resendVerificationEmail();
              }}
              className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {resendState === "sending" ? "Sending…" : "Resend verification email"}
            </button>
            {resendState === "sent" ? (
              <span className="text-sm text-green-800">Check your inbox for the new link.</span>
            ) : null}
            {resendState === "error" ? (
              <span className="text-sm text-red-800">Could not send. Try again shortly.</span>
            ) : null}
          </div>
          {devVerifyUrl ? (
            <p className="mt-3 break-all text-xs text-stone-700">
              Dev link:{" "}
              <a href={devVerifyUrl} className="text-orange-800 underline">
                Open verification link
              </a>
            </p>
          ) : null}
        </section>
      ) : null}

      {emailVerifiedJustNow ? (
        <p className="mt-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          Email verified — you can submit your seller application below.
        </p>
      ) : null}

      {vendor ? (
        <section className="mt-6 rounded border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-medium text-gray-500">Current status</h2>
          <p className="mt-1 text-lg font-semibold">{vendor.status}</p>
          {vendor.approvedAt ? (
            <p className="mt-1 text-xs text-gray-500">Approved at: {new Date(vendor.approvedAt).toLocaleString()}</p>
          ) : null}
          {vendor.rejectionReason ? (
            <p className="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
              Rejection reason: {vendor.rejectionReason}
            </p>
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
          <div className="rounded border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-600">Step {step} of 3</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{stepLabels[step - 1]}</p>
          </div>

          {step === 1 ? (
            <>
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
                <label htmlFor="businessType" className="block text-sm font-medium text-gray-700">
                  Business type
                </label>
                <select
                  id="businessType"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value as "individual" | "company")}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="individual">Individual</option>
                  <option value="company">Company</option>
                </select>
              </div>
              <div>
                <label htmlFor="panOrVatNumber" className="block text-sm font-medium text-gray-700">
                  PAN or VAT number
                </label>
                <input
                  id="panOrVatNumber"
                  value={panOrVatNumber}
                  onChange={(e) => setPanOrVatNumber(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="businessRegistrationNumber" className="block text-sm font-medium text-gray-700">
                  Business registration number (optional)
                </label>
                <input
                  id="businessRegistrationNumber"
                  value={businessRegistrationNumber}
                  onChange={(e) => setBusinessRegistrationNumber(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div>
                <label htmlFor="businessAddressProvince" className="block text-sm font-medium text-gray-700">
                  Province
                </label>
                <input
                  id="businessAddressProvince"
                  value={businessAddressProvince}
                  onChange={(e) => setBusinessAddressProvince(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="businessAddressCity" className="block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  id="businessAddressCity"
                  value={businessAddressCity}
                  onChange={(e) => setBusinessAddressCity(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="businessAddressFull" className="block text-sm font-medium text-gray-700">
                  Full business address
                </label>
                <textarea
                  id="businessAddressFull"
                  value={businessAddressFull}
                  onChange={(e) => setBusinessAddressFull(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="bankName" className="block text-sm font-medium text-gray-700">
                  Bank name
                </label>
                <input
                  id="bankName"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="bankAccountNumber" className="block text-sm font-medium text-gray-700">
                  Account number
                </label>
                <input
                  id="bankAccountNumber"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="bankAccountHolder" className="block text-sm font-medium text-gray-700">
                  Account holder
                </label>
                <input
                  id="bankAccountHolder"
                  value={bankAccountHolder}
                  onChange={(e) => setBankAccountHolder(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <div>
                <label htmlFor="storeLogoUrl" className="block text-sm font-medium text-gray-700">
                  Store logo URL (optional)
                </label>
                <input
                  id="storeLogoUrl"
                  type="url"
                  value={storeLogoUrl}
                  onChange={(e) => setStoreLogoUrl(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="storeDescription" className="block text-sm font-medium text-gray-700">
                  Store description
                </label>
                <textarea
                  id="storeDescription"
                  value={storeDescription}
                  onChange={(e) => setStoreDescription(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="storeSlug" className="block text-sm font-medium text-gray-700">
                  Store slug
                </label>
                <input
                  id="storeSlug"
                  value={storeSlug}
                  onChange={(e) => setStoreSlug(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="categories" className="block text-sm font-medium text-gray-700">
                  Categories (comma separated)
                </label>
                <input
                  id="categories"
                  value={categoriesText}
                  onChange={(e) => setCategoriesText(e.target.value)}
                  placeholder="fashion, home, electronics"
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
              <label className="flex items-start gap-2 rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5"
                />
                <span>I accept the vendor onboarding terms and policy.</span>
              </label>
            </>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 disabled:opacity-50"
            >
              Previous
            </button>
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(3, s + 1))}
                className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting || !canSubmit}
                className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {submitting ? "Submitting…" : vendor ? "Update application" : "Submit application"}
              </button>
            )}
          </div>
          {!me.emailVerified ? (
            <p className="text-xs text-amber-800">Verify your email before submitting this application.</p>
          ) : null}

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

        </form>
      )}

      <a href="/" className="mt-8 inline-block text-sm text-blue-700 underline">
        Home
      </a>
    </main>
  );
}
