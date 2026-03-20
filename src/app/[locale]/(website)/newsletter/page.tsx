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
    <div className="flex flex-col min-h-screen bg-[#020617] text-slate-300 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      <main className="flex-grow pt-32 pb-24">
        <div className="container mx-auto px-6">
          
          {/* --- EXECUTIVE HERO --- */}
          <header className="max-w-5xl mb-32">
            <div className="inline-flex items-center gap-3 px-6 py-2 bg-blue-500/5 border border-blue-500/20 rounded-full mb-8">
              <Sparkles className="h-4 w-4 text-blue-500 animate-pulse" />
              <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.5em]">Executive Intel</span>
            </div>
            <h1 className="text-6xl md:text-9xl font-black text-white tracking-tighter leading-none mb-10 uppercase italic">
              STAY AHEAD <br /> OF THE <span className="text-blue-600">CURVE.</span>
            </h1>
            <p className="text-2xl md:text-3xl font-light text-slate-400 leading-relaxed italic border-l-4 border-blue-600 pl-8 max-w-3xl">
              "Information is the ultimate sovereign asset. We deliver deterministic business intelligence directly to your executive terminal every week."
            </p>
          </header>

          <div className="grid lg:grid-cols-12 gap-20 items-start mb-40">
            <div className="lg:col-span-7 space-y-12">
              <h2 className="text-3xl font-black text-white uppercase italic tracking-tight mb-10">THE INTEL PACKAGE</h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                {[
                  { icon: Cpu, title: "ENGINEERING BRIEFS", desc: "Deep technical dives into the BBU1 core, offline sync protocols, and infrastructure scaling." },
                  { icon: Sparkles, title: "AURA SIGNALS", desc: "Predictive analysis on AI trends and how Aura is evolving to automate complex business logic." },
                  { icon: BarChart3, title: "MARKET DYNAMICS", desc: "Analysis of global commerce trends, localized tax updates, and regulatory compliance shifts." },
                  { icon: ShieldCheck, title: "SECURITY PROTOCOLS", desc: "Updates on data sovereignty, bank-level encryption standards, and audit-readiness strategy." },
                  { icon: Globe, title: "SUCCESS ARCHIVES", desc: "Case studies of high-growth enterprises re-engineering their operations with the Sovereign OS." },
                  { icon: Zap, title: "ELITE ACCESS", desc: "Early-stage beta invites to new BBU1 modules and invitation-only executive networking events." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 group">
                    <item.icon className="h-6 w-6 text-blue-600 shrink-0 mt-1 group-hover:scale-110 transition-transform" />
                    <div>
                      <h4 className="text-white font-black uppercase tracking-widest text-xs mb-2 italic">{item.title}</h4>
                      <p className="text-slate-500 text-sm font-light leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* --- THE INTAKE TERMINAL --- */}
            <div className="lg:col-span-5">
              <Card className="bg-white/5 border-white/10 rounded-[4rem] p-10 md:p-16 shadow-3xl sticky top-32 border-none">
                <h3 className="text-3xl font-black text-white uppercase italic tracking-tight mb-8 leading-none">INTERCEPT INTEL</h3>
                
                {/* SOVEREIGN FIX: Integrated the LeadForm to stop login redirects */}
                <LeadForm intent="ENTERPRISE_DEMO" ctaText="JOIN THE NETWORK" />
                
                <p className="text-[10px] text-slate-600 mt-8 text-center uppercase font-bold tracking-widest">
                  NO SPAM. TOTAL SOVEREIGNTY. UNSUBSCRIBE ANYTIME.
                </p>
              </Card>
            </div>
          </div>

          <section className="p-20 bg-blue-600 rounded-[5rem] text-center shadow-3xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-10">
                <Mail className="h-64 w-64 text-white" />
             </div>
             <h2 className="text-4xl md:text-7xl font-black text-white tracking-tighter uppercase italic mb-8 relative z-10">THE FUTURE IS DELIVERED.</h2>
             <p className="text-blue-100 text-2xl font-light mb-12 max-w-3xl mx-auto relative z-10 leading-relaxed">
               Join thousands of visionaries receiving the architectural blueprints for modern global commerce directly in their inbox.
             </p>
             <Button className="h-20 px-16 bg-white text-blue-600 text-xl font-black uppercase tracking-[0.2em] rounded-[2rem] hover:bg-slate-100 transition-all shadow-2xl relative z-10" asChild>
                <a href="#intercept">Secure Subscription</a>
             </Button>
          </section>

        </div>
      </main>
    </div>
  );
}