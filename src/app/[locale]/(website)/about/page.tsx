import React from 'react';
import { Metadata } from "next";
import { Heart, Target, Globe, Users, Sparkles, ShieldCheck, Zap, ArrowRight, Award } from 'lucide-react';

export const metadata: Metadata = {
    title: "About BBU1 - Engineering the Business Base Universe",
    description: "BBU1 is the architect of the Business Base Universe—a sovereign digital ecosystem empowered by a unified operating core.",
};

export default function AboutPage() {
    return (
        <div className="flex flex-col min-h-screen bg-[#020617] text-slate-300 selection:bg-blue-500/30 font-sans">
            <main className="flex-grow pt-32 pb-24">
                <div className="container mx-auto px-6">
                    <header className="max-w-5xl mb-32">
                        <div className="inline-flex items-center gap-3 px-6 py-2 bg-blue-500/5 border border-blue-500/20 rounded-full mb-8">
                            <Sparkles className="h-4 w-4 text-blue-500" />
                            <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.5em]">Corporate Identity</span>
                        </div>
                        <h1 className="text-6xl md:text-9xl font-black text-white tracking-tighter leading-none mb-10 uppercase italic">
                            WHO WE <br /> <span className="text-blue-600">ARE.</span>
                        </h1>
                        <div className="grid lg:grid-cols-12 gap-12 items-start">
                            <div className="lg:col-span-8">
                                <p className="text-2xl md:text-4xl font-light text-slate-400 leading-relaxed italic border-l-4 border-blue-600 pl-8 mb-10">
                                    BBU1 is the architect of the Business Base Universe—a sovereign digital ecosystem where commerce is no longer restricted by disconnected software, but empowered by a unified operating core.
                                </p>
                                <p className="text-slate-500 text-xl leading-relaxed max-w-2xl font-light">
                                    We bridge the gap between complex engineering and global business utility. Our purpose is to provide an unbreakable foundation for the next generation of digital commerce.
                                </p>
                            </div>
                            <div className="lg:col-span-4 p-8 bg-white/5 border border-white/10 rounded-[3rem] backdrop-blur-xl">
                                <p className="text-blue-500 text-[10px] font-black uppercase tracking-widest mb-4">Founder & Lead Architect</p>
                                <h3 className="text-white text-2xl font-black mb-2 italic">Mwesigwa Jimmy</h3>
                                <p className="text-slate-400 text-sm font-light leading-relaxed">
                                    Building the infrastructure powering the next generation of African and global commerce.
                                </p>
                            </div>
                        </div>
                    </header>

                    <section className="space-y-40 mb-40">
                        <div className="max-w-4xl">
                            <div className="flex items-center gap-4 text-white mb-6">
                                <Target className="h-8 w-8 text-blue-600" />
                                <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">ENGINEERING CERTAINTY.</h2>
                            </div>
                            <p className="text-xl md:text-2xl text-slate-400 font-light leading-relaxed">
                                We enable enterprises to scale from agile startups to global conglomerates through intelligent automation and absolute data integrity. By removing the Integration Tax—the heavy cost businesses pay for using disconnected tools—we allow our clients to focus on pure growth.
                            </p>
                        </div>

                        <div className="max-w-4xl ml-auto text-right">
                            <div className="flex items-center gap-4 text-white mb-6 justify-end">
                                <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">THE GLOBAL STANDARD.</h2>
                                <Globe className="h-8 w-8 text-blue-600" />
                            </div>
                            <p className="text-xl md:text-2xl text-slate-400 font-light leading-relaxed">
                                Our vision is to empower the next generation of African and international commerce with an unbreakable 'Business Base' that functions with identical power anywhere on earth—from a village in Uganda to a skyscraper in Manhattan.
                            </p>
                        </div>
                    </section>

                    <section className="mb-40">
                        <div className="mb-16 text-center">
                            <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">CORE VALUES.</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="p-10 bg-white/5 border border-white/10 rounded-[3rem] hover:bg-blue-600/5 transition-all duration-500 group">
                                <Target className="h-10 w-10 text-blue-600 mb-6 group-hover:scale-110 transition-transform" />
                                <h3 className="text-white text-xl font-black mb-4 tracking-tight uppercase italic">Focus</h3>
                                <p className="text-slate-500 text-sm leading-relaxed font-light">We focus on what matters most to our clients and eliminate distractions.</p>
                            </div>
                            <div className="p-10 bg-white/5 border border-white/10 rounded-[3rem] hover:bg-blue-600/5 transition-all duration-500 group">
                                <Users className="h-10 w-10 text-blue-600 mb-6 group-hover:scale-110 transition-transform" />
                                <h3 className="text-white text-xl font-black mb-4 tracking-tight uppercase italic">Community</h3>
                                <p className="text-slate-500 text-sm leading-relaxed font-light">We build with our community and for our community.</p>
                            </div>
                            <div className="p-10 bg-white/5 border border-white/10 rounded-[3rem] hover:bg-blue-600/5 transition-all duration-500 group">
                                <Globe className="h-10 w-10 text-blue-600 mb-6 group-hover:scale-110 transition-transform" />
                                <h3 className="text-white text-xl font-black mb-4 tracking-tight uppercase italic">Global Impact</h3>
                                <p className="text-slate-500 text-sm leading-relaxed font-light">We are committed to enabling global commerce and growth.</p>
                            </div>
                            <div className="p-10 bg-white/5 border border-white/10 rounded-[3rem] hover:bg-blue-600/5 transition-all duration-500 group">
                                <Heart className="h-10 w-10 text-blue-600 mb-6 group-hover:scale-110 transition-transform" />
                                <h3 className="text-white text-xl font-black mb-4 tracking-tight uppercase italic">Integrity</h3>
                                <p className="text-slate-500 text-sm leading-relaxed font-light">We operate with absolute transparency and honesty.</p>
                            </div>
                        </div>
                    </section>

                    <section className="mb-40 py-24 border-y border-white/10">
                        <div className="text-center mb-20">
                            <h2 className="text-4xl md:text-7xl font-black text-white uppercase italic tracking-tighter">THE FOUR COMMITMENTS.</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="flex gap-8 p-10 bg-white/5 border border-white/10 rounded-[3.5rem] hover:border-blue-500/40 transition-all">
                                <span className="text-4xl font-black text-blue-600/30 italic">01</span>
                                <div>
                                    <h4 className="text-white text-2xl font-black mb-4 uppercase italic tracking-tight leading-none">We don't pass through your business. We are part of it.</h4>
                                    <p className="text-slate-500 font-light leading-relaxed">BBU1 is not just a tool—it's a partner in your success. We grow when you grow.</p>
                                </div>
                            </div>
                            <div className="flex gap-8 p-10 bg-white/5 border border-white/10 rounded-[3.5rem] hover:border-blue-500/40 transition-all">
                                <span className="text-4xl font-black text-blue-600/30 italic">02</span>
                                <div>
                                    <h4 className="text-white text-2xl font-black mb-4 uppercase italic tracking-tight leading-none">Unbreakable reliability meets global scalability.</h4>
                                    <p className="text-slate-500 font-light leading-relaxed">Bank-level security, 99.9% uptime SLA, and infrastructure that scales with you.</p>
                                </div>
                            </div>
                            <div className="flex gap-8 p-10 bg-white/5 border border-white/10 rounded-[3.5rem] hover:border-blue-500/40 transition-all">
                                <span className="text-4xl font-black text-blue-600/30 italic">03</span>
                                <div>
                                    <h4 className="text-white text-2xl font-black mb-4 uppercase italic tracking-tight leading-none">Deep customization without vendor lock-in.</h4>
                                    <p className="text-slate-500 font-light leading-relaxed">Your business is unique. We provide APIs, custom fields, and integrations that let you build your way.</p>
                                </div>
                            </div>
                            <div className="flex gap-8 p-10 bg-white/5 border border-white/10 rounded-[3.5rem] hover:border-blue-500/40 transition-all">
                                <span className="text-4xl font-black text-blue-600/30 italic">04</span>
                                <div>
                                    <h4 className="text-white text-2xl font-black mb-4 uppercase italic tracking-tight leading-none">Fair pricing that grows with you.</h4>
                                    <p className="text-slate-500 font-light leading-relaxed">No hidden fees. No surprise upgrades. Pricing that's transparent from day one.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="relative p-16 md:p-24 bg-gradient-to-br from-blue-600 to-blue-800 rounded-[5rem] overflow-hidden shadow-3xl">
                        <div className="absolute top-0 right-0 p-10 opacity-10">
                            <Heart className="h-96 w-96 text-white" />
                        </div>
                        <div className="relative z-10 max-w-4xl">
                            <div className="flex items-center gap-4 text-blue-200 mb-8">
                                <Award className="h-8 w-8" />
                                <span className="text-sm font-black uppercase tracking-[0.4em]">Operational Legacy</span>
                            </div>
                            <h2 className="text-4xl md:text-8xl font-black text-white tracking-tighter uppercase italic mb-10 leading-none">
                                GIVING BACK <br /> TO THE BASE.
                            </h2>
                            <div className="space-y-8 text-blue-50 text-xl md:text-2xl font-light leading-relaxed mb-12">
                                <p>
                                    On August 17, 2024, BBU1 committed 1% of annual profits to SOS Children's Villages. This is our way of ensuring that the next generation of commerce is built on a foundation of care and community.
                                </p>
                                <p className="italic font-bold">
                                    "We are part of your business, and your business is part of the world. By giving back, we honor that responsibility."
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}