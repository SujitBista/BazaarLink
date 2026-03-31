export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <span className="text-sm font-semibold uppercase tracking-wide text-stone-500">Admin</span>
          <nav className="flex flex-wrap gap-4 text-sm">
            <a href="/admin/vendors" className="font-medium text-orange-700 hover:text-orange-800">
              Vendor applications
            </a>
            <a href="/admin/analytics" className="text-stone-600 hover:text-stone-900">
              Analytics
            </a>
            <a href="/" className="text-stone-500 hover:text-stone-800">
              Home
            </a>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
