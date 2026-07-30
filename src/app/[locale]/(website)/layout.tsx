import type { Metadata } from "next";

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

export default function WebsiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}