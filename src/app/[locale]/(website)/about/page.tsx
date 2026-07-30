import React from 'react';
import { Metadata } from "next";
import { Heart, Target, Globe, Users, Sparkles, Award } from 'lucide-react';
import BackNavbar from '@/components/BackNavbar';

export const metadata: Metadata = {
    title: "About BBU1",
    description: "BBU1 is a unified operating system for business — accounting, CRM, inventory, HR, and AI insights in one platform.",
};

export default function AboutPage() {
    return (
        <div className="flex flex-col min-h-screen bg-white text-slate-900 selection:bg-blue-500/30 font-sans">
            <BackNavbar backHref="/" backLabel="Home" />
            <main className="flex-grow pt-20 pb-24">
                <div className="container mx-auto px-6 max-w-7xl">

                    {/* --- HEADER --- */}
                    <header className="mb-24">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full mb-6">
                            <Sparkles className="h-4 w-4 text-blue-600" />
                            <span className="text-blue-700 text-xs font-bold tracking-widest uppercase">About</span>
                        </div>

                        <h1 className="text-4xl md:text-6xl font-bold text-slate-900 tracking-tight leading-tight mb-10">
                            Who we are.
                        </h1>

                        <div className="grid lg:grid-cols-12 gap-10 items-start">
                            <div className="lg:col-span-8">
                                <p className="text-lg md:text-xl text-slate-600 leading-relaxed border-l-4 border-blue-600 pl-6 mb-6">
                                    BBU1 is a unified operating system for business — one platform for accounting, CRM, inventory, HR, and AI insights, instead of five disconnected tools.
                                </p>
                                <p className="text-slate-500 text-base leading-relaxed max-w-2xl">
                                    We started BBU1 because we kept seeing the same problem: businesses paying for good software that didn't talk to each other. Our goal is a platform solid enough to run a business on, wherever that business is.
                                </p>
                            </div>
                            <div className="lg:col-span-4 p-7 bg-slate-50 border border-slate-200 rounded-2xl">
                                <p className="text-blue-600 text-[11px] font-bold uppercase tracking-widest mb-3">Founder & CEO</p>
                                <h3 className="text-slate-900 text-xl font-bold mb-2">Mwesigwa Jimmy</h3>
                                <p className="text-slate-600 text-sm leading-relaxed">
                                    Building infrastructure for African and global commerce.
                                </p>
                            </div>
                        </div>
                    </header>

                    {/* --- MISSION & VISION --- */}
                    <section className="grid md:grid-cols-2 gap-16 mb-24">
                        <div>
                            <div className="flex items-center gap-3 text-blue-600 mb-4">
                                <Target className="h-6 w-6" />
                                <span className="text-xs font-bold uppercase tracking-widest">Our Mission</span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">Fewer tools, less friction.</h2>
                            <p className="text-base md:text-lg text-slate-600 leading-relaxed">
                                We help businesses scale from a single location to multiple branches without the hidden cost of stitching disconnected tools together — so teams spend time on the business, not on reconciling three different systems.
                            </p>
                        </div>

                        <div>
                            <div className="flex items-center gap-3 text-blue-600 mb-4">
                                <Globe className="h-6 w-6" />
                                <span className="text-xs font-bold uppercase tracking-widest">Our Vision</span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">The same tools, everywhere.</h2>
                            <p className="text-base md:text-lg text-slate-600 leading-relaxed">
                                We want a shop in a small town to have access to the same quality of business tools as a large firm in a major city — built for African markets first, and useful anywhere.
                            </p>
                        </div>
                    </section>

                    {/* --- CORE VALUES --- */}
                    <section className="mb-24">
                        <div className="mb-12 text-center">
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">What we care about</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                            {[
                                { icon: Target, title: "Focus", desc: "We'd rather do a few things well than everything at once." },
                                { icon: Users, title: "Community", desc: "We build for the businesses we work alongside, not just for them." },
                                { icon: Globe, title: "Reach", desc: "Built for businesses across Africa, useful anywhere in the world." },
                                { icon: Heart, title: "Integrity", desc: "We tell you what the product does and doesn't do, plainly." }
                            ].map((value, i) => (
                                <div key={i} className="p-8 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-md hover:border-blue-200 transition-all duration-300 group">
                                    <value.icon className="h-8 w-8 text-blue-600 mb-5 group-hover:scale-110 transition-transform" />
                                    <h3 className="text-slate-900 text-lg font-bold mb-2.5">{value.title}</h3>
                                    <p className="text-slate-600 text-sm leading-relaxed">{value.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* --- COMMITMENTS --- */}
                    <section className="mb-24 py-20 border-y border-slate-100">
                        <div className="text-center mb-16">
                            <h2 className="text-2xl md:text-4xl font-bold text-slate-900 tracking-tight">What you can expect from us</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                { num: "01", title: "We grow when you grow.", desc: "We're not a vendor you talk to once a year. Our incentive is your business succeeding on the platform." },
                                { num: "02", title: "Reliable at any scale.", desc: "Bank-level security, a 99.9% uptime target, and infrastructure that scales as you add locations." },
                                { num: "03", title: "No vendor lock-in.", desc: "Custom fields, workflows, and open APIs so your data and integrations stay portable." },
                                { num: "04", title: "Transparent pricing.", desc: "No hidden fees, no surprise upgrades. What you see is what you pay." }
                            ].map((item, i) => (
                                <div key={i} className="flex gap-6 p-8 bg-slate-50 border border-slate-200 rounded-2xl hover:border-blue-300 hover:bg-white hover:shadow-sm transition-all">
                                    <span className="text-2xl font-bold text-blue-200 shrink-0">{item.num}</span>
                                    <div>
                                        <h4 className="text-slate-900 text-lg font-bold mb-2 leading-snug">{item.title}</h4>
                                        <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* --- GIVING BACK --- */}
                    <section className="relative p-10 md:p-16 bg-blue-600 rounded-3xl text-white">
                        <div className="max-w-3xl">
                            <div className="flex items-center gap-3 text-blue-100 mb-6">
                                <Award className="h-5 w-5" />
                                <span className="text-xs font-bold uppercase tracking-widest">Giving Back</span>
                            </div>
                            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-8 leading-tight">
                                Giving back to the community.
                            </h2>
                            <div className="space-y-6 text-blue-50 text-base md:text-lg leading-relaxed">
                                <p>
                                    Since August 2024, BBU1 has committed 1% of annual profits to SOS Children's Villages, supporting children and families in the communities we operate in.
                                </p>
                                <p className="font-semibold text-white">
                                    We're part of the businesses we serve, and those businesses are part of the world. Giving back is how we honor that.
                                </p>
                            </div>
                        </div>
                    </section>

                </div>
            </main>
        </div>
    );
}