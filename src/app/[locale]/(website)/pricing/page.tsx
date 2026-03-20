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
    <div className="flex flex-col min-h-screen bg-white text-slate-900 selection:bg-blue-500/30 font-sans overflow-x-hidden">
      <main className="flex-grow pt-20 pb-24">
        <div className="container mx-auto px-6 max-w-7xl">
          
          {/* --- EXECUTIVE HEADER --- */}
          <header className="max-w-4xl mb-32">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full mb-8">
              <Landmark className="h-4 w-4 text-blue-600" />
              <span className="text-blue-700 text-xs font-bold tracking-widest uppercase">Investment Tiers</span>
            </div>
            {/* Fixed: Normal case, straight text, professional size */}
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight mb-10">
              Value without <span className="text-blue-600">friction.</span>
            </h1>
            <p className="text-xl md:text-2xl font-normal text-slate-600 leading-relaxed border-l-4 border-blue-600 pl-8 max-w-3xl">
              We don't charge for features; we charge for scale. Every BBU1 tier includes the full power of our AI and Offline engines.
            </p>
          </header>

          {/* --- PRICING GRID --- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-40">
            
            {/* Starter Plan */}
            <Card className="bg-slate-50 border-slate-200 rounded-[2.5rem] overflow-hidden hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all duration-300 border group">
              <CardHeader className="p-10 md:p-12 pb-6">
                <div className="mb-6 h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Zap className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Starter</CardTitle>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">For Small Shops & Solopreneurs</p>
                <div className="mt-8 flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold text-slate-900 tracking-tight">$15</span>
                  <span className="text-slate-500 text-sm font-bold uppercase tracking-widest">/Month</span>
                </div>
              </CardHeader>
              <CardContent className="p-10 md:p-12 pt-0">
                <ul className="space-y-4 mb-10">
                    <li className="flex items-center gap-3 text-sm font-medium text-slate-600">
                        <CheckCircle className="h-4 w-4 text-green-600" /> <span>Full ERP Core Access</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm font-medium text-slate-600">
                        <CheckCircle className="h-4 w-4 text-green-600" /> <span>Up to 2 Staff Users</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm font-medium text-slate-600">
                        <CheckCircle className="h-4 w-4 text-green-600" /> <span>Mobile App Integration</span>
                    </li>
                </ul>
                <Button className="w-full h-14 rounded-xl bg-white text-slate-900 border border-slate-200 font-bold uppercase tracking-widest text-xs hover:bg-slate-50 transition-all" asChild>
                    <Link href="/signup">Get Started</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Growth Plan (Highlighted) */}
            <Card className="bg-blue-600 border-blue-700 rounded-[2.5rem] overflow-hidden shadow-2xl scale-105 z-10 border transition-transform hover:scale-[1.07] duration-500 text-white">
              <CardHeader className="p-10 md:p-12 pb-6">
                <div className="flex justify-between items-start">
                    <div className="mb-6 h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                        <Rocket className="h-6 w-6" />
                    </div>
                    <span className="bg-white text-blue-600 text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">Recommended</span>
                </div>
                <CardTitle className="text-2xl md:text-3xl font-bold text-white tracking-tight">Growth</CardTitle>
                <p className="text-blue-100 font-bold uppercase tracking-widest text-[10px] mt-2">For Scaling Teams & SMEs</p>
                <div className="mt-8 flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold text-white tracking-tight">$49</span>
                  <span className="text-blue-100 text-sm font-bold uppercase tracking-widest">/Month</span>
                </div>
              </CardHeader>
              <CardContent className="p-10 md:p-12 pt-0">
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
                <Button className="w-full h-14 rounded-xl bg-white text-blue-600 font-bold uppercase tracking-widest text-xs hover:bg-slate-50 transition-all shadow-xl" asChild>
                    <Link href="/signup">Start Free Trial</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Scale Plan */}
            <Card className="bg-slate-50 border-slate-200 rounded-[2.5rem] overflow-hidden hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all duration-300 border group">
              <CardHeader className="p-10 md:p-12 pb-6">
                <div className="mb-6 h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Landmark className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Scale</CardTitle>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">For Large Enterprises</p>
                <div className="mt-8 flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold text-slate-900 tracking-tight">$119</span>
                  <span className="text-slate-500 text-sm font-bold uppercase tracking-widest">/Month</span>
                </div>
              </CardHeader>
              <CardContent className="p-10 md:p-12 pt-0">
                <ul className="space-y-4 mb-10">
                    <li className="flex items-center gap-3 text-sm font-medium text-slate-600">
                        <CheckCircle className="h-4 w-4 text-green-600" /> <span>Everything in Growth</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm font-medium text-slate-600">
                        <CheckCircle className="h-4 w-4 text-green-600" /> <span>Unlimited Staff Users</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm font-medium text-slate-600">
                        <CheckCircle className="h-4 w-4 text-green-600" /> <span>Dedicated Support Mgr</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm font-medium text-slate-600">
                        <CheckCircle className="h-4 w-4 text-green-600" /> <span>Custom API & Webhooks</span>
                    </li>
                </ul>
                <Button className="w-full h-14 rounded-xl bg-white text-slate-900 border border-slate-200 font-bold uppercase tracking-widest text-xs hover:bg-slate-50 transition-all" asChild>
                    <Link href="/contact">Contact Sales</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* --- THE SOVEREIGN PROMISE --- */}
          <section className="bg-slate-50 border border-slate-200 rounded-[3rem] p-12 md:p-20 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-10">
                <ShieldCheck className="h-64 w-64 text-slate-900" />
             </div>
             
             <div className="relative z-10 max-w-4xl">
                <div className="flex items-center gap-2 text-blue-600 mb-6">
                    <Sparkles className="h-5 w-5" />
                    <span className="text-xs font-bold uppercase tracking-widest">The Unified Standard</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight mb-12">
                   Included in <br /> every tier.
                </h2>
                <div className="grid md:grid-cols-2 gap-x-12 gap-y-6">
                    {ENTERPRISE_STANDARDS.map((feature, i) => (
                        <div key={i} className="flex items-center gap-4 text-slate-600 text-lg font-normal">
                            <CheckCircle className="h-5 w-5 text-blue-600 shrink-0" />
                            <span>{feature}</span>
                        </div>
                    ))}
                </div>
             </div>
          </section>

          {/* --- FOOTER INFO --- */}
          <div className="mt-32 text-center max-w-2xl mx-auto">
            <p className="text-slate-500 text-sm leading-relaxed">
                All prices are in USD. Local currency conversion happens automatically at checkout. 
                Need a private server or white-label solution? <a href="mailto:ceo@bbu1.com" className="text-blue-600 font-bold hover:underline">Connect with the Founder</a>.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}