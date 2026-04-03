"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchApiJson } from "@/lib/client/api-json";
import { signOutAndRedirect } from "@/lib/client/sign-out";

const NAV = [
  { href: "/vendor/dashboard", label: "Dashboard" },
  { href: "/vendor/products", label: "Products" },
  { href: "/vendor/orders", label: "Orders" },
  { href: "/vendor/settings", label: "Settings" },
] as const;

export function VendorHeader() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetchApiJson<{ user: { email: string } | null }>("/api/auth/me");
      if (!cancelled && res.ok && res.data.user?.email) {
        setEmail(res.data.user.email);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const handleSignOut = useCallback(async () => {
    setSignOutError(null);
    setSigningOut(true);
    const result = await signOutAndRedirect("/login");
    if (!result.ok) {
      setSigningOut(false);
      setSignOutError(result.error ?? "Could not sign out");
    }
  }, []);

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-6">
          <a href="/vendor/dashboard" className="shrink-0 text-lg font-semibold text-gray-900">
            BazaarLink
          </a>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" aria-label="Vendor">
            {NAV.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <a
                  key={href}
                  href={href}
                  className={
                    active
                      ? "font-medium text-orange-700 underline decoration-orange-600 underline-offset-4"
                      : "text-gray-600 hover:text-gray-900"
                  }
                >
                  {label}
                </a>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {email ? (
            <span className="hidden max-w-[14rem] truncate text-sm text-gray-500 sm:inline" title={email}>
              {email}
            </span>
          ) : null}

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm font-medium text-gray-800 transition hover:border-gray-300 hover:bg-gray-100"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              Account
              <span className="text-xs text-gray-500" aria-hidden>
                ▾
              </span>
            </button>
            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-1 min-w-[12rem] rounded-md border border-gray-200 bg-white py-1 shadow-lg"
              >
                <a
                  role="menuitem"
                  href="/vendor/settings"
                  className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Profile
                </a>
                <a
                  role="menuitem"
                  href="/vendor/dashboard"
                  className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </a>
                <button
                  type="button"
                  role="menuitem"
                  disabled={signingOut}
                  onClick={() => {
                    setMenuOpen(false);
                    void handleSignOut();
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {signOutError ? (
        <p className="mx-auto max-w-6xl px-4 pb-2 text-right text-xs text-red-700">{signOutError}</p>
      ) : null}
    </header>
  );
}
