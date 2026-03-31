"use client";

import type { AdminVendorDetail } from "@/types/admin-vendor";

function field(label: string, value: string | null | undefined) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-stone-900">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}

export function AdminVendorBusinessSection({ vendor }: { vendor: AdminVendorDetail }) {
  const p = vendor.profile;
  const businessType =
    p?.businessType === "INDIVIDUAL" ? "Individual" : p?.businessType === "COMPANY" ? "Company" : null;

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-900">Business details</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        {field("Business name", p?.businessName)}
        {field("Business type", businessType)}
        {field("PAN / VAT number", p?.panOrVatNumber)}
        {field("Business registration number", p?.businessRegistrationNumber)}
        {field("Contact email", p?.contactEmail)}
        {field("Contact phone", p?.contactPhone)}
        {field("Province", p?.businessAddressProvince)}
        {field("City", p?.businessAddressCity)}
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Business address</dt>
          <dd className="mt-0.5 text-sm text-stone-900">{p?.businessAddressFull?.trim() ? p.businessAddressFull : "—"}</dd>
        </div>
      </dl>
      <div className="mt-6 border-t border-stone-100 pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Bank details</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {field("Bank name", p?.bankName)}
          {field("Account number", p?.bankAccountNumber)}
          {field("Account holder", p?.bankAccountHolder)}
        </div>
      </div>
    </section>
  );
}
