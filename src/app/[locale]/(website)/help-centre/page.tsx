import React from 'react';
import { Metadata } from "next";
import Link from "next/link";
import { technicalManuals } from '@/lib/data/manuals';
import { 
  HelpCircle, Sparkles, ShieldCheck, Landmark, 
  ArrowRight, BookOpen, Settings, Zap, Cpu, Globe, MessageSquare 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// FIX 1: Defined at the top so the build engine sees it immediately
const Rocket = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-5c1.62-2.2 5-3 5-3"/><path d="M12 15v5s3.03-.55 5-2c2.2-1.62 3-5 3-5"/></svg>
);

// FIX 2: Enterprise build requirement for [locale] folders
export async function generateStaticParams() {
  return [{ locale: 'en' }];
}

export const metadata: Metadata = {
  title: "Help Centre - BBU1 Knowledge Infrastructure",
  description: "Access high-fidelity documentation, technical manuals, and executive support for the Business Base Universe.",
};

const supportCategories = [
  { title: "Getting Started", desc: "Identity entry and account hydration protocols.", icon: Rocket },
  { title: "Features Guide", desc: "Technical deep-dives into core OS modules.", icon: BookOpen },
  { title: "Integrations", desc: "API orchestration and external tool connectivity.", icon: Cpu },
  { title: "Billing & Pricing", desc: "Sovereign subscription and investment management.", icon: Landmark },
  { title: "Security & RLS", desc: "Data sovereignty and encryption standards.", icon: ShieldCheck },
  { title: "API Documentation", desc: "Developer references for the BBU1 kernel.", icon: Settings }
];

export default async function HelpCentrePage({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}) {
  // FIX 3: Await params to comply with Next.js 15 build standards
  await params;

  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      <main className="flex-grow pt-20 pb-24">
        <div className="container mx-auto px-6 max-w-7xl">
          
          {/* --- HERO HEADER --- */}
          <header className="max-w-4xl mb-32">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full mb-8">
              <HelpCircle className="h-4 w-4 text-blue-600" />
              <span className="text-blue-700 text-xs font-bold tracking-widest uppercase">Knowledge Infrastructure</span>
            </div>
            {/* Fixed: Professional size, straight text, no all-caps */}
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight mb-10">
              Engineering <span className="text-blue-600">Support.</span>
            </h1>
            <p className="text-xl md:text-2xl font-normal text-slate-600 leading-relaxed border-l-4 border-blue-600 pl-8 max-w-3xl">
              Access the architectural blueprints for your business operations. Our knowledge base is engineered for certainty and operational speed.
            </p>
          </header>

          {/* --- CATEGORIES GRID --- */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-40">
            {supportCategories.map((cat, i) => (
              <div key={i} className="p-10 bg-slate-50 border border-slate-200 rounded-[2.5rem] hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all duration-300 group cursor-pointer">
                <cat.icon className="h-10 w-10 text-blue-600 mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-slate-900 text-xl font-bold mb-4 tracking-tight">{cat.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed font-normal">{cat.desc}</p>
              </div>
            ))}
          </section>

          {/* --- MANUALS ACCORDION --- */}
          <section className="mb-40">
            <div className="flex items-center gap-4 text-slate-900 mb-16">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Sovereign Manuals</h2>
            </div>
            
            <div className="max-w-4xl">
              <Accordion type="single" collapsible className="space-y-4">
                {technicalManuals.map((manual, idx) => (
                  <AccordionItem key={idx} value={`item-${idx}`} className="border border-slate-200 rounded-3xl bg-slate-50 px-8 md:px-10 overflow-hidden hover:bg-white hover:border-blue-100 transition-all">
                    <AccordionTrigger className="hover:no-underline py-8">
                       <div className="flex flex-col items-start text-left">
                          <h4 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight leading-snug">{manual.title}</h4>
                          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-2">{manual.verticalCode} | {manual.standardTax}</span>
                       </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-10 pt-4">
                       <div className="space-y-8">
                          <div className="grid gap-6">
                             {manual.phases.map((phase, pIdx) => (
                               <div key={pIdx} className="border-l-2 border-blue-600 pl-6 py-2">
                                  <h5 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-2">{phase.phase}</h5>
                                  <p className="text-slate-600 text-sm font-normal leading-relaxed">{phase.description}</p>
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

          {/* --- FAQ SECTION --- */}
          <section className="mb-40 border-t border-slate-100 pt-24">
             <div className="text-center mb-20">
                <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight">Common Inquiries</h2>
             </div>
             <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                {[
                  { q: "How do I initiate account hydration?", a: "Upon signup, our Architects will contact your primary identity point to initialize the RLS protocols and hydrate your vertical database." },
                  { q: "Can I integrate custom hardware?", a: "Yes. BBU1 supports standard POS peripheral integration via our hardware sync gateway." },
                  { q: "What is the support response SLA?", a: "Enterprise clients receive a < 2-hour response guarantee through our private executive channels." },
                  { q: "Is the documentation localized?", a: "Our knowledge base is currently available in English, French, and Swahili to serve our diverse global user base." }
                ].map((faq, i) => (
                  <div key={i} className="p-10 bg-slate-50 border border-slate-100 rounded-3xl hover:bg-white hover:shadow-md transition-all duration-300">
                    <h4 className="text-slate-900 font-bold text-lg mb-4 tracking-tight">{faq.q}</h4>
                    <p className="text-slate-600 font-normal leading-relaxed text-sm">{faq.a}</p>
                  </div>
                ))}
             </div>
          </section>

          {/* --- FINAL CTA --- */}
          <section className="p-16 md:p-24 bg-blue-600 rounded-[3rem] text-center shadow-2xl shadow-blue-600/20 relative overflow-hidden text-white">
             <div className="absolute top-0 right-0 p-10 opacity-10">
                <MessageSquare className="h-64 w-64 text-white" />
             </div>
             <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-8 relative z-10 leading-tight">Interface with us.</h2>
             <p className="text-blue-50 text-xl md:text-2xl font-normal mb-12 max-w-3xl mx-auto relative z-10 leading-relaxed">
               Establish a direct line to our support architects for complex enterprise migrations and technical orchestration.
             </p>
             <Button size="lg" className="h-16 px-12 bg-white text-blue-600 text-lg font-bold rounded-xl hover:bg-slate-50 transition-all shadow-xl relative z-10" asChild>
                <Link href="/contact">Direct Support Interface</Link>
             </Button>
          </section>

        </div>
      </main>
    </div>
  );
}