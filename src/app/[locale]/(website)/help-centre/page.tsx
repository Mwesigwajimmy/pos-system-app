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
    <div className="flex flex-col min-h-screen bg-[#020617] text-slate-300 font-sans selection:bg-blue-500/30">
      <main className="flex-grow pt-32 pb-24">
        <div className="container mx-auto px-6">
          
          <header className="max-w-5xl mb-32">
            <div className="inline-flex items-center gap-3 px-6 py-2 bg-blue-500/5 border border-blue-500/20 rounded-full mb-8">
              <HelpCircle className="h-4 w-4 text-blue-500 animate-pulse" />
              <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.5em]">Knowledge Infrastructure</span>
            </div>
            <h1 className="text-6xl md:text-9xl font-black text-white tracking-tighter leading-none mb-10 uppercase italic">
              ENGINEERING <br /> <span className="text-blue-600">SUPPORT.</span>
            </h1>
            <p className="text-2xl md:text-3xl font-light text-slate-400 leading-relaxed italic border-l-4 border-blue-600 pl-8 max-w-3xl">
              "Access the architectural blueprints for your business operations. Our knowledge base is engineered for certainty and operational speed."
            </p>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-40">
            {supportCategories.map((cat, i) => (
              <div key={i} className="p-10 bg-white/5 border border-white/10 rounded-[3rem] hover:bg-blue-600/5 transition-all duration-500 group cursor-pointer">
                <cat.icon className="h-10 w-10 text-blue-600 mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-white text-xl font-black mb-4 tracking-tight uppercase italic">{cat.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed font-light">{cat.desc}</p>
              </div>
            ))}
          </section>

          <section className="mb-40">
            <div className="flex items-center gap-4 text-white mb-16">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">SOVEREIGN MANUALS</h2>
            </div>
            
            <div className="max-w-4xl">
              <Accordion type="single" collapsible className="space-y-6">
                {technicalManuals.map((manual, idx) => (
                  <AccordionItem key={idx} value={`item-${idx}`} className="border border-white/10 rounded-[2.5rem] bg-white/5 px-10 overflow-hidden hover:bg-white/[0.08] transition-all border-none">
                    <AccordionTrigger className="hover:no-underline py-8">
                       <div className="flex flex-col items-start text-left">
                          <h4 className="text-2xl font-black text-white uppercase italic tracking-tight">{manual.title}</h4>
                          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">{manual.verticalCode} | {manual.standardTax}</span>
                       </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-10 pt-4">
                       <div className="space-y-8">
                          <div className="grid gap-6">
                             {manual.phases.map((phase, pIdx) => (
                               <div key={pIdx} className="border-l-2 border-blue-600 pl-6 py-2">
                                  <h5 className="text-sm font-black text-white uppercase tracking-widest mb-2 italic">{phase.phase}</h5>
                                  <p className="text-slate-400 text-sm font-light leading-relaxed">{phase.description}</p>
                               </div>
                             ))}
                          </div>
                          <div className="p-8 bg-blue-600/10 border border-blue-600/20 rounded-3xl">
                             <p className="text-white text-xs font-black uppercase tracking-widest leading-relaxed">
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

          <section className="mb-40 border-t border-white/10 pt-24">
             <div className="text-center mb-20">
                <h2 className="text-4xl md:text-7xl font-black text-white uppercase italic tracking-tighter">COMMON INQUIRIES</h2>
             </div>
             <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                {[
                  { q: "How do I initiate account hydration?", a: "Upon signup, our Architects will contact your primary identity point to initialize the RLS protocols and hydrate your vertical database." },
                  { q: "Can I integrate custom hardware?", a: "Yes. BBU1 supports standard POS peripheral integration via our hardware sync gateway." },
                  { q: "What is the support response SLA?", a: "Enterprise clients receive a < 2-hour response guarantee through our private WhatsApp executive channels." },
                  { q: "Is the documentation localized?", a: "Our knowledge base is currently available in English, French, and Swahili to serve our diverse global user base." }
                ].map((faq, i) => (
                  <div key={i} className="p-10 bg-white/5 border border-white/10 rounded-[3rem]">
                    <h4 className="text-white font-black uppercase italic tracking-tight mb-4">{faq.q}</h4>
                    <p className="text-slate-500 font-light leading-relaxed text-sm">{faq.a}</p>
                  </div>
                ))}
             </div>
          </section>

          <section className="p-20 bg-blue-600 rounded-[5rem] text-center shadow-3xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-10">
                <MessageSquare className="h-64 w-64 text-white" />
             </div>
             <h2 className="text-5xl md:text-8xl font-black text-white tracking-tighter uppercase italic mb-8 relative z-10">INTERFACE WITH US.</h2>
             <p className="text-blue-100 text-2xl font-light mb-12 max-w-3xl mx-auto relative z-10">
               Establish a direct line to our support architects for complex enterprise migrations and technical orchestration.
             </p>
             <Button className="h-20 px-16 bg-white text-blue-600 text-xl font-black uppercase tracking-[0.2em] rounded-[2rem] hover:bg-slate-100 transition-all shadow-2xl relative z-10" asChild>
                <Link href="/contact">Direct Support Interface</Link>
             </Button>
          </section>

        </div>
      </main>
    </div>
  );
}