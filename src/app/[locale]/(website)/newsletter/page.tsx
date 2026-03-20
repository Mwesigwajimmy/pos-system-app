import React from 'react';
import { Metadata } from "next";
import { Mail, CheckCircle, Zap, Sparkles, ShieldCheck, Cpu, ArrowRight, BarChart3, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LeadForm from "@/components/LeadForm";

// ENTERPRISE BUILD FIX: Required for [locale] static generation
export async function generateStaticParams() {
  return [{ locale: 'en' }];
}

export const metadata: Metadata = {
  title: "The BBU1 Intel - Engineering & Strategy Briefs",
  description: "Join the BBU1 global network. Weekly executive intelligence on business automation, Aura AI innovation, and sovereign operational strategy.",
};

export default async function NewsletterPage({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}) {
  // NEXT.js 15 FIX: Must await params to prevent 500 error
  await params;

  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      <main className="flex-grow pt-20 pb-24">
        <div className="container mx-auto px-6 max-w-7xl">
          
          {/* --- EXECUTIVE HERO --- */}
          <header className="max-w-4xl mb-32">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full mb-8">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-blue-700 text-xs font-bold tracking-widest uppercase">Executive Intel</span>
            </div>
            {/* Normalized size, straight text, no all-caps */}
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight mb-10">
              Stay ahead <br /> of the <span className="text-blue-600">curve.</span>
            </h1>
            <p className="text-xl md:text-2xl font-normal text-slate-600 leading-relaxed border-l-4 border-blue-600 pl-8 max-w-3xl">
              Information is the ultimate sovereign asset. We deliver deterministic business intelligence directly to your executive terminal every week.
            </p>
          </header>

          <div className="grid lg:grid-cols-12 gap-16 items-start mb-40">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-12">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-10 uppercase">The Intel Package</h2>
              
              <div className="grid md:grid-cols-2 gap-10">
                {[
                  { icon: Cpu, title: "Engineering Briefs", desc: "Deep technical dives into the BBU1 core, offline sync protocols, and infrastructure scaling." },
                  { icon: Sparkles, title: "Aura Signals", desc: "Predictive analysis on AI trends and how Aura is evolving to automate complex business logic." },
                  { icon: BarChart3, title: "Market Dynamics", desc: "Analysis of global commerce trends, localized tax updates, and regulatory compliance shifts." },
                  { icon: ShieldCheck, title: "Security Protocols", desc: "Updates on data sovereignty, bank-level encryption standards, and audit-readiness strategy." },
                  { icon: Globe, title: "Success Archives", desc: "Case studies of high-growth enterprises re-engineering their operations with the Sovereign OS." },
                  { icon: Zap, title: "Elite Access", desc: "Early-stage beta invites to new BBU1 modules and invitation-only executive networking events." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 group">
                    <item.icon className="h-6 w-6 text-blue-600 shrink-0 mt-1 group-hover:scale-110 transition-transform" />
                    <div>
                      {/* Straight text titles */}
                      <h4 className="text-slate-900 font-bold text-base mb-2">{item.title}</h4>
                      <p className="text-slate-500 text-sm font-normal leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* --- THE INTAKE TERMINAL (SUBSCRIPTION CARD) --- */}
            <div className="lg:col-span-5">
              <Card id="intercept" className="bg-slate-50 border-slate-200 rounded-[2.5rem] p-8 md:p-12 shadow-sm sticky top-32 border">
                <h3 className="text-2xl font-bold text-slate-900 mb-8 tracking-tight">Intercept Intel</h3>
                
                <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-xl">
                    <LeadForm intent="ENTERPRISE_DEMO" ctaText="JOIN THE NETWORK" />
                </div>
                
                <p className="text-[10px] text-slate-400 mt-8 text-center uppercase font-bold tracking-widest">
                  NO SPAM. TOTAL SOVEREIGNTY. UNSUBSCRIBE ANYTIME.
                </p>
              </Card>
            </div>
          </div>

          {/* --- FINAL CTA --- */}
          <section className="p-16 md:p-24 bg-blue-600 rounded-[3rem] text-center shadow-2xl shadow-blue-600/20 relative overflow-hidden text-white">
             <div className="absolute top-0 right-0 p-10 opacity-10">
                <Mail className="h-64 w-64 text-white" />
             </div>
             <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-8 relative z-10 leading-tight">The future is delivered.</h2>
             <p className="text-blue-50 text-xl md:text-2xl font-normal mb-12 max-w-3xl mx-auto relative z-10 leading-relaxed">
               Join thousands of visionaries receiving the architectural blueprints for modern global commerce directly in their inbox.
             </p>
             <Button size="lg" className="h-16 px-12 bg-white text-blue-600 text-lg font-bold rounded-xl hover:bg-slate-50 transition-all shadow-xl relative z-10" asChild>
                <a href="#intercept">Secure Subscription</a>
             </Button>
          </section>

        </div>
      </main>
    </div>
  );
}