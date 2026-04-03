"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApiJson, formatValidationDetails } from "@/lib/client/api-json";

type MeUser = {
  id: string;
  email: string;
  role: string;
  emailVerified: boolean;
};

type AuthResponse = {
  user: MeUser;
  verification?: { sent: boolean; devVerificationUrl?: string };
};

async function ensureSignedInAfterSignup(email: string, password: string): Promise<void> {
  const meRes = await fetchApiJson<{ user: MeUser | null }>("/api/auth/me");
  if (meRes.ok && meRes.data.user) return;
  await fetchApiJson<AuthResponse>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export function VendorSignupClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationLines, setValidationLines] = useState<string[]>([]);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setValidationLines([]);
    setSubmitting(true);
    const res = await fetchApiJson<AuthResponse>("/api/auth/signup/vendor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      if (res.details) setValidationLines(formatValidationDetails(res.details));
      return;
    }
    const devUrl = res.data.verification?.devVerificationUrl;
    if (devUrl && typeof window !== "undefined") {
      try {
        sessionStorage.setItem("bazaarlink_dev_email_verify_url", devUrl);
      } catch {
        /* ignore */
      }
    }
    await ensureSignedInAfterSignup(email, password);
    router.push("/vendor/onboarding?checkEmail=1");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col lg:flex-row">
        <section className="flex flex-1 flex-col justify-center px-8 py-12 lg:px-14 lg:py-16">
          <p className="text-sm font-medium uppercase tracking-wide text-orange-600">Seller onboarding</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Create your seller account
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-gray-600">
            Sign up to submit your business details for review. After approval, you can list products and manage orders
            from your vendor dashboard.
          </p>
          <ol className="mt-10 list-decimal space-y-3 pl-5 text-sm text-gray-700">
            <li>Create your account (this page)</li>
            <li>Verify your email when prompted</li>
            <li>Complete the vendor application with your business information</li>
          </ol>
        </section>

        <section className="flex flex-1 items-center justify-center border-t border-gray-200 bg-white px-8 py-12 lg:border-l lg:border-t-0 lg:px-12">
          <div className="w-full max-w-sm">
            <h2 className="text-xl font-semibold text-gray-900">Sign up to sell</h2>
            <p className="mt-1 text-sm text-gray-600">You will continue to vendor onboarding after account creation.</p>

            <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4">
              <div>
                <label htmlFor="vendor-signup-email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="vendor-signup-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div>
                <label htmlFor="vendor-signup-password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="vendor-signup-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
                <p className="mt-1 text-xs text-gray-500">At least 8 characters, with a letter and a number.</p>
              </div>

              {error ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                  <p>{error}</p>
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
                className="w-full rounded-md bg-gray-900 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
              >
                {submitting ? "Please wait…" : "Create account & continue"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600">
              Already have an account?{" "}
              <a href="/vendor/login" className="font-medium text-orange-700 underline-offset-2 hover:underline">
                Vendor sign in
              </a>
            </p>
            <p className="mt-4 text-center text-xs text-gray-500">
              <a href="/" className="text-orange-700 underline-offset-2 hover:underline">
                Back to home
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
