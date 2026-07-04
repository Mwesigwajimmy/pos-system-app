import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import SiteShell from "@/components/SiteShell";

export const metadata: Metadata = {
  title: "BBU1 — Business Operating System",
  description: "The unified operating system for modern enterprise. Accounting, CRM, Inventory, HR and AI — all in one platform.",
  keywords: "ERP, business software, accounting, CRM, inventory management, Uganda, Africa",
  openGraph: {
    title: "BBU1 — Business Operating System",
    description: "The unified operating system for modern enterprise.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <SiteShell>{children}</SiteShell>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
