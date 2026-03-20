import React from 'react';
import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { 
  BrainCircuit, BarChart3, AlertCircle, Zap, ShieldCheck, 
  TrendingUp, Sparkles, Cpu, Layers, ArrowRight, Bot 
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Aura AI - The Neural Core of BBU1",
  description: "Experience Aura, the industry-leading AI business analyst. Autonomous bookkeeping, predictive forecasting, and strategic decision support.",
};

export default function AuraAIPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 selection:bg-blue-500/30 font-sans">
      <main className="flex-grow pt-20 pb-24">
        <div className="container mx-auto px-6 max-w-7xl">
          
          {/* --- NEURAL HERO --- */}
          <header className="mb-32">
            <div className="grid lg:grid-cols-12 gap-16 items-center">
              <div className="lg:col-span-7">
                <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full mb-8">
                  <Bot className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-700 text-xs font-bold tracking-widest uppercase">Cognitive Infrastructure</span>
                </div>
                {/* Fixed: Normal case, straight text, professional size */}
                <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight mb-8">
                  Aura: The <span className="text-blue-600">Neural Core.</span>
                </h1>
                <p className="text-lg md:text-xl font-normal text-slate-600 leading-relaxed border-l-4 border-blue-600 pl-8 mb-10">
                  Traditional software records the past. Aura architects the future. It doesn't just process data; it understands your business context.
                </p>
                <Button className="h-14 px-10 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/10 transition-all" asChild>
                    <Link href="/contact">Interface with Aura <ArrowRight className="ml-3 h-5 w-5" /></Link>
                </Button>
              </div>
              <div className="lg:col-span-5 relative aspect-square rounded-3xl overflow-hidden border border-slate-200 shadow-xl">
                {/* --- UPDATED IMAGE: Representing Aura with your project asset --- */}
                <Image 
                  src="/images/showcase/office-presentation-on-dashboard.jpg" 
                  alt="Aura AI Neural Interface" 
                  fill 
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </header>

          {/* --- CAPABILITIES GRID --- */}
          <section className="mb-40">
            <div className="flex items-center gap-4 text-slate-900 mb-16">
              <Layers className="h-8 w-8 text-blue-600" />
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Cognitive Capabilities</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: BrainCircuit, title: "Neural Analysis", desc: "Aura continuously scans your entire ecosystem to identify patterns and correlations invisible to the human eye." },
                { icon: BarChart3, title: "Strategic Insights", desc: "Generates high-fidelity executive reports and real-time strategic recommendations for board-level decision making." },
                { icon: AlertCircle, title: "Anomaly Detection", desc: "Instantly flags financial outliers and operational risks, providing an unbreakable layer of security and audit integrity." },
                { icon: Zap, title: "Hyper-Automation", desc: "Engineered to handle 100% of bookkeeping and tax calculations with zero human intervention." },
                { icon: ShieldCheck, title: "Compliance Engine", desc: "Natively understands local and international regulatory frameworks, maintaining absolute audit readiness." },
                { icon: TrendingUp, title: "Predictive Scaling", desc: "Forecasts revenue trajectories and inventory requirements based on historical data and market signals." }
              ].map((cap, i) => (
                <div key={i} className="p-10 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-xl hover:border-blue-200 transition-all duration-300 group">
                  <cap.icon className="h-10 w-10 text-blue-600 mb-6 group-hover:scale-110 transition-transform" />
                  <h3 className="text-slate-900 text-xl font-bold mb-4">{cap.title}</h3>
                  <p className="text-slate-600 text-base font-normal leading-relaxed">{cap.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* --- THE DETERMINISTIC PROMISE --- */}
          <section className="relative p-12 md:p-20 bg-slate-50 border border-slate-200 rounded-[3rem] overflow-hidden mb-40">
             <div className="absolute top-0 right-0 p-10 opacity-10">
                <Cpu className="h-64 w-64 text-slate-900" />
             </div>
             
             <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
                <div className="space-y-8">
                    <div className="flex items-center gap-3 text-blue-600">
                        <Sparkles className="h-6 w-6" />
                        <span className="text-xs font-bold tracking-widest uppercase">Deterministic Intelligence</span>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
                       Beyond the Black Box.
                    </h2>
                    <p className="text-lg text-slate-600 font-normal leading-relaxed">
                       Aura is not a general-purpose AI. It is a specialized, deterministic engine built for <span className="text-blue-600 font-bold">Engineering Certainty</span>. Every insight is backed by irrefutable data points and full audit transparency.
                    </p>
                </div>
                <div className="space-y-4">
                   {[
                    "Zero-Math Accuracy Protocols",
                    "Real-time General Ledger Integration",
                    "Sovereign Data Processing (Local & Private)",
                    "Multilingual Support (English, French, Swahili, Arabic)"
                   ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4 p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
                        <ShieldCheck className="h-5 w-5 text-blue-600" />
                        <span className="text-slate-900 font-semibold text-sm">{item}</span>
                    </div>
                   ))}
                </div>
             </div>
          </section>

          {/* --- FINAL CTA --- */}
          <section className="text-center py-20 bg-blue-600 rounded-[3rem] shadow-2xl shadow-blue-600/20 text-white">
             <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-6">Interface with Aura.</h2>
             <p className="text-blue-50 text-lg md:text-xl font-normal mb-10 max-w-2xl mx-auto">
               Experience the future of business management. Integrate the neural core of BBU1 into your enterprise today.
             </p>
             <Button size="lg" className="h-16 px-12 bg-white text-blue-600 text-lg font-bold rounded-xl hover:bg-slate-50 transition-all shadow-xl" asChild>
                <Link href="/signup">Start Your AI Integration</Link>
             </Button>
          </section>

        </div>
      </main>
    </div>
  );
}