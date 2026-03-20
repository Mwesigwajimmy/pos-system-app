"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Providers from "@/components/Providers";
import { Button } from "@/components/ui/button";
import { 
  Rocket, Menu, X, Mail, Linkedin, Twitter, Facebook, 
  Leaf, DownloadCloud, Sparkles, ChevronDown, MessageSquareText,
  ShieldCheck, FileText, Phone
} from "lucide-react";

/**
 * --- DETAILED LAYOUT HEADER ---
 * Matches the navigation seen in your megamenu screenshots.
 */
const LayoutHeader = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur-md">
      <div className="container mx-auto flex h-20 items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 font-black text-2xl text-blue-600 tracking-tight italic group">
          <Rocket className="h-8 w-8 group-hover:rotate-12 transition-transform" /> 
          <span>BBU1</span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden xl:flex items-center gap-6 text-[11px] font-bold uppercase tracking-widest text-slate-600">
          <Link href="/features" className="hover:text-blue-600 transition-colors flex items-center gap-1">
            Features <ChevronDown className="h-3 w-3 opacity-50" />
          </Link>
          <Link href="/industries" className="hover:text-blue-600 transition-colors flex items-center gap-1">
            Industries <ChevronDown className="h-3 w-3 opacity-50" />
          </Link>
          <Link href="/aura-ai" className="text-blue-500 hover:text-blue-600 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" /> Aura AI
          </Link>
          <Link href="/courses" className="hover:text-blue-600 transition-colors">Academy</Link>
          <Link href="/blog" className="hover:text-blue-600 transition-colors">Journal</Link>
          <Link href="/help-centre" className="hover:text-blue-600 transition-colors">Help Center</Link>
          <Link href="/faq" className="hover:text-blue-600 transition-colors">FAQ</Link>
        </nav>

        {/* Action Buttons */}
        <div className="hidden lg:flex items-center gap-3">
          <Button variant="outline" size="sm" className="border-blue-600 text-blue-600 hover:bg-blue-50 text-[10px] font-bold uppercase">
            <DownloadCloud className="h-4 w-4 mr-2" /> Install App
          </Button>
          <Button variant="outline" size="sm" className="border-blue-600 text-blue-600 hover:bg-blue-50 text-[10px] font-bold uppercase">
            Book a Demo
          </Button>
          <Link href="/login" className="text-[10px] font-bold uppercase tracking-widest px-2 hover:text-blue-600">
            Log In
          </Link>
          <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] rounded-lg px-6 shadow-lg shadow-blue-600/20">
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>

        {/* Mobile Toggle */}
        <button className="xl:hidden p-2 text-slate-600" onClick={() => setIsMobileOpen(!isMobileOpen)}>
          {isMobileOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileOpen && (
        <div className="xl:hidden bg-white border-t p-6 flex flex-col gap-4 font-bold uppercase text-xs tracking-widest">
          <Link href="/features" onClick={() => setIsMobileOpen(false)}>Features</Link>
          <Link href="/industries" onClick={() => setIsMobileOpen(false)}>Industries</Link>
          <Link href="/aura-ai" className="text-blue-500" onClick={() => setIsMobileOpen(false)}>Aura AI</Link>
          <Link href="/courses" onClick={() => setIsMobileOpen(false)}>Academy</Link>
          <Link href="/blog" onClick={() => setIsMobileOpen(false)}>Journal</Link>
          <Link href="/help-centre" onClick={() => setIsMobileOpen(false)}>Help Center</Link>
          <div className="pt-4 border-t flex flex-col gap-3">
            <Link href="/login" className="py-2">Log In</Link>
            <Button className="bg-blue-600 w-full">Get Started</Button>
          </div>
        </div>
      )}
    </header>
  );
};

/**
 * --- DETAILED LAYOUT FOOTER ---
 * Includes the email display, socials, and all 3 columns of links from your landing page.
 */
