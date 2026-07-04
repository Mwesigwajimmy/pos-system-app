import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { industries } from '@/lib/data/industries';
import { CheckCircle, TrendingUp, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import BackNavbar from '@/components/BackNavbar';

export default async function IndustryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const industry = industries.find(i => i.slug === slug);
  if (!industry) notFound();

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-500/30">
      <BackNavbar backHref="/industries" backLabel="Industries" />
      <main className="pt-20 pb-24">
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl">

          {/* --- HERO HEADER --- */}
          <header className="max-w-5xl mb-16 md:mb-24 lg:mb-32 pt-8">
            <div className="flex items-center gap-4 text-blue-600 mb-6 md:mb-8">
               <industry.icon className="h-8 w-8 md:h-10 md:w-10" />
               <span className="h-px w-16 md:w-20 bg-blue-100" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6 md:mb-10">
              {industry.name}
            </h1>
            {/* Border switches to top on mobile, left on sm+ */}
            <p className="text-lg sm:text-xl md:text-2xl font-normal text-slate-600 leading-relaxed border-t-4 sm:border-t-0 sm:border-l-4 border-blue-600 pt-4 sm:pt-0 sm:pl-8">
              {industry.longDescription}
            </p>
          </header>

          {/* --- SECTOR INSIGHTS GRID --- */}
          <div className="grid lg:grid-cols-2 gap-6 md:gap-10 items-start">

            {/* Challenges Card */}
            <div className="p-6 sm:p-8 md:p-12 bg-slate-50 border border-slate-200 rounded-3xl md:rounded-[2.5rem] shadow-sm">
              <h2 className="text-lg md:text-2xl font-bold text-slate-900 tracking-tight mb-6 md:mb-8 flex items-center gap-3">
                <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-red-500 shrink-0" /> Sector Challenges
              </h2>
              <ul className="space-y-5">
                {industry.challenges.map((c, i) => (
                  <li key={i} className="flex gap-3 text-base md:text-lg text-slate-600 font-normal">
                    <span className="text-blue-600 font-bold shrink-0">0{i+1}</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>

            {/* Infrastructure Card */}
            <div className="p-6 sm:p-8 md:p-12 bg-blue-50 border border-blue-100 rounded-3xl md:rounded-[2.5rem] shadow-sm">
              <h2 className="text-lg md:text-2xl font-bold text-slate-900 tracking-tight mb-6 md:mb-8 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 md:h-6 md:w-6 text-green-600 shrink-0" /> BBU1 Infrastructure
              </h2>
              <ul className="space-y-5">
                {industry.solutions.map((s, i) => (
                  <li key={i} className="flex gap-3 text-base md:text-lg text-slate-900 font-medium leading-snug">
                    <CheckCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* --- FINAL CTA SECTION --- */}
          <section className="mt-20 md:mt-40 p-8 sm:p-12 md:p-20 lg:p-24 bg-blue-600 rounded-3xl md:rounded-[3rem] text-center shadow-2xl shadow-blue-600/20 text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 p-6 md:p-10 opacity-10 pointer-events-none">
                <Sparkles className="h-40 w-40 md:h-64 md:w-64 text-white" />
             </div>
             <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold text-white tracking-tight mb-4 md:mb-8 relative z-10 leading-tight">Ready to scale?</h2>
             <p className="text-blue-50 text-base sm:text-xl md:text-2xl font-normal mb-8 md:mb-12 max-w-2xl mx-auto relative z-10">
               Deploy the sovereign operating system for your {industry.name} business today.
             </p>
             <Button size="lg" className="w-full sm:w-auto h-12 sm:h-14 md:h-16 px-8 md:px-12 bg-white text-blue-600 text-base md:text-lg font-bold rounded-xl hover:bg-slate-50 transition-all shadow-xl relative z-10" asChild>
                <Link href="/contact">Book Enterprise Demo</Link>
             </Button>
          </section>

        </div>
      </main>
    </div>
  );
}