"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Providers from "@/components/Providers";
import { Button } from "@/components/ui/button";
import { Rocket, Menu, X, Mail, Linkedin, Twitter, Facebook, Leaf } from "lucide-react";

// --- WE DEFINE THE COMPONENTS HERE TO FIX THE IMPORT ERROR ---
// This ensures your build passes since they weren't exported from page.tsx

const LayoutHeader = () => (
  <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur-md">
    <div className="container mx-auto flex h-20 items-center justify-between px-6">
      <Link href="/" className="flex items-center space-x-2 font-bold text-2xl text-blue-600 tracking-tight italic group">
        <Rocket className="h-8 w-8" /> <span>BBU1</span>
      </Link>
      <div className="hidden lg:flex items-center gap-8">
        <Link href="/features" className="text-xs font-bold uppercase tracking-widest hover:text-blue-600">Features</Link>
        <Link href="/industries" className="text-xs font-bold uppercase tracking-widest hover:text-blue-600">Industries</Link>
        <Link href="/aura-ai" className="text-xs font-bold uppercase tracking-widest text-blue-500">Aura AI</Link>
        <Link href="/pricing" className="text-xs font-bold uppercase tracking-widest hover:text-blue-600">Pricing</Link>
        <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-8 shadow-lg shadow-blue-600/10">
          <Link href="/signup">Get Started</Link>
        </Button>
      </div>
    </div>
  </header>
);

const LayoutFooter = () => (
  <footer className="bg-slate-950 text-slate-200 pt-16 pb-8 border-t border-slate-800">
    <div className="container mx-auto px-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-12">
        <div className="col-span-2">
          <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4"><Rocket className="h-6 w-6 text-blue-500" /> BBU1</h3>
          <p className="text-sm text-slate-400 max-w-xs leading-relaxed">The unified operating system for global commerce.</p>
        </div>
        <div>
          <h4 className="font-bold text-white mb-4">Product</h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li><Link href="/features" className="hover:text-blue-400">OS Features</Link></li>
            <li><Link href="/aura-ai" className="hover:text-blue-400">Aura AI</Link></li>
            <li><Link href="/pricing" className="hover:text-blue-400">Investment</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-white mb-4">Support</h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li><Link href="/contact" className="hover:text-blue-400">Contact</Link></li>
            <li><Link href="/help-centre" className="hover:text-blue-400">Help Centre</Link></li>
            <li><Link href="/careers" className="hover:text-blue-400">Careers</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800 pt-8 flex justify-between items-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} BBU1 International.</p>
        <p className="flex items-center gap-1 uppercase font-black tracking-widest">Made with <Leaf className="h-3 w-3 text-green-600" /> for the World.</p>
      </div>
    </div>
  </footer>
);

export default function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // --- PATH GUARD LOGIC ---
  // We check if the user is on the main landing page. 
  // If the path is just "/" or includes a locale like "/en" or "/fr", 
  // we HIDE this header/footer so it doesn't appear double.
  const isHomePage = pathname === "/" || pathname.split("/").length <= 2;

  return (
    <Providers>
      <div className="flex flex-col min-h-screen bg-white text-slate-900 transition-colors duration-300">
        
        {/* Only show the Header if we are NOT on the homepage */}
        {!isHomePage && <LayoutHeader />}

        <main className="flex-grow">
          {children}
        </main>

        {/* Only show the Footer if we are NOT on the homepage */}
        {!isHomePage && <LayoutFooter />}
        
      </div>
    </Providers>
  );
}