const LayoutFooter = () => (
  <footer className="bg-[#020617] text-slate-300 pt-20 pb-10 border-t border-white/5">
    <div className="container mx-auto px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
        
        {/* Brand & Contact */}
        <div className="lg:col-span-2 space-y-8">
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <Rocket className="h-7 w-7 text-blue-500" /> BBU1
          </h3>
          <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
            Your all-in-one OS for your business. Unify cloud accounting, cloud Auditing, Advanced reports, invoicing, CRM, and Aura AI insights.
          </p>
          
          {/* Email Inquiry Box */}
          <div className="flex items-center gap-4 group">
            <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Official Inquiry</p>
              <a href="mailto:info@bbu1.com" className="text-white hover:text-blue-400 transition-colors">info@bbu1.com</a>
            </div>
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-3">
            {[Linkedin, Twitter, Facebook].map((Icon, i) => (
              <a key={i} href="#" className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:bg-blue-600 hover:text-white transition-all">
                <Icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>

        {/* Product Column */}
        <div>
          <h4 className="font-bold text-white mb-6 uppercase text-[11px] tracking-widest">Product</h4>
          <ul className="space-y-4 text-sm text-slate-400">
            <li><Link href="/features" className="hover:text-blue-400 transition-colors">OS Features</Link></li>
            <li><Link href="/industries" className="hover:text-blue-400 transition-colors">Sector Solutions</Link></li>
            <li><Link href="/aura-ai" className="text-blue-500 font-bold italic hover:text-blue-400">Aura Neural Core</Link></li>
            <li><Link href="/pricing" className="hover:text-blue-400 transition-colors">Investment Tiers</Link></li>
            <li><Link href="/blog" className="hover:text-blue-400 transition-colors">Engineering Journal</Link></li>
          </ul>
        </div>

        {/* Company Column */}
        <div>
          <h4 className="font-bold text-white mb-6 uppercase text-[11px] tracking-widest">Company</h4>
          <ul className="space-y-4 text-sm text-slate-400">
            <li><Link href="/contact" className="hover:text-blue-400 transition-colors">Contact Sales</Link></li>
            <li><Link href="/help-centre" className="hover:text-blue-400 transition-colors">Documentation</Link></li>
            <li><Link href="/courses" className="hover:text-blue-400 transition-colors">BBU1 Academy</Link></li>
            <li><Link href="/about" className="hover:text-blue-400 transition-colors">About Us</Link></li>
            <li><Link href="/careers" className="hover:text-blue-400 transition-colors">Careers & Hiring</Link></li>
          </ul>
        </div>

        {/* Support/Legal Column */}
        <div>
          <h4 className="font-bold text-white mb-6 uppercase text-[11px] tracking-widest">Support</h4>
          <ul className="space-y-4 text-sm text-slate-400">
            <li><Link href="/contact" className="hover:text-blue-400 transition-colors">Strategic Inquiry</Link></li>
            <li><Link href="/newsletter" className="hover:text-blue-400 transition-colors">Executive Intel</Link></li>
            <li><Link href="/donate" className="hover:text-blue-400 transition-colors">Support the Mission</Link></li>
            <li><Link href="/terms" className="hover:text-blue-400 transition-colors">Terms of Service</Link></li>
            <li><Link href="/privacy" className="hover:text-blue-400 transition-colors">Privacy Policy</Link></li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/5 pt-8 flex flex-col md:row justify-between items-center text-[10px] text-slate-500 gap-4 uppercase font-bold tracking-[0.2em]">
        <p>© {new Date().getFullYear()} BBU1 International. All rights reserved.</p>
        <p className="flex items-center gap-1">
          Made with <Leaf className="h-3 w-3 text-green-600" /> for the World.
        </p>
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
  // If path is "/" or "/en" or "/fr", we hide these to avoid double-rendering 
  // since your page.tsx already contains its own header/footer.
  const isHomePage = pathname === "/" || pathname.split("/").length <= 2;

  return (
    <Providers>
      <div className="flex flex-col min-h-screen bg-white text-slate-900 selection:bg-blue-500/30">
        
        {/* Shows on every page EXCEPT the landing page */}
        {!isHomePage && <LayoutHeader />}

        <main className="flex-grow">
          {children}
        </main>

        {/* Shows on every page EXCEPT the landing page */}
        {!isHomePage && <LayoutFooter />}
        
      </div>
    </Providers>
  );
}