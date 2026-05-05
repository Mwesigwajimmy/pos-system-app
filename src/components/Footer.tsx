'use client';

import React from 'react';
import Link from 'next/link';
import { Rocket, Linkedin, Twitter, Facebook, Leaf, Mail, MapPin, ShieldCheck } from 'lucide-react';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="relative bg-[#020617] text-slate-400 pt-24 pb-12 border-t border-white/5 selection:bg-blue-500/30">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-20 mb-20">
                    
                    {/* --- BRAND COLUMN --- */}
                    <div className="lg:col-span-2 space-y-8">
                        <Link href="/" className="flex items-center space-x-2 font-bold text-3xl text-white tracking-tight group">
                            <Rocket className="h-9 w-9 text-blue-500 group-hover:scale-110 transition-transform duration-300" /> 
                            <span>BBU1</span>
                        </Link>
                        <p className="text-lg font-normal leading-relaxed max-w-sm text-slate-400">
                            The complete management platform for modern business. We integrate sales, finance, and operations into one secure, reliable system.
                        </p>
                        <div className="flex gap-3">
                            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all duration-300 border border-white/5">
                                <Linkedin size={20} />
                            </a>
                            <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center hover:bg-blue-400 hover:text-white transition-all duration-300 border border-white/5">
                                <Twitter size={20} />
                            </a>
                            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center hover:bg-blue-800 hover:text-white transition-all duration-300 border border-white/5">
                                <Facebook size={20} />
                            </a>
                        </div>
                    </div>

                    {/* --- SOLUTIONS COLUMN --- */}
                    <div>
                        <h4 className="text-white font-bold uppercase tracking-widest text-[11px] mb-8 opacity-60">Solutions</h4>
                        <ul className="space-y-4 text-sm font-semibold uppercase tracking-wider">
                            <li><Link href="/features" className="hover:text-blue-500 transition-colors">Key Features</Link></li>
                            <li><Link href="/industries" className="hover:text-blue-500 transition-colors">Industry Sectors</Link></li>
                            <li><Link href="/aura-ai" className="hover:text-blue-400 transition-colors text-blue-500">Business AI</Link></li>
                            <li><Link href="/pricing" className="hover:text-blue-500 transition-colors">Pricing Plans</Link></li>
                        </ul>
                    </div>

                    {/* --- COMPANY COLUMN --- */}
                    <div>
                        <h4 className="text-white font-bold uppercase tracking-widest text-[11px] mb-8 opacity-60">Company</h4>
                        <ul className="space-y-4 text-sm font-semibold uppercase tracking-wider">
                            <li><Link href="/about" className="hover:text-blue-500 transition-colors">About BBU1</Link></li>
                            <li><Link href="/blog" className="hover:text-blue-500 transition-colors">Company Blog</Link></li>
                            <li><Link href="/careers" className="hover:text-blue-500 transition-colors">Careers</Link></li>
                            <li><Link href="/courses" className="hover:text-blue-500 transition-colors">Learning Center</Link></li>
                        </ul>
                    </div>

                    {/* --- SUPPORT COLUMN --- */}
                    <div>
                        <h4 className="text-white font-bold uppercase tracking-widest text-[11px] mb-8 opacity-60">Support</h4>
                        <ul className="space-y-4 text-sm font-semibold uppercase tracking-wider">
                            <li><Link href="/help-centre" className="hover:text-blue-500 transition-colors">Help Center</Link></li>
                            <li><Link href="/contact" className="hover:text-blue-500 transition-colors">Contact Sales</Link></li>
                            <li><Link href="/donate" className="hover:text-blue-500 transition-colors">Our Mission</Link></li>
                            <li><Link href="/newsletter" className="hover:text-blue-500 transition-colors">Newsletter</Link></li>
                        </ul>
                    </div>
                </div>

                {/* --- CONTACT & INFO STRIP --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-12 border-y border-white/5 mb-12">
                    <div className="flex items-center gap-5">
                        <div className="h-11 w-11 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500"><Mail size={18}/></div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">General Enquiries</p>
                            <p className="text-white font-semibold">info@bbu1.com</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-5">
                        <div className="h-11 w-11 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500"><MapPin size={18}/></div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Main Office</p>
                            <p className="text-white font-semibold">Kampala, Uganda</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-5">
                        <div className="h-11 w-11 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500"><ShieldCheck size={18}/></div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Data Security</p>
                            <p className="text-white font-semibold">Verified Private Network</p>
                        </div>
                    </div>
                </div>

                {/* --- COPYRIGHT BAR --- */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-600 leading-none">
                        © {currentYear} BBU1 INTERNATIONAL. ALL RIGHTS RESERVED.
                    </p>
                    <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-600 leading-none">
                        <span>MADE</span> <Leaf className="h-4 w-4 text-green-900" /> <span>FOR THE WORLD</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}