"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchApiJson, formatValidationDetails } from "@/lib/client/api-json";
import { signOutAndRedirect } from "@/lib/client/sign-out";

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
  documentUrl?: string | null;
  createdAt: string;
  updatedAt: string;
} | null;

type VendorRow = {
  id: string;
  userId: string;
  status:
    | "DRAFT"
    | "PENDING"
    | "CHANGES_REQUESTED"
    | "APPROVED"
    | "REJECTED"
    | "SUSPENDED";
  rejectionReason: string | null;
  termsAccepted: boolean;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  profile: VendorProfile;
};

type VendorMeResponse = { vendor: VendorRow | null };

type OnboardingPostResponse = { vendor: VendorRow };

type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  children: CategoryNode[];
};

type FlatCat = { id: string; name: string; slug: string };

function flattenCategories(nodes: CategoryNode[]): FlatCat[] {
  const out: FlatCat[] = [];
  const seen = new Set<string>();
  for (const c of nodes) {
    if (!seen.has(c.slug)) {
      out.push({ id: c.id, name: c.name, slug: c.slug });
      seen.add(c.slug);
    }
    if (c.children?.length) out.push(...flattenCategories(c.children));
  }
  return out
    .filter((cat, idx, arr) => arr.findIndex((entry) => entry.slug === cat.slug) === idx)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeSlugInput(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function statusHeading(status: VendorRow["status"]): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "PENDING":
      return "Pending approval (24-48 hours)";
    case "CHANGES_REQUESTED":
      return "Changes requested — update and resubmit";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Application rejected";
    case "SUSPENDED":
      return "Suspended";
    default:
      return status;
  }
}

function statusColors(status: VendorRow["status"]): string {
  switch (status) {
    case "DRAFT":
      return "border-stone-200 bg-stone-50 text-stone-900";
    case "PENDING":
      return "border-yellow-200 bg-yellow-50 text-yellow-900";
    case "CHANGES_REQUESTED":
      return "border-orange-200 bg-orange-50 text-orange-900";
    case "APPROVED":
      return "border-green-200 bg-green-50 text-green-900";
    case "REJECTED":
      return "border-red-200 bg-red-50 text-red-900";
    case "SUSPENDED":
      return "border-red-300 bg-red-50 text-red-900";
    default:
      return "border-gray-200 bg-gray-50 text-gray-900";
  }
}

function getFilenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const last = pathname.split("/").filter(Boolean).pop();
    return last ?? "uploaded-file";
  } catch {
    return "uploaded-file";
  }
}

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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [documentUrl, setDocumentUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [step, setStep] = useState(1);

  const [catalogCategories, setCatalogCategories] = useState<FlatCat[]>([]);
  const [categoriesLoadError, setCategoriesLoadError] = useState<string | null>(null);

  const [logoUploading, setLogoUploading] = useState(false);
  const [documentUploading, setDocumentUploading] = useState(false);
  const [logoObjectUrl, setLogoObjectUrl] = useState<string | null>(null);
  const [documentObjectUrl, setDocumentObjectUrl] = useState<string | null>(null);
  const [logoFileName, setLogoFileName] = useState("");
  const [documentFileName, setDocumentFileName] = useState("");

  const [slugCheck, setSlugCheck] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  const slugDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationLines, setValidationLines] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [devVerifyUrl, setDevVerifyUrl] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
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

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) {
        setCategoriesLoadError("Could not load categories.");
        return;
      }
      const json = (await res.json()) as { categories?: CategoryNode[] };
      const flat = flattenCategories(json.categories ?? []);
      setCatalogCategories(flat);
    })();
  }, []);

  useEffect(() => {
    return () => {
      if (logoObjectUrl) URL.revokeObjectURL(logoObjectUrl);
      if (documentObjectUrl) URL.revokeObjectURL(documentObjectUrl);
    };
  }, [documentObjectUrl, logoObjectUrl]);

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
      if (p.categories.length > 0) setSelectedCategories(p.categories);
      if (p.contactEmail) setContactEmail(p.contactEmail);
      if (p.contactPhone) setContactPhone(p.contactPhone);
      if (p.documentUrl) setDocumentUrl(p.documentUrl);
      if (p.storeProfile.logoUrl) setLogoFileName(getFilenameFromUrl(p.storeProfile.logoUrl));
      if (p.documentUrl) setDocumentFileName(getFilenameFromUrl(p.documentUrl));
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

  const signOut = useCallback(async () => {
    setSignOutError(null);
    setSigningOut(true);
    const res = await signOutAndRedirect("/");
    if (!res.ok) {
      setSigningOut(false);
      setSignOutError(res.error ?? "Could not sign out");
      return;
    }
  }, []);

  const previewSlug = normalizeSlugInput(storeSlug);
  const storePreviewUrl = previewSlug.length >= 3 && /^[a-z0-9-]+$/.test(previewSlug) ? `yourapp.com/store/${previewSlug}` : null;
  const isPending = vendor?.status === "PENDING";
  const fieldsLocked = isPending;
  const requiredFieldErrors = useMemo(
    () =>
      ({
        businessName: !businessName.trim() ? "Business name is required." : "",
        panOrVatNumber: !panOrVatNumber.trim() ? "PAN or VAT number is required." : "",
        businessAddressProvince: !businessAddressProvince.trim() ? "Province is required." : "",
        businessAddressCity: !businessAddressCity.trim() ? "City is required." : "",
        businessAddressFull: !businessAddressFull.trim() ? "Full business address is required." : "",
        bankName: !bankName.trim() ? "Bank name is required." : "",
        bankAccountNumber: !bankAccountNumber.trim() ? "Account number is required." : "",
        bankAccountHolder: !bankAccountHolder.trim() ? "Account holder is required." : "",
        storeDescription: !storeDescription.trim() ? "Store description is required." : "",
        storeSlug: !previewSlug ? "Store URL slug is required." : "",
        categories: selectedCategories.length < 1 ? "Select at least one category." : "",
        termsAccepted: !termsAccepted ? "You must accept the vendor onboarding terms and policy." : "",
      }) as Record<string, string>,
    [
      bankAccountHolder,
      bankAccountNumber,
      bankName,
      businessAddressCity,
      businessAddressFull,
      businessAddressProvince,
      businessName,
      panOrVatNumber,
      previewSlug,
      selectedCategories.length,
      storeDescription,
      termsAccepted,
    ]
  );
  const filteredCategories = useMemo(() => {
    const q = categoryQuery.trim().toLowerCase();
    const deduped = catalogCategories.filter(
      (cat, idx, arr) => arr.findIndex((entry) => entry.slug === cat.slug) === idx
    );
    if (!q) return deduped;
    return deduped.filter((cat) => cat.name.toLowerCase().includes(q) || cat.slug.toLowerCase().includes(q));
  }, [catalogCategories, categoryQuery]);

  useEffect(() => {
    if (slugDebounceRef.current) clearTimeout(slugDebounceRef.current);
    if (step !== 3) {
      setSlugCheck("idle");
      return;
    }

    const normalized = normalizeSlugInput(storeSlug);
    if (normalized.length < 3) {
      setSlugCheck("invalid");
      return;
    }
    if (normalized.length > 64 || !/^[a-z0-9-]+$/.test(normalized)) {
      setSlugCheck("invalid");
      return;
    }

    setSlugCheck("checking");
    slugDebounceRef.current = setTimeout(() => {
      void (async () => {
        const res = await fetchApiJson<{
          available: boolean;
          normalized: string;
          reason?: string;
        }>(`/api/vendors/check-slug?slug=${encodeURIComponent(normalized)}`);
        if (!res.ok) {
          setSlugCheck("idle");
          return;
        }
        if (!res.data.available) {
          setSlugCheck(res.data.reason ? "invalid" : "taken");
          return;
        }
        setSlugCheck("ok");
      })();
    }, 450);

    return () => {
      if (slugDebounceRef.current) clearTimeout(slugDebounceRef.current);
    };
  }, [storeSlug, step]);

  async function onLogoFileChange(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setSubmitError("Logo must be an image (JPEG, PNG, WebP, or GIF).");
      return;
    }
    setSubmitError(null);
    if (logoObjectUrl) URL.revokeObjectURL(logoObjectUrl);
    const url = URL.createObjectURL(file);
    setLogoObjectUrl(url);
    setLogoFileName(file.name);
    setLogoUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", "logo");
    const res = await fetchApiJson<{ url: string }>("/api/uploads/vendor", { method: "POST", body: fd });
    setLogoUploading(false);
    if (!res.ok) {
      setSubmitError(res.error);
      URL.revokeObjectURL(url);
      setLogoObjectUrl(null);
      return;
    }
    setStoreLogoUrl(res.data.url);
    setLogoFileName(file.name);
    URL.revokeObjectURL(url);
    setLogoObjectUrl(null);
  }

  async function onDocumentFileChange(file: File | null) {
    if (!file) return;
    setSubmitError(null);
    if (documentObjectUrl) URL.revokeObjectURL(documentObjectUrl);
    const objectUrl = URL.createObjectURL(file);
    setDocumentObjectUrl(objectUrl);
    setDocumentFileName(file.name);
    setDocumentUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", "document");
    const res = await fetchApiJson<{ url: string }>("/api/uploads/vendor", { method: "POST", body: fd });
    setDocumentUploading(false);
    if (!res.ok) {
      setSubmitError(res.error);
      URL.revokeObjectURL(objectUrl);
      setDocumentObjectUrl(null);
      return;
    }
    setDocumentUrl(res.data.url);
    setDocumentFileName(file.name);
  }

  function toggleCategory(slug: string) {
    setSelectedCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
    setFieldErrors((prev) => ({ ...prev, categories: "" }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setValidationLines([]);
    setFieldErrors({});
    if (fieldsLocked) return;

    const clientErrors: string[] = [];
    const nextFieldErrors: Record<string, string> = {};
    for (const [fieldName, message] of Object.entries(requiredFieldErrors)) {
      if (message) nextFieldErrors[fieldName] = message;
    }
    if (selectedCategories.length < 1) clientErrors.push("Select at least one category.");
    if (storeDescription.trim().length > 2000) clientErrors.push("Store description must be at most 2000 characters.");
    if (contactPhone.trim()) {
      const phoneOk = /^\+?[0-9()\-\s]{7,20}$/.test(contactPhone.trim());
      if (!phoneOk) clientErrors.push("Contact phone: use 7–20 digits with optional +, spaces, or dashes.");
    }
    const slugNorm = normalizeSlugInput(storeSlug);
    if (slugNorm.length < 3 || slugNorm.length > 64 || !/^[a-z0-9-]+$/.test(slugNorm)) {
      clientErrors.push("Store slug must be 3–64 lowercase letters, numbers, or hyphens.");
    }
    if (slugCheck === "taken") clientErrors.push("That store URL is already taken.");
    if (slugCheck === "invalid") clientErrors.push("Fix the store URL slug before submitting.");
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0 || clientErrors.length) {
      setValidationLines(clientErrors);
      return;
    }

    setSubmitting(true);
    const categories = [...selectedCategories].sort();
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
        slug: slugNorm,
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
      <main className="mx-auto max-w-2xl p-8">
        <p className="text-gray-600">Loading…</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-2xl p-8">
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
      <main className="mx-auto max-w-2xl p-8">
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
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-xl font-semibold">Vendor onboarding</h1>
        <p className="mt-3 text-gray-700">Admin accounts cannot submit vendor onboarding.</p>
        <a href="/" className="mt-6 inline-block text-sm text-blue-700 underline">
          Home
        </a>
      </main>
    );
  }

  const status = vendor?.status;
  const canEdit =
    !vendor ||
    status === "DRAFT" ||
    status === "PENDING" ||
    status === "CHANGES_REQUESTED" ||
    status === "REJECTED" ||
    status === "SUSPENDED";
  const emailVerifiedJustNow = urlFlags.emailVerified;
  const canSubmit = canEdit && me.emailVerified && !fieldsLocked;
  const stepLabels = ["Business details", "Address & bank", "Store profile"];
  const slugBlocking = slugCheck === "taken" || slugCheck === "invalid" || slugCheck === "checking";
  const logoPreviewSrc = logoObjectUrl || storeLogoUrl || null;
  const documentPreviewSrc = documentObjectUrl || documentUrl || null;
  const documentIsImage = /\.(png|jpe?g|webp|gif)$/i.test(documentFileName || documentPreviewSrc || "");
  const isApproved = vendor?.status === "APPROVED";
  const approvedStoreSlug = normalizeSlugInput(vendor?.profile?.storeProfile?.slug ?? "");
  const approvedStorePreviewUrl = approvedStoreSlug ? `yourapp.com/store/${approvedStoreSlug}` : null;

  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Vendor onboarding</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <span>Signed in as {me.email}</span>
            {me.emailVerified ? (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-900">
                Email verified
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                Email not verified
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/"
            className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Home
          </a>
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={signingOut}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </div>
      {signOutError ? <p className="mt-2 text-xs text-red-800">{signOutError}</p> : null}

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
          <p className="mt-2">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-sm font-semibold ${status ? statusColors(status) : "border-gray-200 bg-gray-50 text-gray-900"}`}>
              {status ? statusHeading(status) : "—"}
            </span>
          </p>
          {vendor.status === "PENDING" ? (
            <p className="mt-1 text-sm text-gray-600">We review new applications within one to two business days.</p>
          ) : null}
          {vendor.status === "CHANGES_REQUESTED" ? (
            <p className="mt-1 text-sm text-gray-600">
              An administrator requested updates. Please review the feedback below, adjust your application, and resubmit.
            </p>
          ) : null}
          {vendor.approvedAt ? (
            <p className="mt-1 text-xs text-gray-500">Approved at: {new Date(vendor.approvedAt).toLocaleString()}</p>
          ) : null}
          {vendor.rejectionReason ? (
            <p className="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
              {vendor.status === "CHANGES_REQUESTED" ? "Feedback: " : "Reason: "}
              {vendor.rejectionReason}
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

      {isApproved ? (
        <section className="mt-6 rounded-lg border border-green-200 bg-green-50 p-5">
          <h2 className="text-xl font-semibold text-green-900">🎉 Your store has been approved!</h2>
          <p className="mt-2 text-sm text-green-900">You can now start selling on the platform.</p>
          {approvedStorePreviewUrl ? (
            <p className="mt-3 text-sm text-green-900">
              Store preview: <span className="font-mono font-medium">{approvedStorePreviewUrl}</span>
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a
              href="/vendor/dashboard"
              className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
            >
              Go to Vendor Dashboard
            </a>
            <a
              href="/vendor/products"
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              Add your first product
            </a>
            <a
              href="/vendor/dashboard"
              className="inline-flex items-center rounded-md border border-transparent px-2 py-1 text-sm font-medium text-gray-700 underline hover:text-gray-900"
            >
              Edit store profile
            </a>
          </div>
          <div className="mt-5 rounded-md border border-green-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">Next steps</h3>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-700">
              <li>Add products</li>
              <li>Set pricing</li>
              <li>Start receiving orders</li>
            </ul>
          </div>
        </section>
      ) : !canEdit ? null : (
        <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Progress</p>
              <p className="text-xs text-gray-500">Step {step} of 3</p>
            </div>
            <div className="mb-3 h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-orange-600 transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              {stepLabels.map((label, i) => {
                const n = i + 1;
                const active = step === n;
                return (
                  <div
                    key={label}
                    className={`flex min-w-[7rem] flex-1 items-center gap-2 rounded-md border px-2 py-2 text-xs ${
                      active ? "border-orange-300 bg-orange-50 text-orange-950" : "border-transparent text-gray-600"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        step > n ? "bg-green-600 text-white" : active ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {step > n ? "✓" : n}
                    </span>
                    <span className="text-left leading-tight">{label}</span>
                  </div>
                );
              })}
            </div>
            {fieldsLocked ? (
              <p className="mt-3 rounded border border-yellow-200 bg-yellow-50 p-2 text-xs text-yellow-900">
                Application is pending review. Fields are locked until the review is complete.
              </p>
            ) : null}
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
                  disabled={fieldsLocked}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
                {fieldErrors.businessName ? <p className="mt-1 text-xs text-red-700">{fieldErrors.businessName}</p> : null}
              </div>
              <div>
                <label htmlFor="businessType" className="block text-sm font-medium text-gray-700">
                  Business type
                </label>
                <select
                  id="businessType"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value as "individual" | "company")}
                  disabled={fieldsLocked}
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
                  disabled={fieldsLocked}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
                {fieldErrors.panOrVatNumber ? <p className="mt-1 text-xs text-red-700">{fieldErrors.panOrVatNumber}</p> : null}
              </div>
              <div>
                <label htmlFor="businessRegistrationNumber" className="block text-sm font-medium text-gray-700">
                  Business registration number (optional)
                </label>
                <input
                  id="businessRegistrationNumber"
                  value={businessRegistrationNumber}
                  onChange={(e) => setBusinessRegistrationNumber(e.target.value)}
                  disabled={fieldsLocked}
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
                  disabled={fieldsLocked}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
                {fieldErrors.businessAddressProvince ? <p className="mt-1 text-xs text-red-700">{fieldErrors.businessAddressProvince}</p> : null}
              </div>
              <div>
                <label htmlFor="businessAddressCity" className="block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  id="businessAddressCity"
                  value={businessAddressCity}
                  onChange={(e) => setBusinessAddressCity(e.target.value)}
                  disabled={fieldsLocked}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
                {fieldErrors.businessAddressCity ? <p className="mt-1 text-xs text-red-700">{fieldErrors.businessAddressCity}</p> : null}
              </div>
              <div>
                <label htmlFor="businessAddressFull" className="block text-sm font-medium text-gray-700">
                  Full business address
                </label>
                <textarea
                  id="businessAddressFull"
                  value={businessAddressFull}
                  onChange={(e) => setBusinessAddressFull(e.target.value)}
                  disabled={fieldsLocked}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
                {fieldErrors.businessAddressFull ? <p className="mt-1 text-xs text-red-700">{fieldErrors.businessAddressFull}</p> : null}
              </div>
              <div>
                <label htmlFor="bankName" className="block text-sm font-medium text-gray-700">
                  Bank name
                </label>
                <input
                  id="bankName"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  disabled={fieldsLocked}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
                {fieldErrors.bankName ? <p className="mt-1 text-xs text-red-700">{fieldErrors.bankName}</p> : null}
              </div>
              <div>
                <label htmlFor="bankAccountNumber" className="block text-sm font-medium text-gray-700">
                  Account number
                </label>
                <input
                  id="bankAccountNumber"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  disabled={fieldsLocked}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
                {fieldErrors.bankAccountNumber ? <p className="mt-1 text-xs text-red-700">{fieldErrors.bankAccountNumber}</p> : null}
              </div>
              <div>
                <label htmlFor="bankAccountHolder" className="block text-sm font-medium text-gray-700">
                  Account holder
                </label>
                <input
                  id="bankAccountHolder"
                  value={bankAccountHolder}
                  onChange={(e) => setBankAccountHolder(e.target.value)}
                  disabled={fieldsLocked}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
                {fieldErrors.bankAccountHolder ? <p className="mt-1 text-xs text-red-700">{fieldErrors.bankAccountHolder}</p> : null}
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <div>
                <span className="block text-sm font-medium text-gray-700">Store logo (optional)</span>
                <p className="mt-0.5 text-xs text-gray-500">JPEG, PNG, WebP, or GIF — max 2 MB.</p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="mt-2 block w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-orange-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-orange-900 hover:file:bg-orange-100"
                  onChange={(e) => void onLogoFileChange(e.target.files?.[0] ?? null)}
                  disabled={logoUploading || fieldsLocked}
                />
                {logoUploading ? <p className="mt-2 text-xs text-gray-700">Uploading logo…</p> : null}
                {logoPreviewSrc ? (
                  <div className="mt-3 flex items-start gap-3">
                    <img
                      src={logoPreviewSrc}
                      alt="Logo preview"
                      className="h-20 w-20 rounded border border-gray-200 bg-white object-contain p-1"
                    />
                    <div className="text-xs text-gray-600">
                      <p>{logoFileName || "Uploaded logo"}</p>
                      {storeLogoUrl ? (
                        <a href={storeLogoUrl} target="_blank" rel="noopener noreferrer" className="text-orange-800 underline">
                          Open file
                        </a>
                      ) : null}
                      {!fieldsLocked ? <p className="mt-1 text-gray-500">Choose another file to replace.</p> : null}
                    </div>
                  </div>
                ) : null}
              </div>

              <div>
                <label htmlFor="storeDescription" className="block text-sm font-medium text-gray-700">
                  Store description
                </label>
                <textarea
                  id="storeDescription"
                  value={storeDescription}
                  onChange={(e) => setStoreDescription(e.target.value)}
                  maxLength={2000}
                  disabled={fieldsLocked}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  rows={4}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Describe what you sell, your specialties, and what customers can expect. ({storeDescription.length}/2000)
                </p>
                {fieldErrors.storeDescription ? <p className="mt-1 text-xs text-red-700">{fieldErrors.storeDescription}</p> : null}
              </div>

              <div>
                <label htmlFor="storeSlug" className="block text-sm font-medium text-gray-700">
                  Store URL slug
                </label>
                <input
                  id="storeSlug"
                  value={storeSlug}
                  onChange={(e) => setStoreSlug(normalizeSlugInput(e.target.value))}
                  placeholder="your-store-name"
                  disabled={fieldsLocked}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm"
                  autoComplete="off"
                />
                {storePreviewUrl ? (
                  <p className="mt-1 break-all text-xs text-gray-600">
                    Store preview:{" "}
                    <span className="font-medium text-gray-800">{storePreviewUrl}</span>
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">Lowercase letters, numbers, and hyphens only (no spaces).</p>
                )}
                {fieldErrors.storeSlug ? <p className="mt-1 text-xs text-red-700">{fieldErrors.storeSlug}</p> : null}
                {step === 3 ? (
                  <p className="mt-1 text-xs">
                    {slugCheck === "checking" ? (
                      <span className="text-gray-600">Checking availability…</span>
                    ) : slugCheck === "ok" ? (
                      <span className="text-green-800">This store URL is available.</span>
                    ) : slugCheck === "taken" ? (
                      <span className="text-red-800">That store URL is already taken.</span>
                    ) : slugCheck === "invalid" ? (
                      <span className="text-amber-800">Enter at least 3 valid characters for your slug.</span>
                    ) : null}
                  </p>
                ) : null}
              </div>

              <div>
                <span className="block text-sm font-medium text-gray-700">Categories</span>
                <p className="mt-0.5 text-xs text-gray-500">Select at least one — required.</p>
                {categoriesLoadError ? <p className="mt-2 text-xs text-red-800">{categoriesLoadError}</p> : null}
                <div className="mt-2 rounded border border-gray-200 bg-white p-2">
                  <button
                    type="button"
                    disabled={fieldsLocked}
                    onClick={() => setCategoriesOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded border border-gray-300 px-3 py-2 text-left text-sm disabled:opacity-60"
                  >
                    <span>
                      {selectedCategories.length > 0
                        ? `${selectedCategories.length} categories selected`
                        : "Select categories"}
                    </span>
                    <span className="text-xs text-gray-500">{categoriesOpen ? "Hide" : "Show"}</span>
                  </button>
                  {selectedCategories.length > 0 ? (
                    <p className="mt-2 text-xs text-gray-600">
                      {selectedCategories
                        .map((slug) => catalogCategories.find((cat) => cat.slug === slug)?.name ?? slug)
                        .join(", ")}
                    </p>
                  ) : null}
                  {categoriesOpen ? (
                    <div className="mt-2 rounded border border-gray-200 bg-gray-50 p-2">
                      <input
                        type="text"
                        value={categoryQuery}
                        onChange={(e) => setCategoryQuery(e.target.value)}
                        placeholder="Search categories"
                        disabled={fieldsLocked}
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      />
                      <fieldset className="mt-2 max-h-52 space-y-2 overflow-y-auto">
                        <legend className="sr-only">Product categories</legend>
                        {filteredCategories.map((c) => (
                          <label key={c.slug} className="flex cursor-pointer items-start gap-2 text-sm text-gray-800">
                            <input
                              type="checkbox"
                              checked={selectedCategories.includes(c.slug)}
                              onChange={() => toggleCategory(c.slug)}
                              disabled={fieldsLocked}
                              className="mt-0.5"
                            />
                            <span>{c.name}</span>
                          </label>
                        ))}
                        {filteredCategories.length === 0 ? (
                          <p className="text-xs text-gray-500">No categories match your search.</p>
                        ) : null}
                      </fieldset>
                    </div>
                  ) : null}
                </div>
                {fieldErrors.categories ? <p className="mt-1 text-xs text-red-700">{fieldErrors.categories}</p> : null}
              </div>

              <div>
                <span className="block text-sm font-medium text-gray-700">Registration document (optional)</span>
                <p className="mt-0.5 text-xs text-gray-500">PDF or image — max 10 MB.</p>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="mt-2 block w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-orange-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-orange-900 hover:file:bg-orange-100"
                  onChange={(e) => void onDocumentFileChange(e.target.files?.[0] ?? null)}
                  disabled={documentUploading || fieldsLocked}
                />
                {documentUploading ? <p className="mt-2 text-xs text-gray-700">Uploading document…</p> : null}
                {documentPreviewSrc ? (
                  <div className="mt-3 flex items-start gap-3">
                    {documentIsImage ? (
                      <img
                        src={documentPreviewSrc}
                        alt="Document preview"
                        className="h-20 w-20 rounded border border-gray-200 bg-white object-cover p-1"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded border border-gray-200 bg-gray-50 text-xs text-gray-600">
                        Document
                      </div>
                    )}
                    <p className="text-sm">
                      <a href={documentPreviewSrc} target="_blank" rel="noopener noreferrer" className="text-orange-800 underline">
                        {documentFileName || "View uploaded document"}
                      </a>
                    </p>
                  </div>
                ) : null}
                {documentFileName && !fieldsLocked ? <p className="mt-1 text-xs text-gray-500">Choose another file to replace.</p> : null}
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
                  disabled={fieldsLocked}
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
                  placeholder="+977 1 555 0123"
                  disabled={fieldsLocked}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">7–20 digits; optional +, spaces, or dashes.</p>
              </div>

              <label className="flex items-start gap-2 rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  disabled={fieldsLocked}
                  className="mt-0.5"
                />
                <span>I accept the vendor onboarding terms and policy.</span>
              </label>
              {fieldErrors.termsAccepted ? <p className="mt-1 text-xs text-red-700">{fieldErrors.termsAccepted}</p> : null}
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
                disabled={submitting || !canSubmit || slugBlocking}
                className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {submitting ? "Submitting…" : vendor ? "Update Application" : "Submit Application"}
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

    </main>
  );
}
