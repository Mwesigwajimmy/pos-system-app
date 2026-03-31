'use client';

import React from 'react';
import { 
  Globe, TrendingUp, AlertCircle, 
  Zap, BarChart3, Search, 
  ArrowUpRight, ShieldCheck, Timer, Presentation
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button'; // Fixed missing import
import { cn } from '@/lib/utils';

// Mock Data structure representing your Smart System's real-time pull
const MARKET_SIGNALS = [
    {
        sector: "Wheat & Flour Supply",
        locale: "East Africa (Nairobi Hub)",
        trend: "BULLISH",
        change: "+4.2%",
        insight: "Market prices in Nairobi rose by 4% this morning. Impact to Cake/Bakery Sector: High.",
        confidence: 94,
        color: "emerald"
    },
    {
        sector: "Logistics Competitor B",
        locale: "Uganda (Entebbe Route)",
        trend: "THREAT",
        change: "FREE_SHIP",
        insight: "Competitor B launched free shipping to Entebbe. Aura-Marketing suggests counter-loyalty points.",
        confidence: 88,
        color: "sky"
    }
];

export default function GlobalMarketScout() {
    return (
        <div className="bg-slate-950 rounded-[2.5rem] p-8 shadow-2xl h-full flex flex-col text-white border border-white/10 relative overflow-hidden group">
            
            {/* --- TOP HEADER: SIGNAL INTELLIGENCE --- */}
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Globe className="text-emerald-400 animate-spin-slow" size={28} />
                        <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-emerald-500 rounded-full border-2 border-slate-950 animate-pulse"></span>
                    </div>
                    <div className="flex flex-col">
                        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white">Global Scout</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <Timer size={10} className="text-slate-500" />
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Live Signal: Active</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <Badge className="bg-white/5 text-slate-400 border border-white/10 text-[9px] font-black uppercase tracking-tighter px-3">
                        SOURCE: SEARXNG_CORE
                    </Badge>
                </div>
            </div>

            {/* --- MAIN INTELLIGENCE FEED --- */}
            <div className="space-y-6 flex-1">
                {MARKET_SIGNALS.map((signal, idx) => (
                    <div 
                        key={idx}
                        className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 space-y-4 hover:bg-white/[0.06] transition-all duration-500 group/card"
                    >
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <span className={cn(
                                    "text-[10px] font-black uppercase tracking-widest",
                                    signal.color === 'emerald' ? 'text-emerald-400' : 'text-sky-400'
                                )}>
                                    {signal.sector}
                                </span>
                                <p className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                    <Globe size={10} /> {signal.locale}
                                </p>
                            </div>
                            <div className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black",
                                signal.color === 'emerald' ? 'text-emerald-400' : 'text-sky-400'
                            )}>
                                {signal.trend === 'BULLISH' ? <TrendingUp size={12} /> : <Zap size={12} />}
                                {signal.change}
                            </div>
                        </div>

                        <p className="text-[13px] font-medium leading-relaxed text-slate-300 italic">
                            "{signal.insight}"
                        </p>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-500">
                                <span>Aura Confidence Level</span>
                                <span>{signal.confidence}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div 
                                    className={cn(
                                        "h-full transition-all duration-1000",
                                        signal.color === 'emerald' ? 'bg-emerald-500' : 'bg-sky-500'
                                    )} 
                                    style={{ width: `${signal.confidence}%` }} 
                                />
                            </div>
                        </div>
                    </div>
                ))}

                {/* --- SMART STRATEGY RECOMMENDATION (Logic Based) --- */}
                <div className="p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-4">
                    <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                        <BarChart3 size={20} />
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-emerald-400">Strategy Recommendation</p>
                        <p className="text-[11px] text-emerald-100/80 leading-relaxed font-medium">
                            Based on cross-border trends, Aura-CMO suggests locking flour prices for Q3 to hedge against Nairobi volatility.
                        </p>
                    </div>
                </div>
            </div>

            {/* --- C-SUITE FOOTER ACTION --- */}
            <div className="mt-10 space-y-4">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-500 font-black text-[11px] uppercase tracking-[0.2em] h-14 rounded-2xl shadow-xl shadow-emerald-900/20 transition-all active:scale-95 group/btn">
                    <Presentation className="mr-3 h-5 w-5 group-hover/btn:scale-110 transition-transform" />
                    Open Strategy Boardroom
                </Button>
                
                <div className="flex items-center justify-center gap-6 py-2">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase">
                        <ShieldCheck size={12} className="text-emerald-500/50" />
                        Encrypted Feed
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase">
                        <Zap size={12} className="text-sky-500/50" />
                        Sovereign Link 1.0
                    </div>
                </div>
            </div>

            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950/80 pointer-events-none" />
        </div>
    );
}