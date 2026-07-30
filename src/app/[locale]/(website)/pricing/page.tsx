import React from 'react';
import { Metadata } from "next";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import BackNavbar from '@/components/BackNavbar';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Pricing & Investment - BBU1 Sovereign OS",
  description: "Transparent, value-driven pricing for the world's most powerful business operating system. Scale from startup to global enterprise.",
};

const INCLUDED_IN_ALL = [
  "Bank-grade encryption",
  "AI assistant built in",
  "Works offline, syncs when you're back online",
  "Multi-currency and local tax support",
  "Unlimited document storage",
  "Your data stays yours — export any time",
];

// ── SINGLE SOURCE OF TRUTH — matches the PLANS array in app/page.tsx ──────────
const PLANS = [
  {
    name: "Business Starter",
    price: 14,
    userLimit: "1 user",
    idealFor: "Kiosks & micro-shops",
    highlight: false,
    btnText: "Start free trial",
    btnHref: "/signup",
    features: [
      "Cloud POS",
      "Inventory tracking",
      "Daily sales reports",
      "Invoicing",
      "Mobile app access",
    ],
  },
  {
    name: "Growth",
    price: 42,
    userLimit: "2 users",
    idealFor: "Small shops & solo founders",
    highlight: false,
    btnText: "Start free trial",
    btnHref: "/signup",
    features: [
      "Full ERP core",
      "Mobile app",
      "Enterprise reports",
      "Invoicing system",
      "Cloud accounting",
      "Cloud auditing",
      "Complete tax filing system",
    ],
  },
  {
    name: "Scale SME",
    price: 69,
    userLimit: "10 users",
    idealFor: "Growing SMEs & teams",
    highlight: true,
    btnText: "Start free trial",
    btnHref: "/signup",
    features: [
      "All industry modules",
      "Custom branding",
      "HR & payroll",
      "Inventory tracking",
      "Mobile app",
      "Enterprise reports",
      "Invoicing system",
      "Cloud accounting & auditing",
      "Complete tax filing system",
    ],
  },
  {
    name: "Enterprise ERP",
    price: 122,
    userLimit: "Unlimited users",
    idealFor: "Large enterprises",
    highlight: false,
    btnText: "Contact sales",
    btnHref: "/contact",
    features: [
      "API access & webhooks",
      "Dedicated support manager",
      "On-premise option",
      "Custom branding",
      "Mobile app",
      "Enterprise reports",
      "Invoicing system",
      "Cloud accounting & auditing",
      "Complete tax filing system",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 font-sans">
      <BackNavbar backHref="/" backLabel="Home" />
      <main className="grow pt-16 pb-24">
        <div className="container mx-auto px-6 max-w-6xl">

          {/* Header */}
          <header className="max-w-2xl mb-16">
            <p className="text-sm font-semibold text-slate-500 mb-3">Pricing</p>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-5">
              Simple pricing that scales with you
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              Every plan includes the same core engine — AI assistant, offline sync, and
              multi-currency support. You only pay more as your team grows.
            </p>
          </header>

          {/* Pricing Grid — 4 plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-24 items-start">
            {PLANS.map((plan) => (
              <Card
                key={plan.name}
                className={`rounded-lg overflow-hidden transition-shadow ${
                  plan.highlight
                    ? "border-2 border-slate-900 shadow-md"
                    : "border border-slate-200 hover:border-slate-300"
                }`}
              >
                {plan.highlight && (
                  <div className="bg-slate-900 text-white text-xs font-semibold text-center py-1.5">
                    Most popular
                  </div>
                )}
                <CardHeader className="p-6 pb-4">
                  <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{plan.idealFor}</p>
                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-slate-900">${plan.price}</span>
                    <span className="text-slate-500 text-sm">/mo</span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1">{plan.userLimit}</p>
                </CardHeader>
                <CardContent className="p-6 pt-2">
                  <Button
                    className={`w-full h-10 rounded-md font-medium text-sm mb-6 ${
                      plan.highlight
                        ? "bg-slate-900 text-white hover:bg-slate-800"
                        : "bg-white text-slate-900 border border-slate-300 hover:bg-slate-50"
                    }`}
                    asChild
                  >
                    <Link href={plan.btnHref}>{plan.btnText}</Link>
                  </Button>
                  <ul className="space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                        <Check className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* What's included in every plan */}
          <section className="border-t border-slate-200 pt-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-8">
              Included in every plan
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-4">
              {INCLUDED_IN_ALL.map((item) => (
                <div key={item} className="flex items-start gap-3 text-slate-600">
                  <Minus className="h-4 w-4 text-slate-300 shrink-0 mt-1.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Footer note */}
          <div className="mt-20 pt-8 border-t border-slate-200">
            <p className="text-slate-500 text-sm leading-relaxed">
              All prices are in USD; your local currency is applied automatically at checkout.
              Looking for a private server or white-label setup?{' '}
              <a href="mailto:ceo@bbu1.com" className="text-slate-900 font-medium hover:underline">
                Talk to us
              </a>.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}