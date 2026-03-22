import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BazaarLink – Multi-Vendor Marketplace",
  description: "Marketplace where vendors sell and customers buy in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
