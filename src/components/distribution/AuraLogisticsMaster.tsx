'use client';

import React, { useState, useEffect } from 'react';
import { useCopilot } from '@/context/CopilotContext';
import { 
  ShieldCheck, Globe, Activity, Zap, 
  FileText, TrendingUp, Presentation, Mic2,
  Search, Download, Bell, RefreshCcw, ArrowUpRight, ArrowDownRight,
  MoreHorizontal, ChevronRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

// New specialized components
import ForensicCustomsHub from './ForensicCustomsHub';
import StrategicRouteAudit from './StrategicRouteAudit';
import GlobalMarketScout from './GlobalMarketScout';

export default function AuraLogisticsMaster() {
    const { isReady, openCopilot } = useCopilot();
    const [lastSync, setLastSync] = useState(new Date().toLocaleTimeString());

    return (
        <div className="p-0 bg-slate-50/80 min-h-screen animate-in fade-in duration-700 selection:bg-emerald-500/30">
            
            {/* --- 1. GLOBAL ENTERPRISE TOP NAVIGATION --- */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-8 py-3 flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold tracking-widest uppercase">
                        <span>BBU1 OS</span>
                        <ChevronRight size={14} />
                        <span className="text-slate-900">Logistics C-Suite</span>
                    </div>
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <Input className="h-9 pl-10 bg-slate-100/50 border-none rounded-full text-xs" placeholder="Search Sovereign Nodes, Shipments, or Audit IDs..." />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase mr-4">
                        <RefreshCcw size={12} className="animate-spin-slow" />
                        Live Sync: {lastSync}
                    </div>
                    <Button variant="ghost" size="icon" className="relative rounded-full">
                        <Bell size={20} className="text-slate-600" />
                        <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="rounded-xl font-bold text-xs gap-2">
                                <Download size={16} /> Export Reports
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="font-medium">Boardroom PDF</DropdownMenuItem>
                            <DropdownMenuItem className="font-medium">Financial Excel</DropdownMenuItem>
                            <DropdownMenuItem className="font-medium">Customs Manifest</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            <div className="p-8 space-y-10">
                {/* --- 2. THE SOVEREIGN HEADER --- */}
                <div className="flex justify-between items-end">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <h1 className="text-6xl font-black tracking-tighter italic uppercase text-slate-900 leading-none">
                                Sovereign <span className="text-emerald-500">C-Suite</span>
                            </h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <Badge className="bg-slate-950 text-white px-4 py-1 text-[10px] font-mono rounded-md">NODE_ID: L-7742</Badge>
                            <div className="h-1 w-1 rounded-full bg-slate-300"></div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                                Forensic Export/Import Intelligence Active
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <Button 
                            onClick={() => openCopilot()} 
                            className="h-16 px-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl shadow-2xl shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95 group"
                        >
                            <Mic2 className="mr-3 h-5 w-5 group-hover:animate-pulse" /> 
                            <div className="flex flex-col items-start text-left">
                                <span className="text-[10px] uppercase font-bold opacity-70">Aura AI Agent</span>
                                <span className="text-base font-black">Start Briefing</span>
                            </div>
                        </Button>
                    </div>
                </div>

                {/* --- 3. AGENT STATUS HUD (WITH TREND INDICATORS) --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-white border border-slate-200 shadow-xl rounded-[2rem] p-8 relative overflow-hidden group hover:border-emerald-500/50 transition-all">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                            <ShieldCheck size={100} />
                        </div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex justify-between items-start">
                                <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-50 px-3 py-1 font-bold">AURA-CFO: ONLINE</Badge>
                                <div className="flex items-center text-emerald-600 font-bold text-xs gap-1">
                                    <ArrowUpRight size={16} /> +0.2%
                                </div>
                            </div>
                            <div className="mt-8">
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Financial Integrity Score</h3>
                                <p className="text-4xl font-black text-slate-900 mt-1">99.9% <span className="text-sm font-medium text-slate-400">Accuracy</span></p>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-6 italic font-mono bg-slate-50 p-3 rounded-xl border border-slate-100">
                                "Audit math verified via Benford Law protocol."
                            </p>
                        </div>
                    </Card>
                    
                    <Card className="bg-white border border-slate-200 shadow-xl rounded-[2rem] p-8 relative overflow-hidden group hover:border-sky-500/50 transition-all">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Activity size={100} />
                        </div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex justify-between items-start">
                                <Badge variant="outline" className="border-sky-500/30 text-sky-600 bg-sky-50 px-3 py-1 font-bold">AURA-COO: ACTIVE</Badge>
                                <div className="flex items-center text-red-500 font-bold text-xs gap-1">
                                    <ArrowDownRight size={16} /> -12m
                                </div>
                            </div>
                            <div className="mt-8">
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Operational Drift</h3>
                                <p className="text-4xl font-black text-slate-900 mt-1">0.4% <span className="text-sm font-medium text-slate-400">Variance</span></p>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-6 italic font-mono bg-slate-50 p-3 rounded-xl border border-slate-100">
                                "Routes optimized for 26 distribution units."
                            </p>
                        </div>
                    </Card>

                    <Card className="bg-slate-950 border-none shadow-2xl rounded-[2rem] p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity text-emerald-400">
                            <Globe size={100} />
                        </div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <Badge variant="outline" className="w-fit border-white/10 text-white bg-white/5 px-3 py-1 font-bold">AURA-CMO: SCOUTING</Badge>
                            <div className="mt-8">
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Market Intelligence</h3>
                                <p className="text-4xl font-black text-emerald-400 mt-1">Sovereign Link</p>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-6 italic font-mono bg-white/5 p-3 rounded-xl border border-white/10">
                                "Monitoring competitor pricing in Kampala/Nairobi."
                            </p>
                        </div>
                    </Card>
                </div>

                {/* --- 4. THE DEEP CORE MODULES --- */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 pb-20">
                    <div className="lg:col-span-3 space-y-8">
                        <ForensicCustomsHub />
                        <StrategicRouteAudit />
                    </div>
                    <div className="lg:col-span-2">
                        <GlobalMarketScout />
                    </div>
                </div>
            </div>
        </div>
    );
}