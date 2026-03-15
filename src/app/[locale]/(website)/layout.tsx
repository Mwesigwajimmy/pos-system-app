import React from "react";
import MarketingHeader from "@/components/MarketingHeader";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
import CookieBanner from "@/components/CookieBanner";
// FIX: Changed from { Providers } to a default import to match your file
import Providers from "@/components/Providers";

export default function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /* 
       We keep Providers here because it handles your AI tools and QueryClient.
       The Root Layout handles the Theme and Supabase. 
    */
    <Providers>
      <div className="flex flex-col min-h-screen bg-[#020617] selection:bg-blue-500/30">
        <MarketingHeader />
        
        {/* pt-20 matches your Root Layout's padding-top requirement */}
        <main className="flex-grow pt-20">
          {children}
        </main>

        <Footer />
        
        <ChatWidget />
        
        <CookieBanner />
      </div>
    </Providers>
  );
}