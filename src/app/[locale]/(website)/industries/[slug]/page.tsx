import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { industries } from '@/lib/data/industries';
import { CheckCircle, AlertCircle } from 'lucide-react';
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

          {/* --- HEADER --- */}
          <header className="max-w-4xl mb-16 md:mb-24 pt-8">
            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6">
              <industry.icon className="h-6 w-6" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight leading-tight mb-6">
              {industry.name}
            </h1>
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-3xl">
              {industry.longDescription}
            </p>
          </header>

          {/* --- CHALLENGES & SOLUTIONS --- */}
          <div className="grid lg:grid-cols-2 gap-6 items-start">

            {/* Challenges */}
            <div className="p-6 sm:p-8 bg-slate-50 border border-slate-200 rounded-2xl">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight mb-6 flex items-center gap-2.5">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" /> Common challenges
              </h2>
              <ul className="space-y-4">
                {industry.challenges.map((c, i) => (
                  <li key={i} className="flex gap-3 text-base text-slate-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 mt-2.5 shrink-0" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>

            {/* Solutions */}
            <div className="p-6 sm:p-8 bg-blue-50 border border-blue-100 rounded-2xl">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight mb-6 flex items-center gap-2.5">
                <CheckCircle className="h-5 w-5 text-blue-600 shrink-0" /> How BBU1 helps
              </h2>
              <ul className="space-y-4">
                {industry.solutions.map((s, i) => (
                  <li key={i} className="flex gap-3 text-base text-slate-900 font-medium leading-snug">
                    <CheckCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* --- KEY FEATURES --- */}
          <div className="mt-16 flex flex-wrap gap-3">
            {industry.keyFeatures.map((f, i) => (
              <span key={i} className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-700">
                {f}
              </span>
            ))}
          </div>

          {/* --- FINAL CTA --- */}
          <section className="mt-20 md:mt-32 p-10 md:p-16 bg-blue-600 rounded-3xl text-center text-white">
             <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-4">See it for your business.</h2>
             <p className="text-blue-50 text-base md:text-lg mb-8 max-w-xl mx-auto">
               Book a demo and we'll walk through how BBU1 fits a {industry.name.toLowerCase()} business like yours.
             </p>
             <Button size="lg" className="h-13 px-10 bg-white text-blue-600 text-base font-semibold rounded-xl hover:bg-slate-50 transition-all" asChild>
                <Link href="/contact">Book a Demo</Link>
             </Button>
          </section>

        </div>
      </main>
    </div>
  );
}