import React from 'react';
import Link from 'next/link';
import { industries } from '@/lib/data/industries';
import { Card } from '@/components/ui/card';
import { ArrowRight, LayoutGrid } from 'lucide-react';

export default function IndustriesPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#020617] text-slate-300 font-sans">
      <main className="flex-grow pt-32 pb-24">
        <div className="container mx-auto px-6">
          <header className="max-w-5xl mb-32">
            <div className="inline-flex items-center gap-3 px-6 py-2 bg-blue-500/5 border border-blue-500/20 rounded-full mb-8">
              <LayoutGrid className="h-4 w-4 text-blue-500" />
              <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.5em]">Industry Specific Solutions</span>
            </div>
            <h1 className="text-6xl md:text-9xl font-black text-white tracking-tighter leading-none mb-10 uppercase italic">
              BUILT FOR <br /> <span className="text-blue-600">AMBITION.</span>
            </h1>
            <p className="text-2xl md:text-3xl font-light text-slate-400 leading-relaxed italic border-l-4 border-blue-600 pl-8 max-w-3xl">
              "From bustling city markets to the digital frontier, BBU1 provides the specialized operating core for 14+ global industry verticals."
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {industries.map((ind) => (
              <Link href={`/industries/${ind.slug}`} key={ind.slug} className="group block">
                <Card className="bg-white/5 border-white/10 rounded-[3rem] overflow-hidden hover:bg-white/[0.08] transition-all duration-500 h-full border-none">
                  <div className="p-12">
                    <div className="h-16 w-16 rounded-3xl bg-blue-600/10 flex items-center justify-center text-blue-500 mb-8 group-hover:scale-110 transition-transform">
                      <ind.icon className="h-8 w-8" />
                    </div>
                    <h3 className="text-3xl font-black text-white group-hover:text-blue-400 transition-colors uppercase italic mb-6 tracking-tight">
                      {ind.name}
                    </h3>
                    <p className="text-slate-400 text-lg font-light leading-relaxed mb-10">
                      {ind.description}
                    </p>
                    <div className="flex items-center gap-4 text-white font-black uppercase text-xs tracking-widest group-hover:gap-6 transition-all">
                      View Solution <ArrowRight className="h-4 w-4 text-blue-500" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}