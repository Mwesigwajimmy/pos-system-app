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
    <div className="flex flex-col min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-500/30">
      <main className="flex-grow pt-20 pb-24">
        <div className="container mx-auto px-6 max-w-7xl">
          
          {/* --- HERO SECTION --- */}
          <header className="max-w-4xl mb-24">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full mb-8">
              <MessageSquareText className="h-4 w-4 text-blue-600" />
              <span className="text-blue-700 text-xs font-bold tracking-widest uppercase">Communication Hub</span>
            </div>
            {/* Fixed: Normal case, straight text, professional size */}
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight mb-10">
              Direct <span className="text-blue-600">Interface.</span>
            </h1>
            <p className="text-xl md:text-2xl font-normal text-slate-600 leading-relaxed border-l-4 border-blue-600 pl-8 max-w-3xl">
              Establishing a direct connection between global enterprise and sovereign business architecture. We are here to facilitate your expansion.
            </p>
          </header>

          <div className="grid lg:grid-cols-12 gap-16 items-start mb-40">
            
            {/* --- CONTACT INFO SIDEBAR --- */}
            <div className="lg:col-span-5 space-y-10">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-8 uppercase">Channel Intel</h2>
              
              <div className="space-y-6">
                <div className="flex gap-6 group p-8 bg-slate-50 border border-slate-200 rounded-3xl hover:bg-white hover:shadow-lg transition-all">
                  <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-110 transition-transform">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-1">Official Inquiry</h4>
                    <a href="mailto:info@bbu1.com" className="text-slate-900 text-lg font-semibold hover:text-blue-600 transition-colors">info@bbu1.com</a>
                  </div>
                </div>

                <div className="flex gap-6 group p-8 bg-slate-50 border border-slate-200 rounded-3xl hover:bg-white hover:shadow-lg transition-all">
                  <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600 shrink-0 group-hover:scale-110 transition-transform">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-1">Immediate Support</h4>
                    <a href="https://wa.me/256703572503" target="_blank" rel="noopener noreferrer" className="text-slate-900 text-lg font-semibold hover:text-green-600 transition-colors">WhatsApp Direct</a>
                  </div>
                </div>

                <div className="flex gap-6 group p-8 bg-slate-50 border border-slate-200 rounded-3xl hover:bg-white hover:shadow-lg transition-all">
                  <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-110 transition-transform">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-1">Global HQ</h4>
                    <p className="text-slate-900 text-lg font-semibold">East Africa Base / Remote Presence</p>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-blue-50 border border-blue-100 rounded-3xl">
                 <div className="flex items-center gap-2 text-blue-600 mb-3">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Security Protocol</span>
                 </div>
                 <p className="text-slate-600 text-sm font-normal leading-relaxed">
                   All data transmitted through this interface is encrypted with bank-level protocols and handled in accordance with the BBU1 Sovereignty Policy.
                 </p>
              </div>
            </div>

            {/* --- INQUIRY FORM --- */}
            <div className="lg:col-span-7">
              <Card className="bg-slate-50 border-slate-200 rounded-[3rem] p-8 md:p-12 shadow-sm border">
                <h3 className="text-2xl font-bold text-slate-900 mb-10">Process Inquiry</h3>
                <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Corporate Email</label>
                    <input 
                      type="email" 
                      placeholder="you@company.com" 
                      className="w-full h-14 px-6 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Inquiry Category</label>
                    <div className="relative">
                      <select className="w-full h-14 px-6 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:border-blue-600 appearance-none transition-all cursor-pointer">
                         <option>Enterprise Sales</option>
                         <option>Strategic Partnership</option>
                         <option>Technical Support</option>
                         <option>Media & Relations</option>
                      </select>
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Your Message / Brief</label>
                    <textarea 
                      placeholder="Describe your objectives..." 
                      className="w-full min-h-[180px] p-6 bg-white border border-slate-200 rounded-2xl text-slate-900 font-normal placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all resize-none"
                      required
                    />
                  </div>

                  <div className="md:col-span-2 pt-4">
                    <Button className="w-full h-16 bg-blue-600 text-white font-bold uppercase tracking-widest text-sm rounded-xl hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all group">
                      Initiate Transmission <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-2 transition-transform" />
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          </div>

          {/* --- STATS BAR --- */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-40 border-y border-slate-100 py-16">
            {[
              { label: "Response Time", value: "< 2 Hours", icon: Globe },
              { label: "Global Reach", value: "50+ Nations", icon: Landmark },
              { label: "Sovereign Data", value: "100% Private", icon: ShieldCheck }
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center text-center group">
                <stat.icon className="h-6 w-6 text-blue-600 mb-4 group-hover:scale-110 transition-transform" />
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{stat.label}</p>
                <div className="text-3xl font-bold text-slate-900 tracking-tight">{stat.value}</div>
              </div>
            ))}
          </section>

          {/* --- FOUNDER CTA --- */}
          <section className="p-16 md:p-24 bg-blue-600 rounded-[3rem] text-center shadow-2xl shadow-blue-600/20 relative overflow-hidden text-white">
             <div className="absolute top-0 right-0 p-10 opacity-10">
                <Landmark className="h-64 w-64 text-white" />
             </div>
             <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-8 relative z-10">Talk to an Architect.</h2>
             <p className="text-blue-50 text-xl md:text-2xl font-normal mb-12 max-w-3xl mx-auto relative z-10">
               Need a custom architectural review of your business operations? Connect directly with our engineering leadership.
             </p>
             <Button size="lg" className="h-16 px-12 bg-white text-blue-600 text-lg font-bold rounded-xl hover:bg-slate-50 transition-all shadow-xl relative z-10" asChild>
                <a href="mailto:ceo@bbu1.com">Founder Direct Channel</a>
             </Button>
          </section>

        </div>
      </main>
    </div>
  );
}