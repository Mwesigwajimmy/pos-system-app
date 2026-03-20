import React from "react";
// We keep this import to ensure AI and Data logic works
import Providers from "@/components/Providers";

export default async function WebsiteLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // NEXT.JS 15 BUILD FIX: Must await params to prevent Server Component crashes
  await params;

  return (
    <Providers>
      {/* 
         SOVEREIGN FIX: We removed MarketingHeader and Footer from here.
         This prevents the "Double Layer" look and lets your 
         original landing page design appear exactly as it was.

         THEME FIX: Added 'bg-background' and 'text-foreground' with a 
         smooth transition. This allows the background to change from 
         Deep Dark to Pure White when you use your theme switcher.
      */}
      <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300">
        <main className="flex-grow">
          {children}
        </main>
      </div>
    </Providers>
  );
}