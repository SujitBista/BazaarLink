"use client";

import { useState, type ReactNode } from "react";
import { fetchApiJson, formatValidationDetails } from "@/lib/client/api-json";

type MeUser = {
  id: string;
  email: string;
  role: "CUSTOMER" | "VENDOR" | "ADMIN";
};

type LoginResponse = { user: MeUser };

type Props = {
  redirectTo: string;
  title: string;
  subtitle?: string;
  /** Extra content below the form (e.g. links to signup). */
  extraLinks?: ReactNode;
};

export function LoginForm({ redirectTo, title, subtitle, extraLinks }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<string[]>([]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDetails([]);
    setSubmitting(true);
    const res = await fetchApiJson<LoginResponse>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      if (res.details) setDetails(formatValidationDetails(res.details));
      return;
    }
    window.location.assign(redirectTo);
  }

  return (
    <main className="mx-auto min-h-[70vh] max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
      {subtitle ? <p className="mt-2 text-sm text-gray-600">{subtitle}</p> : null}

      <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
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
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <p>{error}</p>
            {details.length > 0 ? (
              <ul className="mt-2 list-inside list-disc text-xs">
                {details.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-orange-700 disabled:opacity-50"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {extraLinks != null ? (
        <div className="mt-6 text-center text-sm text-gray-600">
          {/* TS 5.9: server-passed JSX widens past DOM `ReactNode`; safe at runtime */}
          {extraLinks as never}
        </div>
      ) : null}

      <p className="mt-8 text-center text-sm text-gray-600">
        <a href="/" className="text-orange-700 underline">
          Back to home
        </a>
      </p>
    </main>
  );
}
