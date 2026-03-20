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
    <div className="flex flex-col min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      <main className="flex-grow pt-20 pb-24">
        <div className="container mx-auto px-6 max-w-7xl">
          
          {/* --- EXECUTIVE HERO --- */}
          <header className="max-w-4xl mb-32">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full mb-8">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-blue-700 text-xs font-bold tracking-widest uppercase">The Philanthropic Core</span>
            </div>
            {/* Fixed: Normal case, straight text, professional size */}
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight mb-10">
              Fuel the <span className="text-blue-600">mission.</span>
            </h1>
            <p className="text-xl md:text-2xl font-normal text-slate-600 leading-relaxed border-l-4 border-blue-600 pl-8 max-w-3xl">
              We are building the infrastructure for a continent and the world. Your support directly accelerates the democratization of enterprise technology.
            </p>
          </header>

          {/* --- IMPACT METRICS GRID --- */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-40 border-y border-slate-100 py-16">
            {impactMetrics.map((metric, i) => (
              <div key={i} className="text-center group">
                <p className="text-blue-600 text-[10px] font-bold tracking-widest uppercase mb-4">{metric.label}</p>
                <div className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-2 tracking-tight">{metric.value}</div>
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{metric.sub}</p>
              </div>
            ))}
          </section>

          {/* --- SUPPORT LEVELS --- */}
          <section className="mb-40">
            <div className="flex items-center gap-4 text-slate-900 mb-16">
              <Landmark className="h-8 w-8 text-blue-600" />
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Support Levels</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {donationPlans.map((plan, index) => (
                <Card key={index} className={`rounded-3xl overflow-hidden transition-all duration-300 border flex flex-col h-full group ${
                  plan.featured ? "bg-blue-600 border-blue-700 shadow-2xl scale-105 z-10" : "bg-slate-50 border-slate-200 hover:bg-white hover:shadow-xl hover:border-blue-200"
                }`}>
                  <div className="p-10 flex-grow">
                    <div className="mb-8">
                      <plan.icon className={`h-10 w-10 mb-6 group-hover:scale-110 transition-transform ${plan.featured ? "text-white" : "text-blue-600"}`} />
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className={`text-4xl font-extrabold tracking-tight ${plan.featured ? "text-white" : "text-slate-900"}`}>${plan.amount}</span>
                        <span className={`text-[10px] font-bold tracking-widest ${plan.featured ? "text-blue-100" : "text-slate-500"}`}>ONE-TIME</span>
                      </div>
                      <h3 className={`text-xl font-bold tracking-tight ${plan.featured ? "text-white" : "text-slate-900"}`}>{plan.name}</h3>
                      <p className={`text-xs uppercase tracking-widest font-bold mt-2 ${plan.featured ? "text-blue-100" : "text-slate-500"}`}>{plan.description}</p>
                    </div>

                    <ul className="space-y-4 mb-10">
                      {plan.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex gap-3 text-sm leading-relaxed">
                          <CheckCircle className={`h-5 w-5 shrink-0 ${plan.featured ? "text-white" : "text-blue-600"}`} />
                          <span className={plan.featured ? "text-white font-medium" : "text-slate-600"}>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-10 pt-0 mt-auto">
                    <Button className={`w-full h-14 rounded-xl font-bold uppercase tracking-widest transition-all ${
                      plan.featured ? "bg-white text-blue-600 hover:bg-slate-50 shadow-lg" : "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50"
                    }`} asChild>
                      <a href="#fuel-the-mission">Support Tier</a>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* --- SOVEREIGN DONATION ENGINE --- */}
          <section id="fuel-the-mission" className="mt-40 p-10 md:p-20 bg-slate-50 border border-slate-200 rounded-[3rem] max-w-5xl mx-auto shadow-sm relative overflow-hidden scroll-mt-24">
             <div className="absolute top-0 right-0 p-10 opacity-10">
                <Coins className="h-64 w-64 text-slate-900" />
             </div>
             
             <div className="relative z-10">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-100 border border-blue-200 rounded-full mb-8">
                        <Handshake className="h-4 w-4 text-blue-600" />
                        <span className="text-blue-700 text-xs font-bold tracking-widest uppercase">Foundational Support</span>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight mb-6">Fuel the mission.</h2>
                    <p className="text-slate-600 text-lg font-normal max-w-2xl mx-auto leading-relaxed">
                        Confirm your strategic details below. Your pledge enables the development of the next generation of sovereign modules.
                    </p>
                </div>

                <div className="max-w-2xl mx-auto bg-white p-8 md:p-12 rounded-3xl border border-slate-100 shadow-xl">
                    <LeadForm intent="DONATION_INQUIRY" ctaText="FINALIZE PLEDGE" />
                </div>
             </div>
          </section>

          {/* --- FOUNDATION FAQ --- */}
          <section className="max-w-4xl mx-auto mt-40 mb-40">
             <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Foundation Inquiries</h2>
             </div>
             <div className="space-y-4">
                {[
                  { q: "How are philanthropic funds allocated?", a: "We publish detailed annual reports. Allocation is focused on open-source research, regional translation projects, and infrastructure for remote underserved enterprises." },
                  { q: "Can I support with local payment methods?", a: "Yes. BBU1 supports all global payment rails including major regional Mobile Money systems to ensure frictionless foundational support." },
                  { q: "Are Founders Circle roles advisory?", a: "Membership in the Founders Circle provides a direct communication channel to our Lead Architects to discuss the long-term roadmap of the ecosystem." }
                ].map((faq, i) => (
                  <div key={i} className="p-8 bg-slate-50 border border-slate-100 rounded-3xl hover:bg-white hover:shadow-md transition-all">
                    <h4 className="text-slate-900 font-bold text-lg mb-3">{faq.q}</h4>
                    <p className="text-slate-600 font-normal leading-relaxed">{faq.a}</p>
                  </div>
                ))}
             </div>
          </section>

          {/* --- FINAL CALLOUT --- */}
          <section className="p-16 md:p-24 bg-blue-600 rounded-[3rem] text-center shadow-2xl shadow-blue-600/20 relative overflow-hidden text-white">
             <div className="absolute top-0 right-0 p-10 opacity-10">
                <Target className="h-64 w-64 text-white" />
             </div>
             <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-8 relative z-10 leading-tight">Build the base.</h2>
             <p className="text-blue-50 text-xl md:text-2xl font-normal mb-12 max-w-3xl mx-auto relative z-10 leading-relaxed">
               Every contribution anchors the Business Base Universe and provides the high-fidelity foundation for visionaries worldwide.
             </p>
             <Button size="lg" className="h-16 px-12 bg-white text-blue-600 text-lg font-bold rounded-xl hover:bg-slate-50 transition-all shadow-xl relative z-10" asChild>
                <a href="#fuel-the-mission">Inquire for Strategic Support</a>
             </Button>
          </section>

        </div>
      </main>
    </div>
  );
}