import { VendorHeader } from "@/components/vendor/VendorHeader";

export default function VendorShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gray-50">
      <VendorHeader />
      {children}
    </div>
  );
}
