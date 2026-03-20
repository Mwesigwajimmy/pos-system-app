import React from 'react';
import { Metadata } from "next";
import { Heart, Target, Globe, Users, Sparkles, ShieldCheck, Zap, ArrowRight, Award } from 'lucide-react';

export const metadata: Metadata = {
    title: "About BBU1 - Engineering the Business Base Universe",
    description: "BBU1 is the architect of the Business Base Universe—a sovereign digital ecosystem empowered by a unified operating core.",
};

export default function AboutPage() {
    return (
        <div className="flex flex-col min-h-screen bg-white text-slate-900 selection:bg-blue-500/30 font-sans">
            <main className="flex-grow pt-20 pb-24">
                <div className="container mx-auto px-6 max-w-7xl">
                    
                    {/* --- HEADER SECTION --- */}
                    <header className="mb-32">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full mb-8">
                            <Sparkles className="h-4 w-4 text-blue-600" />
                            <span className="text-blue-700 text-xs font-bold tracking-widest uppercase">Corporate Identity</span>
                        </div>
                        
                        <h1 className="text-5xl md:text-7xl font-bold text-slate-900 tracking-tight leading-tight mb-12">
                            Who we <span className="text-blue-600">are.</span>
                        </h1>

                        <div className="grid lg:grid-cols-12 gap-12 items-start">
                            <div className="lg:col-span-8">
                                <p className="text-xl md:text-2xl font-normal text-slate-600 leading-relaxed border-l-4 border-blue-600 pl-8 mb-10">
                                    BBU1 is the architect of the Business Base Universe—a sovereign digital ecosystem where commerce is no longer restricted by disconnected software, but empowered by a unified operating core.
                                </p>
                                <p className="text-slate-500 text-lg leading-relaxed max-w-2xl font-normal">
                                    We bridge the gap between complex engineering and global business utility. Our purpose is to provide an unbreakable foundation for the next generation of digital commerce.
                                </p>
                            </div>
                            <div className="lg:col-span-4 p-8 bg-slate-50 border border-slate-200 rounded-3xl shadow-sm">
                                <p className="text-blue-600 text-[11px] font-bold uppercase tracking-widest mb-4">Founder & Lead Architect</p>
                                <h3 className="text-slate-900 text-2xl font-bold mb-2">Mwesigwa Jimmy</h3>
                                <p className="text-slate-600 text-sm font-normal leading-relaxed">
                                    Building the infrastructure powering the next generation of African and global commerce.
                                </p>
                            </div>
                        </div>
                    </header>

                    {/* --- MISSION SECTIONS --- */}
                    <section className="space-y-32 mb-40">
                        <div className="max-w-4xl">
                            <div className="flex items-center gap-4 text-slate-900 mb-6">
                                <Target className="h-8 w-8 text-blue-600" />
                                <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Engineering Certainty.</h2>
                            </div>
                            <p className="text-lg md:text-xl text-slate-600 font-normal leading-relaxed">
                                We enable enterprises to scale from agile startups to global conglomerates through intelligent automation and absolute data integrity. By removing the "Integration Tax"—the heavy cost businesses pay for using disconnected tools—we allow our clients to focus on pure growth.
                            </p>
                        </div>

                        <div className="max-w-4xl ml-auto text-right">
                            <div className="flex items-center gap-4 text-slate-900 mb-6 justify-end">
                                <h2 className="text-3xl md:text-5xl font-bold tracking-tight">The Global Standard.</h2>
                                <Globe className="h-8 w-8 text-blue-600" />
                            </div>
                            <p className="text-lg md:text-xl text-slate-600 font-normal leading-relaxed">
                                Our vision is to empower the next generation of African and international commerce with an unbreakable "Business Base" that functions with identical power anywhere on earth—from a village in Uganda to a skyscraper in Manhattan.
                            </p>
                        </div>
                    </section>

                    {/* --- CORE VALUES GRID --- */}
                    <section className="mb-40">
                        <div className="mb-16 text-center">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Core Values</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { icon: Target, title: "Focus", desc: "We focus on what matters most to our clients and eliminate distractions." },
                                { icon: Users, title: "Community", desc: "We build with our community and for our community." },
                                { icon: Globe, title: "Global Impact", desc: "We are committed to enabling global commerce and growth." },
                                { icon: Heart, title: "Integrity", desc: "We operate with absolute transparency and honesty." }
                            ].map((value, i) => (
                                <div key={i} className="p-10 bg-slate-50 border border-slate-100 rounded-3xl hover:bg-white hover:shadow-xl hover:border-blue-200 transition-all duration-300 group">
                                    <value.icon className="h-10 w-10 text-blue-600 mb-6 group-hover:scale-110 transition-transform" />
                                    <h3 className="text-slate-900 text-xl font-bold mb-4">{value.title}</h3>
                                    <p className="text-slate-600 text-sm leading-relaxed font-normal">{value.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* --- THE FOUR COMMITMENTS --- */}
                    <section className="mb-40 py-24 border-y border-slate-100">
                        <div className="text-center mb-20">
                            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight">The Four Commitments</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {[
                                { num: "01", title: "We don't pass through your business. We are part of it.", desc: "BBU1 is not just a tool—it's a partner in your success. We grow when you grow." },
                                { num: "02", title: "Unbreakable reliability meets global scalability.", desc: "Bank-level security, 99.9% uptime SLA, and infrastructure that scales with you." },
                                { num: "03", title: "Deep customization without vendor lock-in.", desc: "Your business is unique. We provide APIs and integrations that let you build your way." },
                                { num: "04", title: "Fair pricing that grows with you.", desc: "No hidden fees. No surprise upgrades. Pricing that's transparent from day one." }
                            ].map((item, i) => (
                                <div key={i} className="flex gap-8 p-10 bg-slate-50 border border-slate-200 rounded-3xl hover:border-blue-300 hover:bg-white hover:shadow-md transition-all">
                                    <span className="text-4xl font-bold text-blue-200">{item.num}</span>
                                    <div>
                                        <h4 className="text-slate-900 text-xl font-bold mb-4 leading-snug">{item.title}</h4>
                                        <p className="text-slate-600 font-normal leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* --- FINAL SOCIAL IMPACT SECTION --- */}
                    <section className="relative p-12 md:p-20 bg-blue-600 rounded-[3rem] overflow-hidden shadow-2xl shadow-blue-600/20 text-white">
                        <div className="absolute top-0 right-0 p-10 opacity-10">
                            <Heart className="h-64 w-64 text-white" />
                        </div>
                        <div className="relative z-10 max-w-4xl">
                            <div className="flex items-center gap-4 text-blue-100 mb-8">
                                <Award className="h-6 w-6" />
                                <span className="text-xs font-bold uppercase tracking-widest">Operational Legacy</span>
                            </div>
                            <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-10 leading-tight">
                                Giving back <br /> to the base.
                            </h2>
                            <div className="space-y-8 text-blue-50 text-lg md:text-xl font-normal leading-relaxed">
                                <p>
                                    On August 17, 2024, BBU1 committed 1% of annual profits to SOS Children's Villages. This is our way of ensuring that the next generation of commerce is built on a foundation of care and community.
                                </p>
                                <p className="font-semibold text-white">
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