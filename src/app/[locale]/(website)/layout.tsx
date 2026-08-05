import type { Metadata } from "next";
import AuraPublicWidget from "@/components/copilot/AuraPublicWidget";

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
  return (
    <>
      {children}
      {/* Public Aura. Mounted here so it appears on every marketing page.
          It talks to aura-public-concierge, which has no access to any
          tenant table — not the authenticated aura-quantum-audit endpoint. */}
      <AuraPublicWidget />
    </>
  );
}