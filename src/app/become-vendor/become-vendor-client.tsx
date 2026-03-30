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
  verification?: { sent?: boolean; devVerificationUrl?: string };
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

export function BecomeVendorClient() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
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
    const path = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const body =
      mode === "signup"
        ? { email, password, intent: "vendor" as const }
        : { email, password };
    const res = await fetchApiJson<AuthResponse>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      if (res.details) setValidationLines(formatValidationDetails(res.details));
      return;
    }
    if (mode === "signup" && res.ok) {
      const devUrl = res.data.verification?.devVerificationUrl;
      if (devUrl && typeof window !== "undefined") {
        try {
          sessionStorage.setItem("bazaarlink_dev_email_verify_url", devUrl);
        } catch {
          /* ignore */
        }
      }
      await ensureSignedInAfterSignup(email, password);
    }
    router.push(mode === "signup" ? "/vendor/onboarding?checkEmail=1" : "/vendor/onboarding");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col lg:flex-row">
        <section className="flex flex-1 flex-col justify-center px-8 py-12 lg:px-14 lg:py-16">
          <p className="text-sm font-medium uppercase tracking-wide text-orange-600">BazaarLink for sellers</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Grow your business with millions of shoppers
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-gray-600">
            List products, reach new customers, and manage orders from one place. Join sellers who are building their
            brand on our marketplace.
          </p>

          <ul className="mt-10 space-y-4 text-sm text-gray-700">
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-700">
                ✓
              </span>
              <span>
                <strong className="font-medium text-gray-900">Simple onboarding</strong> — submit your shop details and
                get reviewed by our team.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-700">
                ✓
              </span>
              <span>
                <strong className="font-medium text-gray-900">Fair visibility</strong> — your catalog appears alongside
                trusted sellers in one unified storefront.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-700">
                ✓
              </span>
              <span>
                <strong className="font-medium text-gray-900">Seller tools</strong> — manage products and track your
                application status from your dashboard.
              </span>
            </li>
          </ul>

          <div className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-gray-200 pt-10">
            <div>
              <p className="text-2xl font-bold text-gray-900">12k+</p>
              <p className="mt-1 text-xs text-gray-500">Active sellers</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">4.8</p>
              <p className="mt-1 text-xs text-gray-500">Avg. seller rating</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">48h</p>
              <p className="mt-1 text-xs text-gray-500">Typical review time</p>
            </div>
          </div>
        </section>

        <section className="flex flex-1 items-center justify-center border-t border-gray-200 bg-white px-8 py-12 lg:border-l lg:border-t-0 lg:px-12">
          <div className="w-full max-w-sm">
            <h2 className="text-xl font-semibold text-gray-900">Start selling</h2>
            <p className="mt-1 text-sm text-gray-600">
              {mode === "login" ? "Log in to continue to vendor onboarding." : "Create an account, then complete vendor onboarding."}
            </p>

            <div className="mt-6 flex rounded-lg bg-gray-100 p-1 text-sm font-medium">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                  setValidationLines([]);
                }}
                className={`flex-1 rounded-md py-2 transition ${mode === "login" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"}`}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setValidationLines([]);
                }}
                className={`flex-1 rounded-md py-2 transition ${mode === "signup" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"}`}
              >
                Sign up
              </button>
            </div>

            <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4">
              <div>
                <label htmlFor="become-vendor-email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="become-vendor-email"
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
                <label htmlFor="become-vendor-password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="become-vendor-password"
                  name="password"
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
                {mode === "signup" ? (
                  <p className="mt-1 text-xs text-gray-500">At least 8 characters, with a letter and a number.</p>
                ) : null}
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
                {submitting ? "Please wait…" : mode === "login" ? "Log in & continue" : "Create account & continue"}
              </button>
            </form>

            <p className="mt-8 text-center text-xs text-gray-500">
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
