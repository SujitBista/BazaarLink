"use client";

import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { signOutAndRedirect } from "@/lib/client/sign-out";

export function AdminHeaderNav() {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const handleSignOut = useCallback(async () => {
    setSignOutError(null);
    setSigningOut(true);
    const result = await signOutAndRedirect("/admin/login");
    if (!result.ok) {
      setSigningOut(false);
      setSignOutError(result.error ?? "Could not sign out");
    }
  }, []);

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <span className="text-sm font-semibold uppercase tracking-wide text-stone-500">Admin</span>
        <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm sm:gap-x-5">
          <a href="/admin/vendors" className="font-medium text-orange-700 hover:text-orange-800">
            Vendor applications
          </a>
          <a href="/admin/analytics" className="text-stone-600 hover:text-stone-900">
            Analytics
          </a>
          <a href="/" className="text-stone-500 hover:text-stone-800">
            Home
          </a>
          {!isLoginPage ? (
            <span className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={signingOut}
                className="rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1 text-stone-600 transition hover:border-stone-300 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-60"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
              {signOutError ? <span className="max-w-[14rem] text-right text-xs text-red-700">{signOutError}</span> : null}
            </span>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
