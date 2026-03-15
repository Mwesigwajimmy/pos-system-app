import React from 'react';
import { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageSquareText, MapPin, Sparkles, Landmark, ArrowRight, ShieldCheck, Globe, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Contact BBU1 - Strategic Inquiry Hub",
  description: "Establish a direct line to the BBU1 ecosystem. Professional inquiries for enterprise sales, strategic partnerships, and global support.",
};

export default function ContactPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#020617] text-slate-300 font-sans selection:bg-blue-500/30">
      <main className="flex-grow pt-32 pb-24">
        <div className="container mx-auto px-6">
          
          <header className="max-w-5xl mb-32">
            <div className="inline-flex items-center gap-3 px-6 py-2 bg-blue-500/5 border border-blue-500/20 rounded-full mb-8">
              <MessageSquareText className="h-4 w-4 text-blue-500 animate-pulse" />
              <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.5em]">Communication Hub</span>
            </div>
            <h1 className="text-6xl md:text-9xl font-black text-white tracking-tighter leading-none mb-10 uppercase italic">
              DIRECT <br /> <span className="text-blue-600">INTERFACE.</span>
            </h1>
            <p className="text-2xl md:text-3xl font-light text-slate-400 leading-relaxed italic border-l-4 border-blue-600 pl-8 max-w-3xl">
              "Establishing a direct connection between global enterprise and sovereign business architecture. We are here to facilitate your expansion."
            </p>
          </header>

          <div className="grid lg:grid-cols-12 gap-20 items-start mb-40">
            {/* Contact Intelligence Sidebar */}
            <div className="lg:col-span-5 space-y-12">
              <h2 className="text-3xl font-black text-white uppercase italic tracking-tight mb-10">CHANNEL INTEL</h2>
              
              <div className="space-y-8">
                <div className="flex gap-6 group p-8 bg-white/5 border border-white/10 rounded-[3rem] hover:bg-white/[0.08] transition-all">
                  <div className="h-14 w-14 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500 shrink-0 group-hover:scale-110 transition-transform">
                    <Mail className="h-7 w-7" />
                  </div>
                  <div>
                    <h4 className="text-white font-black uppercase tracking-widest text-xs mb-2 italic">Official Inquiry</h4>
                    <a href="mailto:info@bbu1.com" className="text-slate-400 text-lg font-light hover:text-blue-400 transition-colors">info@bbu1.com</a>
                  </div>
                </div>

                <div className="flex gap-6 group p-8 bg-white/5 border border-white/10 rounded-[3rem] hover:bg-white/[0.08] transition-all">
                  <div className="h-14 w-14 rounded-2xl bg-green-600/10 flex items-center justify-center text-green-500 shrink-0 group-hover:scale-110 transition-transform">
                    <Phone className="h-7 w-7" />
                  </div>
                  <div>
                    <h4 className="text-white font-black uppercase tracking-widest text-xs mb-2 italic">Immediate Support</h4>
                    <a href="https://wa.me/256703572503" target="_blank" rel="noopener noreferrer" className="text-slate-400 text-lg font-light hover:text-green-400 transition-colors">WhatsApp Direct</a>
                  </div>
                </div>

                <div className="flex gap-6 group p-8 bg-white/5 border border-white/10 rounded-[3rem] hover:bg-white/[0.08] transition-all">
                  <div className="h-14 w-14 rounded-2xl bg-indigo-600/10 flex items-center justify-center text-indigo-500 shrink-0 group-hover:scale-110 transition-transform">
                    <MapPin className="h-7 w-7" />
                  </div>
                  <div>
                    <h4 className="text-white font-black uppercase tracking-widest text-xs mb-2 italic">Global HQ</h4>
                    <p className="text-slate-400 text-lg font-light">East Africa Base / Remote Presence</p>
                  </div>
                </div>
              </div>

              <div className="p-10 bg-blue-600/10 border border-blue-600/30 rounded-[3rem]">
                 <div className="flex items-center gap-3 text-blue-400 mb-4">
                    <ShieldCheck className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Security Protocol</span>
                 </div>
                 <p className="text-slate-400 text-sm font-light leading-relaxed italic">
                   "All data transmitted through this interface is encrypted with bank-level protocols and handled in accordance with the BBU1 Sovereignty Policy."
                 </p>
              </div>
            </div>

            {/* Inquiry Form Terminal */}
            <div className="lg:col-span-7">
              <Card className="bg-white/5 border-white/10 rounded-[4rem] p-10 md:p-16 shadow-3xl border-none">
                <h3 className="text-3xl font-black text-white uppercase italic tracking-tight mb-12 leading-none">PROCESS INQUIRY</h3>
                <form className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Corporate Email</label>
                    <input 
                      type="email" 
                      placeholder="YOU@COMPANY.COM" 
                      className="w-full h-16 px-8 bg-black/40 border border-white/10 rounded-2xl text-white font-black placeholder:text-slate-700 focus:outline-none focus:border-blue-600 transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Inquiry Category</label>
                    <select className="w-full h-16 px-8 bg-black/40 border border-white/10 rounded-2xl text-slate-400 font-bold focus:outline-none focus:border-blue-600 appearance-none transition-all cursor-pointer">
                       <option>ENTERPRISE SALES</option>
                       <option>STRATEGIC PARTNERSHIP</option>
                       <option>TECHNICAL SUPPORT</option>
                       <option>MEDIA & RELATIONS</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Your Message / Brief</label>
                    <textarea 
                      placeholder="DESCRIBE YOUR OBJECTIVES..." 
                      className="w-full min-h-[200px] p-8 bg-black/40 border border-white/10 rounded-[2rem] text-white font-light placeholder:text-slate-700 focus:outline-none focus:border-blue-600 transition-all resize-none"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Button className="w-full h-24 bg-blue-600 text-white font-black uppercase tracking-[0.3em] text-xl rounded-[2rem] hover:bg-blue-700 shadow-2xl transition-all group">
                      INITIATE TRANSMISSION <ArrowRight className="ml-6 h-8 w-8 group-hover:translate-x-4 transition-transform" />
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          </div>

          {/* Global Operations Stats */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-40 border-y border-white/5 py-16">
            {[
              { label: "RESPONSE TIME", value: "< 2 HOURS", icon: Globe },
              { label: "GLOBAL REACH", value: "50+ NATIONS", icon: Landmark },
              { label: "SOVEREIGN DATA", value: "100% PRIVATE", icon: ShieldCheck }
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center text-center group">
                <stat.icon className="h-8 w-8 text-blue-600 mb-4 group-hover:scale-110 transition-transform" />
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{stat.label}</p>
                <div className="text-4xl font-black text-white italic tracking-tighter">{stat.value}</div>
              </div>
            ))}
          </section>

          {/* Call to Founder */}
          <section className="p-20 bg-blue-600 rounded-[5rem] text-center shadow-3xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-10">
                <Landmark className="h-64 w-64 text-white" />
             </div>
             <h2 className="text-4xl md:text-7xl font-black text-white tracking-tighter uppercase italic mb-8 relative z-10">TALK TO AN ARCHITECT.</h2>
             <p className="text-blue-100 text-2xl font-light mb-12 max-w-3xl mx-auto relative z-10">
               Need a custom architectural review of your business operations? Connect directly with our engineering leadership.
             </p>
             <Button className="h-20 px-16 bg-white text-blue-600 text-xl font-black uppercase tracking-[0.2em] rounded-[2rem] hover:bg-slate-100 transition-all shadow-2xl relative z-10" asChild>
                <a href="mailto:ceo@bbu1.com">Founder Direct Channel</a>
             </Button>
          </section>

        </div>
      </main>
    </div>
  );
}