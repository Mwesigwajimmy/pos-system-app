import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { industries } from '@/lib/data/industries';
import { ArrowLeft, CheckCircle, TrendingUp, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default async function IndustryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const industry = industries.find(i => i.slug === slug);
  if (!industry) notFound();

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-500/30">
      <main className="pt-20 pb-24">
        <div className="container mx-auto px-6 max-w-7xl">
          
          {/* --- BACK NAVIGATION --- */}
          <Link href="/industries" className="inline-flex items-center gap-2 text-blue-600 text-sm font-bold mb-16 hover:translate-x-[-4px] transition-transform">
            <ArrowLeft className="h-4 w-4" /> Back to Catalog
          </Link>

          {/* --- HERO HEADER --- */}
          <header className="max-w-5xl mb-32">
            <div className="flex items-center gap-4 text-blue-600 mb-8">
               <industry.icon className="h-10 w-10" />
               <span className="h-px w-20 bg-blue-100" />
            </div>
            {/* Fixed: Professional size, straight text, no all-caps */}
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight mb-10">
              {industry.name}
            </h1>
            <p className="text-xl md:text-2xl font-normal text-slate-600 leading-relaxed border-l-4 border-blue-600 pl-8">
              {industry.longDescription}
            </p>
          </header>

          {/* --- SECTOR INSIGHTS GRID --- */}
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            
            {/* Challenges Card */}
            <div className="p-10 md:p-12 bg-slate-50 border border-slate-200 rounded-[2.5rem] shadow-sm">
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight mb-8 flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-red-500" /> Sector Challenges
              </h2>
              <ul className="space-y-6">
                {industry.challenges.map((c, i) => (
                  <li key={i} className="flex gap-4 text-lg text-slate-600 font-normal">
                    <span className="text-blue-600 font-bold">0{i+1}</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>

            {/* Infrastructure Card */}
            <div className="p-10 md:p-12 bg-blue-50 border border-blue-100 rounded-[2.5rem] shadow-sm">
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight mb-8 flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-green-600" /> BBU1 Infrastructure
              </h2>
              <ul className="space-y-6">
                {industry.solutions.map((s, i) => (
                  <li key={i} className="flex gap-4 text-lg text-slate-900 font-medium leading-snug">
                    <CheckCircle className="h-6 w-6 text-blue-600 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* --- FINAL CTA SECTION --- */}
          <section className="mt-40 p-16 md:p-24 bg-blue-600 rounded-[3rem] text-center shadow-2xl shadow-blue-600/20 text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-10">
                <Sparkles className="h-64 w-64 text-white" />
             </div>
             
             <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-8 relative z-10 leading-tight">Ready to scale?</h2>
             <p className="text-blue-50 text-xl md:text-2xl font-normal mb-12 max-w-2xl mx-auto relative z-10">
               Deploy the sovereign operating system for your {industry.name} business today.
             </p>
             <Button size="lg" className="h-16 px-12 bg-white text-blue-600 text-lg font-bold rounded-xl hover:bg-slate-50 transition-all shadow-xl relative z-10" asChild>
                <Link href="/contact">Book Enterprise Demo</Link>
             </Button>
          </section>

        </div>
      </main>
    </div>
  );
}