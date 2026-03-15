import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { featureSets } from '@/lib/data/features';
import { ArrowLeft, CheckCircle, Sparkles, ShieldCheck, Cpu } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default async function FeatureDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const feature = featureSets.find(f => f.slug === slug);
  if (!feature) notFound();

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans selection:bg-blue-500/30">
      <main className="pt-32 pb-24">
        <div className="container mx-auto px-6">
          <Link href="/features" className="inline-flex items-center gap-2 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-16 hover:gap-4 transition-all">
            <ArrowLeft className="h-4 w-4" /> Back to Features
          </Link>

          <header className="max-w-4xl mb-32">
            <div className="flex items-center gap-4 text-blue-600 mb-8">
               <feature.icon className="h-10 w-10" />
               <span className="h-px w-24 bg-blue-600/30" />
            </div>
            <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-none mb-10 uppercase italic">
              {feature.title}
            </h1>
            <p className="text-2xl md:text-4xl font-light text-slate-400 leading-relaxed italic border-l-4 border-blue-600 pl-8 max-w-4xl">
              {feature.longDescription}
            </p>
          </header>

          <div className="mb-40">
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tight mb-16 flex items-center gap-3">
              <Cpu className="h-6 w-6 text-blue-600" /> Core Capabilities
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {feature.capabilities.map((cap, i) => (
                <div key={i} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] flex items-center gap-4 group hover:bg-white/10 transition-all">
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                  <span className="text-white font-black uppercase tracking-widest text-[11px] group-hover:text-blue-400">{cap}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-10 items-start mb-40">
            {feature.detailedBreakdown.map((item, i) => (
              <div key={i} className="p-12 bg-white/5 border border-white/10 rounded-[4rem] hover:border-blue-600/30 transition-all">
                <div className="flex items-center gap-4 mb-8">
                   <span className="text-3xl font-black text-blue-600/30 italic">0{i+1}</span>
                   <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">{item.name}</h3>
                </div>
                <p className="text-xl text-slate-400 font-light leading-relaxed">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>

          <section className="p-20 bg-blue-600 rounded-[5rem] text-center shadow-3xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-5">
                <ShieldCheck className="h-96 w-96 text-white" />
             </div>
             <h2 className="text-5xl md:text-8xl font-black text-white tracking-tighter uppercase italic mb-8 relative z-10">INTERFACE NOW.</h2>
             <p className="text-blue-100 text-2xl font-light mb-12 max-w-3xl mx-auto relative z-10">
               Experience the {feature.title} module with a global free trial and scale your operations with BBU1.
             </p>
             <Button className="h-20 px-16 bg-white text-blue-600 text-xl font-black uppercase tracking-[0.2em] rounded-[2rem] hover:bg-slate-100 transition-all shadow-2xl relative z-10" asChild>
                <Link href="/signup">Start Free Trial</Link>
             </Button>
          </section>
        </div>
      </main>
    </div>
  );
}