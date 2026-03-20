import React from 'react';
import Link from 'next/link';
import { featureSets } from '@/lib/data/features';
import { Card } from '@/components/ui/card';
import { ArrowRight, Zap, Sparkles } from 'lucide-react';

export default function FeaturesPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-500/30">
      <main className="flex-grow pt-20 pb-24">
        <div className="container mx-auto px-6 max-w-7xl">
          
          {/* --- HERO HEADER --- */}
          <header className="max-w-4xl mb-24">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full mb-8">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="text-blue-700 text-xs font-bold tracking-widest uppercase">The OS Capabilities</span>
            </div>
            
            {/* Fixed: Normal case, straight text, professional size */}
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight mb-10">
              Engineered <span className="text-blue-600">utility.</span>
            </h1>
            
            <p className="text-xl md:text-2xl font-normal text-slate-600 leading-relaxed border-l-4 border-blue-600 pl-8 max-w-3xl">
              Everything you need to run, grow, and scale your ambition—integrated into one intelligent, unbreakable business platform.
            </p>
          </header>

          {/* --- FEATURES GRID --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featureSets.map((feat) => (
              <Link href={`/features/${feat.slug}`} key={feat.slug} className="group block">
                <Card className="bg-slate-50 border-slate-200 rounded-[2.5rem] overflow-hidden hover:bg-white hover:shadow-2xl hover:border-blue-200 transition-all duration-300 h-full border">
                  <div className="p-10 md:p-12">
                    {/* Icon Container */}
                    <div className="h-16 w-16 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 mb-8 group-hover:scale-110 transition-transform">
                      <feat.icon className="h-8 w-8" />
                    </div>
                    
                    {/* Title: No italics, no all-caps */}
                    <h3 className="text-2xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-4 tracking-tight">
                      {feat.title}
                    </h3>
                    
                    <p className="text-slate-600 text-base font-normal leading-relaxed mb-8">
                      {feat.description}
                    </p>
                    
                    {/* Capability List */}
                    <div className="space-y-3 mb-10">
                       {feat.capabilities.slice(0, 3).map((cap, i) => (
                         <div key={i} className="flex items-center gap-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            <div className="h-1.5 w-1.5 bg-blue-600 rounded-full" />
                            {cap}
                         </div>
                       ))}
                    </div>
                    
                    {/* CTA link */}
                    <div className="flex items-center gap-2 text-blue-600 font-bold text-sm tracking-wide group-hover:gap-4 transition-all">
                      Explore Module <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
          
          {/* --- BOTTOM CTA --- */}
          <section className="mt-40 p-12 md:p-20 bg-blue-600 rounded-[3rem] text-center shadow-2xl shadow-blue-600/20 text-white">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Need a custom solution?</h2>
            <p className="text-blue-50 text-lg md:text-xl font-normal mb-10 max-w-2xl mx-auto">
              Our engineers can build specific architectural modules tailored to your unique industry requirements.
            </p>
            <Link href="/contact" className="inline-flex items-center gap-2 px-10 py-4 bg-white text-blue-600 font-bold rounded-xl hover:bg-slate-50 transition-all shadow-xl">
              Talk to an Architect <ArrowRight className="h-5 w-5" />
            </Link>
          </section>

        </div>
      </main>
    </div>
  );
}