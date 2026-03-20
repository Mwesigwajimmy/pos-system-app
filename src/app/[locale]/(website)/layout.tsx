import React from "react";
// We keep this import to ensure AI and Data logic works
import Providers from "@/components/Providers";

export default function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      {/* 
         SOVEREIGN FIX: We removed MarketingHeader and Footer from here.
         This prevents the "Double Layer" look and lets your 
         original landing page design appear exactly as it was.
      */}
      <div className="flex flex-col min-h-screen">
        <main className="flex-grow">
          {children}
        </main>
      </div>
    </Providers>
  );
}