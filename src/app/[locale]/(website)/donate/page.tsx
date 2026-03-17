import React from 'react';
import { Metadata } from "next";
import Link from "next/link";
import { 
  Heart, TrendingUp, Users, Globe, CheckCircle, 
  Sparkles, ShieldCheck, Rocket, Landmark, ArrowRight,
  Handshake, Target, Award, Coins
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LeadForm from "@/components/LeadForm";

export const metadata: Metadata = {
  title: "Support the Mission - BBU1 Philanthropy",
  description: "Join the BBU1 mission. Support the development of sovereign business infrastructure that empowers global commerce and provides digital equity.",
};

const donationPlans = [
  {
    name: "Supporter",
    amount: "10",
    icon: Heart,
    description: "Support our core mission",
    benefits: [
      "Official acknowledgment in Annual Report",
      "Priority BBU1 news and engineering updates",
      "Executive newsletter access"
    ]
  },
  {
    name: "Advocate",
    amount: "50",
    icon: TrendingUp,
    description: "Become a sovereign advocate",
    featured: true,
    benefits: [
      "All Supporter tier benefits",
      "Digital Advocacy Badge for your OS",
      "Bimonthly strategic webinar access",
      "Early beta-access to Aura AI features"
    ]
  },
  {
    name: "Partner",
    amount: "100",
    icon: Users,
    description: "Strategic mission partnership",
    benefits: [
      "All Advocate tier benefits",
      "Global Partner Directory listing",
      "Co-branding opportunities for local markets",
      "Quarterly architectural review calls"
    ]
  },
  {
    name: "Founders Circle",
    amount: "500",
    icon: Globe,
    description: "The highest executive support",
    benefits: [
      "Full access to all previous tiers",
      "Private Founders Circle secure hub access",
      "Annual Invitation to the BBU1 Summit",
      "Direct Strategic Advisory channel to leadership",
      "Customized impact reports for your entity"
    ]
  }
];

const impactMetrics = [
  { label: "BUSINESSES SUPPORTED", value: "500K+", sub: "Production-ready OS nodes" },
  { label: "COUNTRIES REACHED", value: "50+", sub: "Global digital presence" },
  { label: "TRANSACTION VOLUME", value: "$2B+", sub: "Securely processed annually" },
  { label: "INDUSTRY VERTICALS", value: "15+", sub: "Tailored sovereign solutions" }
];

export default function DonatePage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#020617] text-slate-300 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      <main className="flex-grow pt-32 pb-24">
        <div className="container mx-auto px-6">
          
          {/* --- EXECUTIVE HERO --- */}
          <header className="max-w-5xl mb-32">
            <div className="inline-flex items-center gap-3 px-6 py-2 bg-blue-500/5 border border-blue-500/20 rounded-full mb-8">
              <Sparkles className="h-4 w-4 text-blue-500 animate-pulse" />
              <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.5em]">The Philanthropic Core</span>
            </div>
            <h1 className="text-6xl md:text-9xl font-black text-white tracking-tighter leading-none mb-10 uppercase italic">
              FUEL THE <br /> <span className="text-blue-600">MISSION.</span>
            </h1>
            <p className="text-2xl md:text-3xl font-light text-slate-400 leading-relaxed italic border-l-4 border-blue-600 pl-8 max-w-3xl">
              "We are building the infrastructure for a continent and the world. Your support directly accelerates the democratization of enterprise technology."
            </p>
          </header>

          {/* --- IMPACT METRICS GRID --- */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-40 border-y border-white/5 py-16">
            {impactMetrics.map((metric, i) => (
              <div key={i} className="text-center group">
                <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4 group-hover:text-white transition-colors">{metric.label}</p>
                <div className="text-5xl md:text-6xl font-black text-white mb-2 italic tracking-tighter">{metric.value}</div>
                <p className="text-slate-500 text-xs font-light uppercase tracking-widest">{metric.sub}</p>
              </div>
            ))}
          </section>

          {/* --- SUPPORT LEVELS --- */}
          <section className="mb-40">
            <div className="flex items-center gap-4 text-white mb-16">
              <Landmark className="h-8 w-8 text-blue-600" />
              <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">SUPPORT LEVELS</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {donationPlans.map((plan, index) => (
                <Card key={index} className={`rounded-[3.5rem] overflow-hidden transition-all duration-500 border-none flex flex-col h-full group ${
                  plan.featured ? "bg-blue-600 shadow-[0_0_80px_rgba(37,99,235,0.2)] scale-105 z-10" : "bg-white/5 hover:bg-white/[0.08]"
                }`}>
                  <div className="p-10 flex-grow">
                    <div className="mb-8">
                      <plan.icon className={`h-10 w-10 mb-6 group-hover:scale-110 transition-transform ${plan.featured ? "text-white" : "text-blue-500"}`} />
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-4xl font-black italic text-white">${plan.amount}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${plan.featured ? "text-blue-100" : "text-slate-500"}`}>ONE-TIME</span>
                      </div>
                      <h3 className="text-xl font-black uppercase tracking-tight italic text-white">{plan.name}</h3>
                      <p className={`text-xs uppercase tracking-widest font-bold mt-2 ${plan.featured ? "text-blue-100" : "text-slate-500"}`}>{plan.description}</p>
                    </div>

                    <ul className="space-y-4 mb-10">
                      {plan.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex gap-3 text-xs leading-relaxed">
                          <CheckCircle className={`h-4 w-4 shrink-0 ${plan.featured ? "text-white" : "text-blue-500"}`} />
                          <span className={plan.featured ? "text-white font-medium" : "text-slate-400"}>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-10 pt-0 mt-auto">
                    <Button className={`w-full py-8 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl ${
                      plan.featured ? "bg-white text-blue-600 hover:bg-slate-100" : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                    }`} asChild>
                      <a href="#fuel-the-mission">Support Tier</a>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* --- SOVEREIGN DONATION ENGINE (THE FORM) --- */}
          <section id="fuel-the-mission" className="mt-40 p-12 md:p-24 bg-white/5 border border-white/10 rounded-[5rem] max-w-5xl mx-auto shadow-3xl relative overflow-hidden scroll-mt-24">
             <div className="absolute top-0 right-0 p-10 opacity-5">
                <Coins className="h-96 w-96 text-white" />
             </div>
             
             <div className="relative z-10">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-3 px-6 py-2 bg-blue-500/5 border border-blue-500/20 rounded-full mb-8">
                        <Handshake className="h-4 w-4 text-blue-500" />
                        <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.5em]">Foundational Support</span>
                    </div>
                    <h2 className="text-4xl md:text-7xl font-black text-white tracking-tighter uppercase italic mb-6 leading-none">FUEL THE MISSION.</h2>
                    <p className="text-slate-400 text-xl font-light max-w-2xl mx-auto leading-relaxed">
                        Confirm your strategic details below. Your pledge enables the development of the next generation of sovereign modules.
                    </p>
                </div>

                <div className="max-w-3xl mx-auto">
                    <LeadForm intent="DONATION_INQUIRY" ctaText="FINALIZE PLEDGE" />
                </div>
             </div>
          </section>

          {/* --- FOUNDation FAQ --- */}
          <section className="max-w-4xl mx-auto mt-40 mb-40">
             <div className="text-center mb-16">
                <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">FOUNDATION INQUIRIES</h2>
             </div>
             <div className="space-y-6">
                {[
                  { q: "How are philanthropic funds allocated?", a: "We publish detailed annual reports. Allocation is focused on open-source research, regional translation projects, and infrastructure for remote underserved enterprises." },
                  { q: "Can I support with local payment methods?", a: "Yes. BBU1 supports all global payment rails including major regional Mobile Money systems to ensure frictionless foundational support." },
                  { q: "Are Founders Circle roles advisory?", a: "Membership in the Founders Circle provides a direct communication channel to our Lead Architects to discuss the long-term roadmap of the ecosystem." }
                ].map((faq, i) => (
                  <div key={i} className="p-10 bg-white/5 border border-white/10 rounded-[3rem] hover:bg-white/[0.08] transition-all">
                    <h4 className="text-white font-black uppercase italic tracking-tight mb-4">{faq.q}</h4>
                    <p className="text-slate-500 font-light leading-relaxed">{faq.a}</p>
                  </div>
                ))}
             </div>
          </section>

          {/* --- FINAL CALLOUT --- */}
          <section className="p-20 bg-blue-600 rounded-[5rem] text-center shadow-3xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-10">
                <Target className="h-64 w-64 text-white" />
             </div>
             <h2 className="text-5xl md:text-8xl font-black text-white tracking-tighter uppercase italic mb-8 relative z-10">BUILD THE BASE.</h2>
             <p className="text-blue-100 text-2xl font-light mb-12 max-w-3xl mx-auto relative z-10 leading-relaxed">
               Every contribution anchors the Business Base Universe and provides the high-fidelity foundation for visionaries worldwide.
             </p>
             <Button className="h-20 px-16 bg-white text-blue-600 text-xl font-black uppercase tracking-[0.2em] rounded-[2rem] hover:bg-slate-100 transition-all shadow-2xl relative z-10" asChild>
                <a href="#fuel-the-mission">Inquire for Strategic Support</a>
             </Button>
          </section>

        </div>
      </main>
    </div>
  );
}