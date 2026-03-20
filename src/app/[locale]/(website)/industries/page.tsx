import React from 'react';
import Link from 'next/link';
import { industries } from '@/lib/data/industries';
import { Card } from '@/components/ui/card';
import { ArrowRight, LayoutGrid } from 'lucide-react';

export default function IndustriesPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-500/30">
      <main className="flex-grow pt-20 pb-24">
        <div className="container mx-auto px-6 max-w-7xl">
          
          {/* --- HERO HEADER --- */}
          <header className="max-w-4xl mb-24">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full mb-8">
              <LayoutGrid className="h-4 w-4 text-blue-600" />
              <span className="text-blue-700 text-xs font-bold tracking-widest uppercase">Industry Specific Solutions</span>
            </div>
            
            {/* Fixed: Professional size, straight text, no all-caps */}
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight mb-8">
              Built for <span className="text-blue-600">ambition.</span>
            </h1>
            
            <p className="text-xl md:text-2xl font-normal text-slate-600 leading-relaxed border-l-4 border-blue-600 pl-8 max-w-3xl">
              From bustling city markets to the digital frontier, BBU1 provides the specialized operating core for 14+ global industry verticals.
            </p>
          </header>

          {/* --- INDUSTRIES GRID --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {industries.map((ind) => (
              <Link href={`/industries/${ind.slug}`} key={ind.slug} className="group block">
                <Card className="bg-slate-50 border-slate-200 rounded-[2.5rem] overflow-hidden hover:bg-white hover:shadow-2xl hover:border-blue-200 transition-all duration-300 h-full border">
                  <div className="p-10 md:p-12">
                    {/* Icon Container */}
                    <div className="h-16 w-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-8 group-hover:scale-110 transition-transform">
                      <ind.icon className="h-8 w-8" />
                    </div>
                    
                    {/* Title: No italics, no all-caps */}
                    <h3 className="text-2xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-4 tracking-tight">
                      {ind.name}
                    </h3>
                    
                    <p className="text-slate-600 text-base font-normal leading-relaxed mb-10">
                      {ind.description}
                    </p>
                    
                    {/* CTA link */}
                    <div className="flex items-center gap-2 text-blue-600 font-bold text-sm tracking-wide group-hover:gap-4 transition-all">
                      View Solution <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {/* --- BOTTOM CTA --- */}
          <section className="mt-32 p-12 md:p-20 bg-blue-600 rounded-[3rem] text-center shadow-2xl shadow-blue-600/20 text-white">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Scale your industry.</h2>
            <p className="text-blue-50 text-lg md:text-xl font-normal mb-10 max-w-2xl mx-auto">
              Integrate the BBU1 operating core into your specific business vertical and start automating your future today.
            </p>
            <Link href="/contact" className="inline-flex items-center gap-2 px-10 py-4 bg-white text-blue-600 font-bold rounded-xl hover:bg-slate-50 transition-all shadow-xl">
              Get Started <ArrowRight className="h-5 w-5" />
            </Link>
          </section>

        </div>
      </main>
    </div>
  );
}