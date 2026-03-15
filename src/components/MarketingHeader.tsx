'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import { ModeToggle } from '@/components/ui/mode-toggle';
import { Rocket, Menu, X, Sparkles } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function MarketingHeader() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navLinks = [
        { name: "Features", href: "/features" },
        { name: "Industries", href: "/industries" },
        { name: "Aura AI", href: "/aura-ai", special: true },
        { name: "Pricing", href: "/pricing" },
        { name: "Journal", href: "/blog" },
        { name: "Academy", href: "/courses" },
    ];

    return (
        <header className="fixed top-0 z-[100] w-full border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl">
            <div className="container mx-auto flex h-20 items-center justify-between px-6">
                <Link href="/" className="flex items-center space-x-2 font-black text-2xl text-white italic tracking-tighter group">
                    <Rocket className="h-8 w-8 text-blue-600 group-hover:rotate-12 transition-transform" /> 
                    <span>BBU1</span>
                </Link>

                <nav className="hidden lg:flex items-center gap-1">
                    {navLinks.map((link) => (
                        <Link 
                            key={link.name} 
                            href={link.href} 
                            className={cn(
                                navigationMenuTriggerStyle(), 
                                "bg-transparent text-slate-400 hover:text-white font-bold uppercase text-[10px] tracking-widest transition-colors",
                                link.special && "text-blue-500 hover:text-blue-400"
                            )}
                        >
                            {link.special && <Sparkles className="h-3 w-3 mr-2 inline" />}
                            {link.name}
                        </Link>
                    ))}
                </nav>

                <div className="hidden lg:flex items-center gap-6">
                    <ModeToggle />
                    <Link href="/login" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-white transition-colors">
                        Log In
                    </Link>
                    <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest px-8 py-6 rounded-xl shadow-2xl shadow-blue-600/20 active:scale-95 transition-all">
                        <Link href="/signup">Get Started</Link>
                    </Button>
                </div>

                <div className="lg:hidden flex items-center gap-4">
                    <ModeToggle />
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white p-2">
                        {isMobileMenuOpen ? <X className="h-8 w-8" /> : <Menu className="h-8 w-8" />}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }} 
                        exit={{ opacity: 0, height: 0 }} 
                        className="lg:hidden bg-[#020617] border-t border-white/5 overflow-hidden"
                    >
                        <div className="p-6 space-y-4">
                            {navLinks.map((link) => (
                                <Link 
                                    key={link.name} 
                                    href={link.href} 
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="block text-2xl font-black uppercase italic tracking-tighter text-white hover:text-blue-500 transition-colors"
                                >
                                    {link.name}
                                </Link>
                            ))}
                            <div className="pt-6 border-t border-white/5 flex flex-col gap-4">
                                <Button asChild className="w-full bg-blue-600 font-black uppercase tracking-widest py-8 rounded-2xl">
                                    <Link href="/signup">Get Started</Link>
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}