import { AdminVendorApplicationList } from "@/components/admin/vendor/AdminVendorApplicationList";

export default function AdminVendorsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-900">Vendor applications</h1>
        <p className="mt-1 text-sm text-stone-600">
          Review onboarding submissions and moderate vendor accounts.
        </p>
      </div>
      <AdminVendorApplicationList />
    </main>
  );
}
