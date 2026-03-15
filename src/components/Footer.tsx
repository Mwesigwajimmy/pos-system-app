'use client';

import React from 'react';
import Link from 'next/link';
import { Rocket, Linkedin, Twitter, Facebook, Leaf, Mail, MapPin, ShieldCheck } from 'lucide-react';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="relative bg-[#020617] text-slate-400 pt-32 pb-12 border-t border-white/5 selection:bg-blue-500/30">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-20 mb-24">
                    
                    {/* --- BRAND COLUMN --- */}
                    <div className="lg:col-span-2 space-y-10">
                        <Link href="/" className="flex items-center space-x-2 font-black text-3xl text-white italic tracking-tighter group">
                            <Rocket className="h-10 w-10 text-blue-600 group-hover:rotate-12 transition-transform" /> 
                            <span>BBU1</span>
                        </Link>
                        <p className="text-xl font-light leading-relaxed max-w-sm text-slate-500">
                            The sovereign operating system for global commerce. Unifying intelligence, finance, and logistics into one unbreakable core.
                        </p>
                        <div className="flex gap-4">
                            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="h-14 w-14 rounded-[1.2rem] bg-white/5 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all duration-500 border border-white/5">
                                <Linkedin size={22} />
                            </a>
                            <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="h-14 w-14 rounded-[1.2rem] bg-white/5 flex items-center justify-center hover:bg-blue-400 hover:text-white transition-all duration-500 border border-white/5">
                                <Twitter size={22} />
                            </a>
                            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="h-14 w-14 rounded-[1.2rem] bg-white/5 flex items-center justify-center hover:bg-blue-800 hover:text-white transition-all duration-500 border border-white/5">
                                <Facebook size={22} />
                            </a>
                        </div>
                    </div>

                    {/* --- CAPABILITIES COLUMN --- */}
                    <div>
                        <h4 className="text-white font-black uppercase tracking-[0.3em] text-[10px] mb-10 opacity-50">Capabilities</h4>
                        <ul className="space-y-5 text-sm font-bold uppercase tracking-widest italic">
                            <li><Link href="/features" className="hover:text-blue-500 transition-colors">Core Features</Link></li>
                            <li><Link href="/industries" className="hover:text-blue-500 transition-colors">Sector Solutions</Link></li>
                            <li><Link href="/aura-ai" className="hover:text-blue-400 transition-colors text-blue-500">Aura Neural Core</Link></li>
                            <li><Link href="/pricing" className="hover:text-blue-500 transition-colors">Investment Tiers</Link></li>
                        </ul>
                    </div>

                    {/* --- ECOSYSTEM COLUMN --- */}
                    <div>
                        <h4 className="text-white font-black uppercase tracking-[0.3em] text-[10px] mb-10 opacity-50">Ecosystem</h4>
                        <ul className="space-y-5 text-sm font-bold uppercase tracking-widest italic">
                            <li><Link href="/about" className="hover:text-blue-500 transition-colors">Corporate Identity</Link></li>
                            <li><Link href="/blog" className="hover:text-blue-500 transition-colors">Engineering Journal</Link></li>
                            <li><Link href="/careers" className="hover:text-blue-500 transition-colors">Career Architecture</Link></li>
                            <li><Link href="/courses" className="hover:text-blue-500 transition-colors">BBU1 Academy</Link></li>
                        </ul>
                    </div>

                    {/* --- INFRASTRUCTURE COLUMN --- */}
                    <div>
                        <h4 className="text-white font-black uppercase tracking-[0.3em] text-[10px] mb-10 opacity-50">Infrastructure</h4>
                        <ul className="space-y-5 text-sm font-bold uppercase tracking-widest italic">
                            <li><Link href="/help-centre" className="hover:text-blue-500 transition-colors">Knowledge Base</Link></li>
                            <li><Link href="/contact" className="hover:text-blue-500 transition-colors">Strategic Inquiry</Link></li>
                            <li><Link href="/donate" className="hover:text-blue-500 transition-colors">Support the Mission</Link></li>
                            <li><Link href="/newsletter" className="hover:text-blue-500 transition-colors">Executive Intel</Link></li>
                        </ul>
                    </div>
                </div>

                {/* --- SOVEREIGN PROTOCOL STRIP --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 py-16 border-y border-white/5 mb-16">
                    <div className="flex items-center gap-6">
                        <div className="h-12 w-12 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500"><Mail size={20}/></div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Official Inquiry</p>
                            <p className="text-white font-bold italic">info@bbu1.com</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="h-12 w-12 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500"><MapPin size={20}/></div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Global Presence</p>
                            <p className="text-white font-bold italic">East Africa / Distributed</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="h-12 w-12 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500"><ShieldCheck size={20}/></div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Sovereignty Protocol</p>
                            <p className="text-white font-bold italic">100% Private Infrastructure</p>
                        </div>
                    </div>
                </div>

                {/* --- COPYRIGHT BAR --- */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-700 leading-none">
                        © {currentYear} BBU1 INTERNATIONAL. ALL RIGHTS RESERVED.
                    </p>
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] text-slate-700 leading-none">
                        <span>ENGINEERED</span> <Leaf className="h-4 w-4 text-green-900" /> <span>FOR THE WORLD</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}