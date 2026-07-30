import React from 'react';
import { Metadata } from "next";
import Link from "next/link";
import { technicalManuals } from '@/lib/data/manuals';
import { featureSets } from '@/lib/data/features';
import { industries } from '@/lib/data/industries';
import BackNavbar from '@/components/BackNavbar';
import { HelpCircle, BookOpen, MessageSquare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// Required for static export of [locale] routes
export async function generateStaticParams() {
  return [{ locale: 'en' }];
}

export const metadata: Metadata = {
  title: "Help Center",
  description: "Guides, documentation, and support for every module of BBU1.",
};

// FAQs grounded directly in what the modules actually do (see /lib/data/features.ts)
const faqs = [
  {
    q: "What's actually included in BBU1?",
    a: "Nine core modules: Human Resources, CRM & Sales, Finance & Accounting, Inventory & Supply Chain, Sales & E-commerce, Project Management, Compliance & Governance, Telecom Services, and Business Intelligence & AI (Aura). They share the same data, so a sale, a stock update, and the resulting invoice all stay in sync automatically.",
  },
  {
    q: "Does the point of sale work if the internet goes down?",
    a: "Yes. The POS is offline-capable and keeps selling without a connection, then syncs with your inventory the moment it's back online.",
  },
  {
    q: "Can I run accounting in more than one currency?",
    a: "Yes — Finance & Accounting supports multi-currency transactions and reporting, with exchange rates that update automatically, and Inventory supports tracking stock across multiple warehouses in real time.",
  },
  {
    q: "What is Aura?",
    a: "Aura is the AI assistant built into BBU1. It handles day-to-day bookkeeping, flags anomalies like duplicate payments, answers plain-language questions about your own data, and projects cash flow based on outstanding invoices and recurring expenses.",
  },
  {
    q: "Do you support telecom and mobile money businesses specifically?",
    a: "Yes — the Telecom Services module is built for agent-based operations: agent hierarchy and commissions, real-time float monitoring, reconciliation and settlement with MNOs and partners, and subscriber management.",
  },
  {
    q: "Which industries is BBU1 built for?",
    a: `BBU1 is used across ${industries.length}+ industries, from retail and restaurants to healthcare, construction, SACCOs, real estate, and NGOs. Each industry page details the specific challenges and solutions for that sector.`,
  },
  {
    q: "How does access control and audit work?",
    a: "Compliance & Governance gives you role-based access down to individual fields, a full audit trail with a timestamp and user ID on every action, and configurable tax and currency rules per region.",
  },
  {
    q: "Can clients or customers see anything themselves?",
    a: "Yes, in the modules where that applies — for example, Project Management includes a secure, read-only client portal for progress, files, and invoices, and CRM keeps a full activity timeline attached to each customer record.",
  },
];

export default async function HelpCentrePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  // Required to satisfy Next.js 15's async params
  await params;

  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      <BackNavbar backHref="/" backLabel="Home" />

      <main className="flex-grow pt-20 pb-24">
        <div className="container mx-auto px-6 max-w-7xl">

          {/* --- HERO --- */}
          <header className="max-w-4xl mb-32">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full mb-8">
              <HelpCircle className="h-4 w-4 text-blue-600" />
              <span className="text-blue-700 text-xs font-bold tracking-widest uppercase">Help Center</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight mb-10">
              How can we <span className="text-blue-600">help?</span>
            </h1>
            <p className="text-xl md:text-2xl font-normal text-slate-600 leading-relaxed border-l-4 border-blue-600 pl-8 max-w-3xl">
              Find documentation for every BBU1 module — from Finance and Inventory to Aura, our built-in AI assistant.
            </p>
          </header>

          {/* --- MODULES (from featureSets) --- */}
          <section className="mb-40">
            <div className="flex items-center gap-4 text-slate-900 mb-16">
              <HelpCircle className="h-8 w-8 text-blue-600" />
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Browse by module</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featureSets.map((feature) => (
                <Link
                  key={feature.slug}
                  href={`/features/${feature.slug}`}
                  className="p-10 bg-slate-50 border border-slate-200 rounded-[2.5rem] hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all duration-300 group cursor-pointer flex flex-col"
                >
                  <feature.icon className="h-10 w-10 text-blue-600 mb-6 group-hover:scale-110 transition-transform" />
                  <h3 className="text-slate-900 text-xl font-bold mb-4 tracking-tight">{feature.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed font-normal mb-6">{feature.description}</p>
                  <span className="mt-auto inline-flex items-center gap-1.5 text-blue-600 text-sm font-semibold">
                    Explore module <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* --- INDUSTRIES (from industries data) --- */}
          <section className="mb-40">
            <div className="flex items-center gap-4 text-slate-900 mb-16">
              <HelpCircle className="h-8 w-8 text-blue-600" />
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Guides by industry</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {industries.map((industry) => (
                <Link
                  key={industry.slug}
                  href={`/industries/${industry.slug}`}
                  className="flex items-center gap-4 p-6 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-white hover:border-blue-100 hover:shadow-md transition-all duration-300 group"
                >
                  <industry.icon className="h-6 w-6 text-blue-600 flex-shrink-0" />
                  <div>
                    <h4 className="text-slate-900 font-bold text-sm tracking-tight">{industry.name}</h4>
                    <p className="text-slate-500 text-xs leading-snug mt-1">{industry.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* --- MANUALS --- */}
          <section className="mb-40">
            <div className="flex items-center gap-4 text-slate-900 mb-16">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Manuals</h2>
            </div>

            <div className="max-w-4xl">
              <Accordion type="single" collapsible className="space-y-4">
                {technicalManuals.map((manual, idx) => (
                  <AccordionItem
                    key={idx}
                    value={`item-${idx}`}
                    className="border border-slate-200 rounded-3xl bg-slate-50 px-8 md:px-10 overflow-hidden hover:bg-white hover:border-blue-100 transition-all"
                  >
                    <AccordionTrigger className="hover:no-underline py-8">
                      <div className="flex flex-col items-start text-left">
                        <h4 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                          {manual.title}
                        </h4>
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-2">
                          {manual.verticalCode} | {manual.standardTax}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-10 pt-4">
                      <div className="space-y-8">
                        <div className="grid gap-6">
                          {manual.phases.map((phase, pIdx) => (
                            <div key={pIdx} className="border-l-2 border-blue-600 pl-6 py-2">
                              <h5 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-2">
                                {phase.phase}
                              </h5>
                              <p className="text-slate-600 text-sm font-normal leading-relaxed">
                                {phase.description}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="p-8 bg-blue-50 border border-blue-100 rounded-2xl">
                          <p className="text-blue-800 text-sm font-semibold leading-relaxed">
                            {manual.summary}
                          </p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>

          {/* --- FAQ --- */}
          <section className="mb-40 border-t border-slate-100 pt-24">
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight">
                Frequently asked questions
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className="p-10 bg-slate-50 border border-slate-100 rounded-3xl hover:bg-white hover:shadow-md transition-all duration-300"
                >
                  <h4 className="text-slate-900 font-bold text-lg mb-4 tracking-tight">{faq.q}</h4>
                  <p className="text-slate-600 font-normal leading-relaxed text-sm">{faq.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* --- CTA --- */}
          <section className="p-16 md:p-24 bg-blue-600 rounded-[3rem] text-center shadow-2xl shadow-blue-600/20 relative overflow-hidden text-white">
            <div className="absolute top-0 right-0 p-10 opacity-10">
              <MessageSquare className="h-64 w-64 text-white" />
            </div>
            <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-8 relative z-10 leading-tight">
              Still need help?
            </h2>
            <p className="text-blue-50 text-xl md:text-2xl font-normal mb-12 max-w-3xl mx-auto relative z-10 leading-relaxed">
              Get in touch with our support team for anything not covered above.
            </p>
            <Button
              size="lg"
              className="h-16 px-12 bg-white text-blue-600 text-lg font-bold rounded-xl hover:bg-slate-50 transition-all shadow-xl relative z-10"
              asChild
            >
              <Link href="/contact">Contact support</Link>
            </Button>
          </section>

        </div>
      </main>
    </div>
  );
}