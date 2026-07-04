import React from 'react';
import { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, Sparkles, Zap, ShieldCheck, Rocket, Landmark, ArrowRight, Building2 } from "lucide-react";
import BackNavbar from '@/components/BackNavbar';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Pricing & Investment - BBU1 Sovereign OS",
  description: "Transparent, value-driven pricing for the world's most powerful business operating system. Scale from startup to global enterprise.",
};

const ENTERPRISE_STANDARDS = [
  "End-to-End Bank Level Encryption",
  "Aura AI Integration (Core Engine)",
  "Unbreakable Offline Sync Technology",
  "Multi-Currency & Local Tax Compliance",
  "Unlimited Cloud Storage for Documents",
  "Sovereign Data Ownership Guarantee",
];

// ── SINGLE SOURCE OF TRUTH — matches the PLANS array in app/page.tsx ──────────
const PLANS = [
  {
    name: "Business Starter",
    price: 14,
    userLimit: "1 User",
    idealFor: "Kiosks & Micro-Shops",
    highlight: false,
    btnText: "Start Free Trial",
    btnHref: "/signup",
    icon: Zap,
    features: [
      "Cloud POS",
      "Inventory Tracking",
      "Daily Sales Reports",
      "Invoicing",
      "Mobile App Access",
    ],
  },
  {
    name: "Growth",
    price: 42,
    userLimit: "2 Users",
    idealFor: "Small Shops & Solo Founders",
    highlight: false,
    btnText: "Start Free Trial",
    btnHref: "/signup",
    icon: Rocket,
    features: [
      "Full ERP Core",
      "Mobile App",
      "Enterprise Reports",
      "Invoicing System",
      "Cloud Accounting",
      "Cloud Auditing",
      "Complete Tax Filing System",
    ],
  },
  {
    name: "Scale SME",
    price: 69,
    userLimit: "10 Users",
    idealFor: "Growing SMEs & Teams",
    highlight: true,
    btnText: "Start Free Trial",
    btnHref: "/signup",
    icon: Sparkles,
    features: [
      "All Industry Modules",
      "Custom Branding",
      "HR & Payroll",
      "Inventory Tracking",
      "Mobile App",
      "Enterprise Reports",
      "Invoicing System",
      "Cloud Accounting & Auditing",
      "Complete Tax Filing System",
    ],
  },
  {
    name: "Enterprise ERP",
    price: 122,
    userLimit: "Unlimited Users",
    idealFor: "Large Enterprises",
    highlight: false,
    btnText: "Contact Sales",
    btnHref: "/contact",
    icon: Building2,
    features: [
      "API Access & Webhooks",
      "Dedicated Support Manager",
      "On-Premise Option",
      "Custom Branding",
      "Mobile App",
      "Enterprise Reports",
      "Invoicing System",
      "Cloud Accounting & Auditing",
      "Complete Tax Filing System",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 selection:bg-blue-500/30 font-sans overflow-x-hidden">
      <BackNavbar backHref="/" backLabel="Home" />
      <main className="grow pt-20 pb-24">
        <div className="container mx-auto px-6 max-w-7xl">

          {/* Header */}
          <header className="max-w-4xl mb-24">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full mb-8">
              <Landmark className="h-4 w-4 text-blue-600" />
              <span className="text-blue-700 text-xs font-bold tracking-widest uppercase">Investment Tiers</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight mb-10">
              Value without <span className="text-blue-600">friction.</span>
            </h1>
            <p className="text-xl md:text-2xl font-normal text-slate-600 leading-relaxed border-l-4 border-blue-600 pl-8 max-w-3xl">
              We don't charge for features; we charge for scale. Every BBU1 tier includes the full power of our AI and Offline engines.
            </p>
          </header>

          {/* Pricing Grid — 4 plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-40">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              return plan.highlight ? (
                /* Highlighted card */
                <Card key={plan.name} className="bg-blue-600 border-blue-700 rounded-[2.5rem] overflow-hidden shadow-2xl z-10 border transition-transform hover:scale-[1.03] duration-300 text-white md:scale-[1.03]">
                  <CardHeader className="p-8 pb-4">
                    <div className="flex justify-between items-start mb-4">
                      <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="bg-white text-blue-600 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest">Recommended</span>
                    </div>
                    <CardTitle className="text-2xl font-bold text-white tracking-tight">{plan.name}</CardTitle>
                    <p className="text-blue-100 font-bold uppercase tracking-widest text-[10px] mt-1">{plan.idealFor}</p>
                    <div className="mt-6 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-white tracking-tight">${plan.price}</span>
                      <span className="text-blue-100 text-sm font-bold uppercase tracking-widest">/mo</span>
                    </div>
                    <p className="text-blue-200 text-xs mt-1">{plan.userLimit}</p>
                  </CardHeader>
                  <CardContent className="p-8 pt-2">
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2.5 text-sm text-white font-medium">
                          <CheckCircle className="h-4 w-4 text-white/80 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button className="w-full h-12 rounded-xl bg-white text-blue-600 font-bold uppercase tracking-widest text-xs hover:bg-slate-50 transition-all shadow-xl" asChild>
                      <Link href={plan.btnHref}>{plan.btnText}</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                /* Regular card */
                <Card key={plan.name} className="bg-slate-50 border-slate-200 rounded-[2.5rem] overflow-hidden hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all duration-300 border group">
                  <CardHeader className="p-8 pb-4">
                    <div className="mb-4 h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-900 tracking-tight">{plan.name}</CardTitle>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">{plan.idealFor}</p>
                    <div className="mt-6 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-slate-900 tracking-tight">${plan.price}</span>
                      <span className="text-slate-500 text-sm font-bold uppercase tracking-widest">/mo</span>
                    </div>
                    <p className="text-slate-400 text-xs mt-1">{plan.userLimit}</p>
                  </CardHeader>
                  <CardContent className="p-8 pt-2">
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2.5 text-sm font-medium text-slate-600">
                          <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full h-12 rounded-xl font-bold uppercase tracking-widest text-xs transition-all ${
                        plan.btnText === 'Contact Sales'
                          ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20'
                          : 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50'
                      }`}
                      asChild
                    >
                      <Link href={plan.btnHref}>{plan.btnText}</Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* The Sovereign Promise */}
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

          {/* Footer note */}
          <div className="mt-32 text-center max-w-2xl mx-auto">
            <p className="text-slate-500 text-sm leading-relaxed">
              All prices are in USD. Local currency conversion happens automatically at checkout.
              Need a private server or white-label solution?{' '}
              <a href="mailto:ceo@bbu1.com" className="text-blue-600 font-bold hover:underline">
                Connect with the Founder
              </a>.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}
