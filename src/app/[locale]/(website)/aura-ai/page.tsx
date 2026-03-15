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
    <div className="flex flex-col min-h-screen bg-[#020617] text-slate-300 selection:bg-blue-500/30 font-sans">
      <main className="flex-grow pt-32 pb-24">
        <div className="container mx-auto px-6">
          
          {/* --- NEURAL HERO --- */}
          <header className="max-w-6xl mb-32">
            <div className="grid lg:grid-cols-12 gap-16 items-center">
              <div className="lg:col-span-7">
                <div className="inline-flex items-center gap-3 px-6 py-2 bg-blue-500/5 border border-blue-500/20 rounded-full mb-8">
                  <Bot className="h-4 w-4 text-blue-500 animate-pulse" />
                  <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.5em]">Cognitive Infrastructure</span>
                </div>
                <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-none mb-10 uppercase italic">
                  AURA: THE <br /> <span className="text-blue-600">NEURAL CORE.</span>
                </h1>
                <p className="text-2xl md:text-3xl font-light text-slate-400 leading-relaxed italic border-l-4 border-blue-600 pl-8 mb-10">
                  "Traditional software records the past. Aura architects the future. It doesn't just process data; it understands your business context."
                </p>
                <Button className="h-16 px-12 bg-blue-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-blue-700 shadow-2xl shadow-blue-600/20 transition-all" asChild>
                    <Link href="/contact">Interface with Aura <ArrowRight className="ml-4 h-5 w-5" /></Link>
                </Button>
              </div>
              <div className="lg:col-span-5 relative aspect-square rounded-[4rem] overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(37,99,235,0.1)]">
                <Image 
                  src="https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=2000&auto=format&fit=crop" 
                  alt="Aura AI Visualization" 
                  fill 
                  className="object-cover grayscale-[0.2] brightness-75"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent" />
              </div>
            </div>
          </header>

          {/* --- CAPABILITIES GRID (ENTERPRISE STYLE) --- */}
          <section className="mb-40">
            <div className="flex items-center gap-4 text-white mb-16">
              <Layers className="h-8 w-8 text-blue-600" />
              <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">COGNITIVE CAPABILITIES.</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: BrainCircuit, title: "NEURAL ANALYSIS", desc: "Aura continuously scans your entire ecosystem to identify patterns and correlations invisible to the human eye." },
                { icon: BarChart3, title: "STRATEGIC INSIGHTS", desc: "Generates high-fidelity executive reports and real-time strategic recommendations for board-level decision making." },
                { icon: AlertCircle, title: "ANOMALY DETECTION", desc: "Instantly flags financial outliers and operational risks, providing an unbreakable layer of security and audit integrity." },
                { icon: Zap, title: "HYPER-AUTOMATION", desc: "Engineered to handle 100% of bookkeeping and tax calculations with zero human intervention." },
                { icon: ShieldCheck, title: "COMPLIANCE ENGINE", desc: "Natively understands local and international regulatory frameworks, maintaining absolute audit readiness." },
                { icon: TrendingUp, title: "PREDICTIVE SCALING", desc: "Forecasts revenue trajectories and inventory requirements based on historical data and market signals." }
              ].map((cap, i) => (
                <div key={i} className="p-12 bg-white/5 border border-white/10 rounded-[3.5rem] hover:bg-white/10 transition-all duration-500 group">
                  <cap.icon className="h-12 w-12 text-blue-600 mb-8 group-hover:scale-110 transition-transform" />
                  <h3 className="text-white text-2xl font-black mb-4 uppercase italic tracking-tight leading-none">{cap.title}</h3>
                  <p className="text-slate-500 text-base font-light leading-relaxed">{cap.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* --- THE DETERMINISTIC PROMISE --- */}
          <section className="relative p-16 md:p-24 bg-white/5 border border-white/10 rounded-[5rem] overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-5">
                <Cpu className="h-96 w-96 text-white" />
             </div>
             
             <div className="relative z-10 grid lg:grid-cols-2 gap-20 items-center">
                <div className="space-y-10">
                    <div className="flex items-center gap-4 text-blue-500">
                        <Sparkles className="h-8 w-8" />
                        <span className="text-sm font-black uppercase tracking-[0.4em]">Deterministic Intelligence</span>
                    </div>
                    <h2 className="text-4xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-none">
                       BEYOND THE <br /> BLACK BOX.
                    </h2>
                    <p className="text-xl md:text-2xl text-slate-400 font-light leading-relaxed">
                       Aura is not a general-purpose AI. It is a specialized, deterministic engine built for <span className="text-white font-bold italic">Engineering Certainty</span>. Every insight is backed by irrefutable data points and full audit transparency.
                    </p>
                </div>
                <div className="space-y-6">
                   {[
                    "Zero-Math Accuracy Protocols",
                    "Real-time General Ledger Integration",
                    "Sovereign Data Processing (Local & Private)",
                    "Multilingual Support (English, French, Swahili, Arabic)"
                   ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4 p-6 bg-black/40 border border-white/5 rounded-2xl">
                        <ShieldCheck className="h-6 w-6 text-blue-600" />
                        <span className="text-white font-black uppercase tracking-widest text-sm">{item}</span>
                    </div>
                   ))}
                </div>
             </div>
          </section>

          {/* --- FINAL CTA --- */}
          <section className="mt-40 text-center py-24 bg-blue-600 rounded-[5rem] shadow-3xl">
             <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase italic mb-8">INTERFACE WITH AURA.</h2>
             <p className="text-blue-100 text-2xl font-light mb-12 max-w-3xl mx-auto">
               Experience the future of business management. Integrate the neural core of BBU1 into your enterprise today.
             </p>
             <Button className="h-20 px-16 bg-white text-blue-600 text-xl font-black uppercase tracking-[0.2em] rounded-[2rem] hover:bg-slate-100 transition-all shadow-2xl" asChild>
                <Link href="/signup">Start Your AI Integration</Link>
             </Button>
          </section>

        </div>
      </main>
    </div>
  );
}