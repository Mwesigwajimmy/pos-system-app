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
    <div className="min-h-screen bg-[#020617] text-slate-300">
      <main className="pt-32 pb-24">
        <div className="container mx-auto px-6">
          <Link href="/industries" className="inline-flex items-center gap-2 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-16 hover:gap-4 transition-all">
            <ArrowLeft className="h-4 w-4" /> Back to Catalog
          </Link>

          <header className="max-w-4xl mb-32">
            <div className="flex items-center gap-4 text-blue-600 mb-8">
               <industry.icon className="h-10 w-10" />
               <span className="h-px w-20 bg-blue-600/30" />
            </div>
            <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-none mb-10 uppercase italic">
              {industry.name}
            </h1>
            <p className="text-2xl md:text-4xl font-light text-slate-400 leading-relaxed italic border-l-4 border-blue-600 pl-8">
              {industry.longDescription}
            </p>
          </header>

          <div className="grid lg:grid-cols-2 gap-20 items-start">
            <div className="p-12 bg-white/5 border border-white/10 rounded-[4rem]">
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tight mb-10 flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-red-500" /> Sector Challenges
              </h2>
              <ul className="space-y-6">
                {industry.challenges.map((c, i) => (
                  <li key={i} className="flex gap-4 text-lg text-slate-400 font-light">
                    <span className="text-blue-600/50 font-black">0{i+1}</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-12 bg-blue-600/10 border border-blue-600/30 rounded-[4rem]">
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tight mb-10 flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-green-500" /> BBU1 Infrastructure
              </h2>
              <ul className="space-y-6">
                {industry.solutions.map((s, i) => (
                  <li key={i} className="flex gap-4 text-lg text-white font-medium">
                    <CheckCircle className="h-6 w-6 text-blue-500 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <section className="mt-40 p-20 bg-blue-600 rounded-[5rem] text-center shadow-3xl">
             <div className="flex justify-center mb-8">
                <Sparkles className="h-12 w-12 text-blue-200" />
             </div>
             <h2 className="text-4xl md:text-7xl font-black text-white tracking-tighter uppercase italic mb-8">Ready to Scale?</h2>
             <p className="text-blue-100 text-2xl font-light mb-12 max-w-2xl mx-auto">
               Deploy the sovereign operating system for your {industry.name} business today.
             </p>
             <Button className="h-20 px-16 bg-white text-blue-600 text-xl font-black uppercase tracking-[0.2em] rounded-[2rem] hover:bg-slate-100 transition-all shadow-2xl" asChild>
                <Link href="/contact">Book Enterprise Demo</Link>
             </Button>
          </section>
        </div>
      </main>
    </div>
  );
}