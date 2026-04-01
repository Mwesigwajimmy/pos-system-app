'use client';

import React, { useState, useEffect } from 'react';
import { useCopilot } from '@/context/CopilotContext';
import { 
  CheckCircle2, Globe, Activity, 
  TrendingUp, Mic2, Search, Download, 
  Bell, RefreshCw, ArrowUpRight, 
  ArrowDownRight, ChevronRight,
  ShieldCheck,
  Truck
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

// Sub-components (Names preserved for logic consistency)
import ForensicCustomsHub from './ForensicCustomsHub';
import StrategicRouteAudit from './StrategicRouteAudit';
import GlobalMarketScout from './GlobalMarketScout';

export default function AuraLogisticsMaster() {
    const { openCopilot } = useCopilot();
    const [lastSync, setLastSync] = useState('');

    useEffect(() => {
        setLastSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        const timer = setInterval(() => {
            setLastSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="bg-[#F8FAFC] min-h-screen animate-in fade-in duration-500">
            
            {/* --- 1. PROFESSIONAL TOP NAVIGATION --- */}
            <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold tracking-widest uppercase">
                        <span>System</span>
                        <ChevronRight size={12} />
                        <span className="text-slate-900">Logistics Management</span>
                    </div>
                    <div className="relative w-64 hidden md:block">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                        <Input className="h-9 pl-9 border-slate-200 bg-slate-50 rounded-lg text-xs" placeholder="Search branch nodes..." />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase mr-2">
                        <RefreshCw size={12} className="text-blue-500" />
                        Sync: {lastSync || 'Updating...'}
                    </div>
                    <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full border border-slate-100">
                        <Bell size={18} className="text-slate-600" />
                        <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-9 rounded-lg font-bold text-xs gap-2 border-slate-200 shadow-sm">
                                <Download size={14} /> Export
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 p-1">
                            <DropdownMenuItem className="text-xs font-semibold cursor-pointer rounded-md">Financial Report (PDF)</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs font-semibold cursor-pointer rounded-md">Logistics Data (CSV)</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
                {/* --- 2. EXECUTIVE HEADER --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-600 rounded-lg shadow-md">
                                <Truck className="text-white w-6 h-6" />
                            </div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight uppercase">
                                Logistics <span className="text-blue-600">Operations</span>
                            </h1>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                            <Badge variant="secondary" className="bg-slate-900 text-white px-3 py-1 text-[10px] font-mono rounded-md">NODE: L-7742</Badge>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Integrated Import/Export Tracking Active
                            </p>
                        </div>
                    </div>
                    <Button 
                        onClick={() => openCopilot && openCopilot()} 
                        className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all active:scale-95"
                    >
                        <Mic2 className="mr-2 h-4 w-4" /> 
                        <span className="font-bold text-sm">Start AI Briefing</span>
                    </Button>
                </div>

                {/* --- 3. PERFORMANCE GRID --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Financial Integrity */}
                    <Card className="bg-white border-slate-200 shadow-sm rounded-xl p-6 relative overflow-hidden group">
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex justify-between items-start">
                                <Badge variant="outline" className="border-blue-100 text-blue-700 bg-blue-50 font-bold">Aura Finance: Active</Badge>
                                <div className="flex items-center text-emerald-600 font-bold text-xs gap-1">
                                    <ArrowUpRight size={14} /> +0.2%
                                </div>
                            </div>
                            <div className="mt-8">
                                <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Integrity Accuracy</h3>
                                <p className="text-3xl font-bold text-slate-900 mt-1">99.9%</p>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-6 font-semibold bg-slate-50 p-3 rounded-lg border border-slate-100 uppercase tracking-tight">
                                "Calculations verified via system protocol."
                            </p>
                        </div>
                    </Card>
                    
                    {/* Operational Drift */}
                    <Card className="bg-white border-slate-200 shadow-sm rounded-xl p-6 relative overflow-hidden group">
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex justify-between items-start">
                                <Badge variant="outline" className="border-slate-200 text-slate-500 bg-slate-50 font-bold">Aura Ops: Online</Badge>
                                <div className="flex items-center text-red-500 font-bold text-xs gap-1">
                                    <ArrowDownRight size={14} /> -12m
                                </div>
                            </div>
                            <div className="mt-8">
                                <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Operational Variance</h3>
                                <p className="text-3xl font-bold text-slate-900 mt-1">0.4%</p>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-6 font-semibold bg-slate-50 p-3 rounded-lg border border-slate-100 uppercase tracking-tight">
                                "Route optimization applied to 26 units."
                            </p>
                        </div>
                    </Card>

                    {/* Market Intel */}
                    <Card className="bg-slate-900 border-none shadow-lg rounded-xl p-6 relative overflow-hidden group text-white">
                        <Globe size={60} className="absolute -right-4 -top-4 text-blue-500 opacity-10 rotate-12" />
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <Badge variant="secondary" className="w-fit bg-white/10 text-blue-300 font-bold border-none">Aura Market: Monitoring</Badge>
                            <div className="mt-8">
                                <h3 className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">System Status</h3>
                                <p className="text-2xl font-bold text-white mt-1 uppercase tracking-tight">Active Intelligence</p>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-6 font-semibold bg-white/5 p-3 rounded-lg border border-white/10 uppercase tracking-tight">
                                "Real-time pricing analysis synchronized."
                            </p>
                        </div>
                    </Card>
                </div>

                {/* --- 4. CORE DATA MODULES --- */}
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