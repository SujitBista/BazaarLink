"use client";

import { useEffect, useState } from "react";
import { fetchApiJson } from "@/lib/client/api-json";
import { UserRole } from "@/types/enums";

type MeUser = {
  id: string;
  email: string;
  role: (typeof UserRole)[keyof typeof UserRole];
  fullName: string | null;
  emailVerified: boolean;
};

export function ShopHeaderNav() {
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

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.assign("/shop");
  }

  const linkClass = "text-sm font-medium text-orange-700 underline-offset-2 hover:underline";
  const mutedClass = "text-sm text-stone-600 underline-offset-2 hover:underline hover:text-stone-900";
  const btnClass =
    "text-sm font-medium text-orange-700 underline-offset-2 hover:underline bg-transparent border-0 cursor-pointer p-0";

  if (me === undefined) {
    return (
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400" aria-busy="true">
        <span>…</span>
      </nav>
    );
  }

  if (!me) {
    return (
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <a href="/login" className={linkClass}>
          Login
        </a>
        <a href="/signup" className={linkClass}>
          Sign up
        </a>
        <a href="/vendor" className={mutedClass}>
          Vendor
        </a>
        <a href="/" className={mutedClass}>
          Home
        </a>
      </nav>
    );
  }

  if (me.role === UserRole.CUSTOMER) {
    return (
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <a href="/cart" className={linkClass}>
          Cart
        </a>
        <a href="/orders" className={linkClass}>
          Orders
        </a>
        <button type="button" className={btnClass} onClick={() => void signOut()}>
          Sign out
        </button>
        <a href="/" className={mutedClass}>
          Home
        </a>
      </nav>
    );
  }

  if (me.role === UserRole.VENDOR) {
    return (
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <a href="/vendor/dashboard" className={linkClass}>
          Vendor dashboard
        </a>
        <button type="button" className={btnClass} onClick={() => void signOut()}>
          Sign out
        </button>
        <a href="/" className={mutedClass}>
          Home
        </a>
      </nav>
    );
  }

  if (me.role === UserRole.ADMIN) {
    return (
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <a href="/admin/analytics" className={linkClass}>
          Admin
        </a>
        <button type="button" className={btnClass} onClick={() => void signOut()}>
          Sign out
        </button>
        <a href="/" className={mutedClass}>
          Home
        </a>
      </nav>
    );
  }

  return null;
}
