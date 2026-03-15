import React from 'react';
import { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, Sparkles, Zap, ShieldCheck, Rocket, Landmark, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Pricing & Investment - BBU1 Sovereign OS",
  description: "Transparent, value-driven pricing for the world's most powerful business operating system. Scale from startup to global enterprise.",
};

// Re-using the professional feature lists for consistency
const ENTERPRISE_STANDARDS = [
  "End-to-End Bank Level Encryption",
  "Aura AI Integration (Core Engine)",
  "Unbreakable Offline Sync Technology",
  "Multi-Currency & Local Tax Compliance",
  "Unlimited Cloud Storage for Documents",
  "Sovereign Data Ownership Guarantee"
];

export default function PricingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#020617] text-slate-300 selection:bg-blue-500/30 font-sans">
      <main className="flex-grow pt-32 pb-24">
        <div className="container mx-auto px-6">
          
          {/* --- EXECUTIVE HEADER --- */}
          <header className="max-w-5xl mb-32">
            <div className="inline-flex items-center gap-3 px-6 py-2 bg-blue-500/5 border border-blue-500/20 rounded-full mb-8">
              <Landmark className="h-4 w-4 text-blue-500" />
              <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.5em]">Investment Tiers</span>
            </div>
            <h1 className="text-6xl md:text-9xl font-black text-white tracking-tighter leading-none mb-10 uppercase italic">
              VALUE WITHOUT <br /> <span className="text-blue-600">FRICTION.</span>
            </h1>
            <p className="text-2xl md:text-3xl font-light text-slate-400 leading-relaxed italic border-l-4 border-blue-600 pl-8 max-w-3xl">
              "We don't charge for features; we charge for scale. Every BBU1 tier includes the full power of our AI and Offline engines."
            </p>
          </header>

          {/* --- PRICING GRID --- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-40">
            
            {/* Starter Plan */}
            <Card className="bg-white/5 border-white/10 rounded-[3rem] overflow-hidden hover:bg-white/[0.08] transition-all duration-500 border-none group">
              <CardHeader className="p-12 pb-6">
                <div className="mb-6 h-12 w-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400">
                  <Zap className="h-6 w-6" />
                </div>
                <CardTitle className="text-3xl font-black text-white uppercase italic tracking-tight">Starter</CardTitle>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">For Small Shops & Solopreneurs</p>
                <div className="mt-8 flex items-baseline gap-1">
                  <span className="text-5xl font-black text-white">$15</span>
                  <span className="text-slate-500 text-sm font-bold">/MONTH</span>
                </div>
              </CardHeader>
              <CardContent className="p-12 pt-0">
                <ul className="space-y-4 mb-10">
                    <li className="flex items-center gap-3 text-sm text-slate-400">
                        <CheckCircle className="h-4 w-4 text-green-500" /> <span>Full ERP Core Access</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm text-slate-400">
                        <CheckCircle className="h-4 w-4 text-green-500" /> <span>Up to 2 Staff Users</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm text-slate-400">
                        <CheckCircle className="h-4 w-4 text-green-500" /> <span>Mobile App Integration</span>
                    </li>
                </ul>
                <Button className="w-full py-8 rounded-2xl bg-white/10 text-white font-black uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10" asChild>
                    <Link href="/signup">Get Started</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Growth Plan (Highlighted) */}
            <Card className="bg-blue-600 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(37,99,235,0.2)] scale-105 z-10 border-none transition-transform hover:scale-[1.07] duration-500">
              <CardHeader className="p-12 pb-6">
                <div className="flex justify-between items-start">
                    <div className="mb-6 h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                        <Rocket className="h-6 w-6" />
                    </div>
                    <span className="bg-white text-blue-600 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">Recommended</span>
                </div>
                <CardTitle className="text-3xl font-black text-white uppercase italic tracking-tight">Growth</CardTitle>
                <p className="text-blue-100 font-bold uppercase tracking-widest text-[10px] mt-2">For Scaling Teams & SMEs</p>
                <div className="mt-8 flex items-baseline gap-1">
                  <span className="text-5xl font-black text-white">$49</span>
                  <span className="text-blue-200 text-sm font-bold">/MONTH</span>
                </div>
              </CardHeader>
              <CardContent className="p-12 pt-0">
                <ul className="space-y-4 mb-10">
                    <li className="flex items-center gap-3 text-sm text-white font-medium">
                        <CheckCircle className="h-4 w-4 text-white/80" /> <span>Everything in Starter</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm text-white font-medium">
                        <CheckCircle className="h-4 w-4 text-white/80" /> <span>Up to 10 Staff Users</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm text-white font-medium">
                        <CheckCircle className="h-4 w-4 text-white/80" /> <span>Full Industry Modules</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm text-white font-medium">
                        <CheckCircle className="h-4 w-4 text-white/80" /> <span>Advanced Inventory Mgmt</span>
                    </li>
                </ul>
                <Button className="w-full py-8 rounded-2xl bg-white text-blue-600 font-black uppercase tracking-widest hover:bg-slate-100 transition-all shadow-2xl" asChild>
                    <Link href="/signup">Start Free Trial</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Scale Plan */}
            <Card className="bg-white/5 border-white/10 rounded-[3rem] overflow-hidden hover:bg-white/[0.08] transition-all duration-500 border-none">
              <CardHeader className="p-12 pb-6">
                <div className="mb-6 h-12 w-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400">
                  <Landmark className="h-6 w-6" />
                </div>
                <CardTitle className="text-3xl font-black text-white uppercase italic tracking-tight">Scale</CardTitle>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">For Large Enterprises</p>
                <div className="mt-8 flex items-baseline gap-1">
                  <span className="text-5xl font-black text-white">$119</span>
                  <span className="text-slate-500 text-sm font-bold">/MONTH</span>
                </div>
              </CardHeader>
              <CardContent className="p-12 pt-0">
                <ul className="space-y-4 mb-10">
                    <li className="flex items-center gap-3 text-sm text-slate-400">
                        <CheckCircle className="h-4 w-4 text-green-500" /> <span>Everything in Growth</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm text-slate-400">
                        <CheckCircle className="h-4 w-4 text-green-500" /> <span>Unlimited Staff Users</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm text-slate-400">
                        <CheckCircle className="h-4 w-4 text-green-500" /> <span>Dedicated Support Mgr</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm text-slate-400">
                        <CheckCircle className="h-4 w-4 text-green-500" /> <span>Custom API & Webhooks</span>
                    </li>
                </ul>
                <Button className="w-full py-8 rounded-2xl bg-white/10 text-white font-black uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10" asChild>
                    <Link href="/contact">Contact Sales</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* --- THE SOVEREIGN PROMISE --- */}
          <section className="bg-white/5 border border-white/10 rounded-[4rem] p-16 md:p-24 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-5">
                <ShieldCheck className="h-96 w-96" />
             </div>
             
             <div className="relative z-10 max-w-4xl">
                <div className="flex items-center gap-4 text-blue-500 mb-8">
                    <Sparkles className="h-8 w-8" />
                    <span className="text-sm font-black uppercase tracking-[0.4em]">The Unified Standard</span>
                </div>
                <h2 className="text-4xl md:text-7xl font-black text-white tracking-tighter uppercase italic mb-12">
                   INCLUDED IN <br /> EVERY TIER.
                </h2>
                <div className="grid md:grid-cols-2 gap-x-12 gap-y-6">
                    {ENTERPRISE_STANDARDS.map((feature, i) => (
                        <div key={i} className="flex items-center gap-4 text-slate-400 text-lg font-light">
                            <CheckCircle className="h-5 w-5 text-blue-600 shrink-0" />
                            <span>{feature}</span>
                        </div>
                    ))}
                </div>
             </div>
          </section>

          {/* --- FOOTER CTA --- */}
          <div className="mt-40 text-center">
            <p className="text-slate-500 text-sm mb-8">
                All prices are in USD. Local currency conversion happens automatically at checkout. <br />
                Need a private server or white-label solution? <a href="mailto:ceo@bbu1.com" className="text-blue-500 font-bold hover:underline">Connect with the Founder</a>.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}