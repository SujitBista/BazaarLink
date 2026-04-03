"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { fetchApiJson } from "@/lib/client/api-json";
import { signOutAndRedirect } from "@/lib/client/sign-out";
import { UserRole } from "@/types/enums";

type MeUser = {
  id: string;
  email: string;
  role: (typeof UserRole)[keyof typeof UserRole];
  fullName: string | null;
  emailVerified: boolean;
};

const linkBase = "text-sm font-medium text-stone-600 underline-offset-2 transition hover:text-stone-900";
const linkAccent = "text-sm font-medium text-orange-800 underline-offset-2 transition hover:text-orange-950";

export function PublicHeader() {
  const pathname = usePathname();
  const [me, setMe] = useState<MeUser | null | undefined>(undefined);

  useEffect(() => {
    void (async () => {
      const res = await fetchApiJson<{ user: MeUser | null }>("/api/auth/me");
      if (!res.ok) {
        setMe(null);
        return;
      }
      setMe(res.data.user);
    })();
  }, []);

  const onHome = pathname === "/" || pathname === "";
  const onShop = pathname?.startsWith("/shop") ?? false;

  async function signOut() {
    await signOutAndRedirect("/");
  }

  return (
    <header className="border-b border-stone-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <a href="/" className="text-lg font-semibold tracking-tight text-stone-900">
          BazaarLink
        </a>

        {me === undefined ? (
          <nav
            className="flex min-h-[28px] flex-1 flex-wrap items-center justify-end gap-3"
            aria-busy="true"
            aria-label="Account"
          >
            <span className="text-sm text-stone-400">…</span>
          </nav>
        ) : !me ? (
          <nav className="flex flex-1 flex-wrap items-center justify-end gap-x-3 gap-y-2 sm:gap-x-4" aria-label="Main">
            <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 sm:gap-x-4">
              <a href="/" className={onHome ? `${linkAccent} underline decoration-orange-200` : linkBase} aria-current={onHome ? "page" : undefined}>
                Home
              </a>
              <a
                href="/shop"
                className={onShop ? `${linkAccent} underline decoration-orange-200` : linkBase}
                aria-current={onShop ? "page" : undefined}
              >
                Shop
              </a>
              <a href="/become-vendor" className={linkBase}>
                Vendor
              </a>
            </div>
            <span className="hidden h-4 w-px bg-stone-200 sm:block" aria-hidden />
            <div className="flex flex-wrap items-center justify-end gap-2">
              <a
                href="/login"
                className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-50"
              >
                Login
              </a>
              <a
                href="/signup"
                className="rounded-md bg-orange-700 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-800"
              >
                Sign up
              </a>
            </div>
          </nav>
        ) : me.role === UserRole.CUSTOMER ? (
          <nav className="flex flex-1 flex-wrap items-center justify-end gap-x-3 gap-y-2 sm:gap-x-5" aria-label="Main">
            <a
              href="/shop"
              className={onShop ? `${linkAccent} underline decoration-orange-200` : linkAccent}
              aria-current={onShop ? "page" : undefined}
            >
              Shop
            </a>
            <a href="/cart" className={linkBase}>
              Cart
            </a>
            <a href="/orders" className={linkBase}>
              Orders
            </a>
            <button
              type="button"
              className="text-sm font-medium text-stone-600 underline-offset-2 transition hover:text-stone-900"
              onClick={() => void signOut()}
            >
              Sign out
            </button>
          </nav>
        ) : me.role === UserRole.VENDOR ? (
          <nav className="flex flex-1 flex-wrap items-center justify-end gap-x-3 gap-y-2 sm:gap-x-5" aria-label="Main">
            <a
              href="/shop"
              className={onShop ? `${linkAccent} underline decoration-orange-200` : linkAccent}
              aria-current={onShop ? "page" : undefined}
            >
              Shop
            </a>
            <a href="/vendor/dashboard" className={linkBase}>
              Vendor dashboard
            </a>
            <button
              type="button"
              className="text-sm font-medium text-stone-600 underline-offset-2 transition hover:text-stone-900"
              onClick={() => void signOut()}
            >
              Sign out
            </button>
          </nav>
        ) : me.role === UserRole.ADMIN ? (
          <nav className="flex flex-1 flex-wrap items-center justify-end gap-x-3 gap-y-2 sm:gap-x-5" aria-label="Main">
            <a
              href="/shop"
              className={onShop ? `${linkAccent} underline decoration-orange-200` : linkAccent}
              aria-current={onShop ? "page" : undefined}
            >
              Shop
            </a>
            <a href="/admin/analytics" className={linkBase}>
              Admin
            </a>
            <button
              type="button"
              className="text-sm font-medium text-stone-600 underline-offset-2 transition hover:text-stone-900"
              onClick={() => void signOut()}
            >
              Sign out
            </button>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
