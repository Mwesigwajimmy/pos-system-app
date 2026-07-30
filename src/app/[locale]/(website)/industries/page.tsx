import React from 'react';
import Link from 'next/link';
import { industries } from '@/lib/data/industries';
import BackNavbar from '@/components/BackNavbar';
import { Card } from '@/components/ui/card';
import { ArrowRight, LayoutGrid } from 'lucide-react';

export default function IndustriesPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-500/30">
      <BackNavbar backHref="/" backLabel="Home" />
      <main className="flex-grow pt-20 pb-24">
        <div className="container mx-auto px-6 max-w-7xl">

          {/* --- HEADER --- */}
          <header className="max-w-3xl mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full mb-6">
              <LayoutGrid className="h-4 w-4 text-blue-600" />
              <span className="text-blue-700 text-xs font-bold tracking-widest uppercase">Industries</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 tracking-tight leading-tight mb-6">
              Built for how your industry actually works.
            </h1>

            <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-2xl">
              Every business has its own workflows and compliance needs. BBU1 adapts to yours, with modules built around the way your industry actually operates.
            </p>
          </header>

          {/* --- INDUSTRIES GRID --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {industries.map((ind) => (
              <Link href={`/industries/${ind.slug}`} key={ind.slug} className="group block">
                <Card className="bg-slate-50 border-slate-200 rounded-2xl overflow-hidden hover:bg-white hover:shadow-lg hover:border-blue-200 transition-all duration-300 h-full border">
                  <div className="p-8">
                    {/* Icon */}
                    <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6">
                      <ind.icon className="h-6 w-6" />
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-3 tracking-tight">
                      {ind.name}
                    </h3>

                    <p className="text-slate-600 text-sm leading-relaxed mb-8">
                      {ind.description}
                    </p>

                    <div className="flex items-center gap-1.5 text-blue-600 font-semibold text-sm group-hover:gap-2.5 transition-all">
                      View solution <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {/* --- BOTTOM CTA --- */}
          <section className="mt-24 p-10 md:p-16 bg-blue-600 rounded-3xl text-center text-white">
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-4">Don't see your industry?</h2>
            <p className="text-blue-50 text-base md:text-lg mb-8 max-w-xl mx-auto">
              We build custom fields and workflows for businesses outside our standard list too. Tell us how you operate.
            </p>
            <Link href="/contact" className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-blue-600 font-semibold rounded-xl hover:bg-slate-50 transition-all">
              Get in touch <ArrowRight className="h-4 w-4" />
            </Link>
          </section>

        </div>
      </main>
    </div>
  );
}