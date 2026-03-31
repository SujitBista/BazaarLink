import { AdminHeaderNav } from "@/components/admin/AdminHeaderNav";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-stone-50">
      <AdminHeaderNav />
      {children}
    </div>
  );
}
