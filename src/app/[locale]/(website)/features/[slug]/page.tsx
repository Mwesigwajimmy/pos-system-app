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
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-500/30">
      <main className="pt-20 pb-24">
        <div className="container mx-auto px-6 max-w-7xl">
          
          {/* --- BACK NAVIGATION --- */}
          <Link href="/features" className="inline-flex items-center gap-2 text-blue-600 text-sm font-bold mb-16 hover:translate-x-[-4px] transition-transform">
            <ArrowLeft className="h-4 w-4" /> Back to Features
          </Link>

          {/* --- HEADER SECTION --- */}
          <header className="max-w-5xl mb-32">
            <div className="flex items-center gap-4 text-blue-600 mb-8">
               <feature.icon className="h-10 w-10" />
               <span className="h-px w-24 bg-blue-100" />
            </div>
            {/* Fixed: Professional size, straight text, no all-caps */}
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight mb-10">
              {feature.title}
            </h1>
            <p className="text-xl md:text-2xl font-normal text-slate-600 leading-relaxed border-l-4 border-blue-600 pl-8 max-w-4xl">
              {feature.longDescription}
            </p>
          </header>

          {/* --- CORE CAPABILITIES --- */}
          <div className="mb-40">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight mb-12 flex items-center gap-3">
              <Cpu className="h-6 w-6 text-blue-600" /> Core Capabilities
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {feature.capabilities.map((cap, i) => (
                <div key={i} className="p-8 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-4 group hover:bg-white hover:shadow-md hover:border-blue-200 transition-all duration-300">
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                  <span className="text-slate-900 font-semibold text-sm group-hover:text-blue-600">{cap}</span>
                </div>
              ))}
            </div>
          </div>

          {/* --- DETAILED BREAKDOWN --- */}
          <div className="grid lg:grid-cols-2 gap-8 items-start mb-40">
            {feature.detailedBreakdown.map((item, i) => (
              <div key={i} className="p-10 md:p-12 bg-white border border-slate-200 rounded-[2.5rem] hover:shadow-xl hover:border-blue-300 transition-all duration-300">
                <div className="flex items-center gap-4 mb-8">
                   <span className="text-3xl font-bold text-blue-200">0{i+1}</span>
                   <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{item.name}</h3>
                </div>
                <p className="text-lg text-slate-600 font-normal leading-relaxed">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>

          {/* --- FINAL CTA SECTION --- */}
          <section className="p-16 md:p-24 bg-blue-600 rounded-[3rem] text-center shadow-2xl shadow-blue-600/20 relative overflow-hidden text-white">
             <div className="absolute top-0 right-0 p-10 opacity-10">
                <ShieldCheck className="h-64 w-64 text-white" />
             </div>
             <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-8 relative z-10">Interface now.</h2>
             <p className="text-blue-50 text-xl md:text-2xl font-normal mb-12 max-w-3xl mx-auto relative z-10 leading-relaxed">
               Experience the {feature.title} module with a global free trial and scale your operations with BBU1.
             </p>
             <Button size="lg" className="h-16 px-12 bg-white text-blue-600 text-lg font-bold rounded-xl hover:bg-slate-50 transition-all shadow-xl relative z-10" asChild>
                <Link href="/signup">Start Free Trial</Link>
             </Button>
          </section>

        </div>
      </main>
    </div>
  );
}