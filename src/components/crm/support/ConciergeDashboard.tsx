'use client';

/**
 * --- BBU1 CONCIERGE INTELLIGENCE DASHBOARD ---
 * VERSION: v1.3 OMEGA-COMMAND (DIAL-PAD INTEGRATED)
 * Use: Sovereign command center for voice, neural gaps, and live web pathways.
 * Logic: Orchestrates three deep forensic streams + Manual Telephony Command.
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { TelephonyLogs } from "./TelephonyLogs";
import { KnowledgeGapLedger } from "./KnowledgeGapLedger";
import { VisitorPathwayTracker } from "./VisitorPathwayTracker";
import { AuraDialPad } from "./AuraDialPad"; // WELDED: New physical dialer
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
    Phone, 
    Brain, 
    Users, 
    Activity, 
    LayoutDashboard, 
    ShieldCheck, 
    Zap,
    Mic2
} from "lucide-react";

export default function ConciergeDashboard({ businessId }: { businessId: string }) {
    const supabase = createClient();

    // LIVE SIGNAL AUDIT: Fetches active visitor count for the header
    const { data: visitorCount } = useQuery({
        queryKey: ['live_visitor_count', businessId],
        queryFn: async () => {
            const { count } = await supabase
                .from('crm_visitor_logs')
                .select('*', { count: 'exact', head: true })
                .eq('business_id', businessId)
                .eq('is_active', true);
            return count || 0;
        },
        refetchInterval: 5000 // High-velocity refresh
    });

    return (
        <div className="p-8 bg-[#F8FAFC] min-h-screen space-y-8">
            {/* --- EXECUTIVE HEADER --- */}
            <div className="flex justify-between items-start">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
                            <LayoutDashboard size={24} />
                        </div>
                        <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Receptionist Intelligence</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <p className="text-slate-500 font-medium max-w-xl">
                            Autonomous monitoring of all voice communications, visitor pathways, and knowledge acquisition loops.
                        </p>
                        <div className="h-4 w-[1px] bg-slate-200" />
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
                            <ShieldCheck size={14} /> Sovereign Protocol Active
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-end">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Network Pulse</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-slate-900 tabular-nums">Stable</span>
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                        </div>
                    </div>
                </div>
            </div>

            {/* --- CORE COMMAND TABS --- */}
            <Tabs defaultValue="voice" className="w-full">
                <TabsList className="bg-white border border-slate-200 p-1.5 h-16 rounded-[1.25rem] gap-2 shadow-sm">
                    <TabsTrigger value="voice" className="rounded-xl px-10 font-bold text-xs uppercase tracking-widest transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-xl">
                        <Phone size={16} className="mr-2" /> Voice Registry
                    </TabsTrigger>
                    
                    <TabsTrigger value="intelligence" className="rounded-xl px-10 font-bold text-xs uppercase tracking-widest transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-xl">
                        <Brain size={16} className="mr-2" /> Neural Training
                    </TabsTrigger>
                    
                    <TabsTrigger value="visitors" className="rounded-xl px-10 font-bold text-xs uppercase tracking-widest transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-xl relative">
                        <Users size={16} className="mr-2" /> Web Visitors
                        {Number(visitorCount) > 0 && (
                            <Badge className="absolute -top-1 -right-1 bg-blue-600 text-white border-2 border-white text-[9px] font-black h-5 w-5 flex items-center justify-center p-0">
                                {visitorCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* --- SIGNAL STREAM: VOICE & DIAL-PAD WELD --- */}
                <TabsContent value="voice" className="mt-8 outline-none ring-0">
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                        {/* LEFT: DIAL COMMAND CENTER */}
                        <div className="xl:col-span-4 space-y-6">
                            <AuraDialPad />
                            
                            <div className="p-6 bg-blue-600 rounded-[2.5rem] text-white shadow-2xl shadow-blue-100 relative overflow-hidden group">
                                <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform">
                                    <Mic2 size={120} />
                                </div>
                                <h4 className="font-black uppercase text-xs tracking-widest mb-3 flex items-center gap-2">
                                    <Zap size={14} className="fill-white" /> Operator Pro-Tip
                                </h4>
                                <p className="text-sm font-medium opacity-90 leading-relaxed relative z-10">
                                    Aura can intelligently navigate IVR menus (e.g., "Press 1 for Sales") if you specify the pathway in the Context Seal before dialing.
                                </p>
                            </div>
                        </div>

                        {/* RIGHT: REGISTRY LEDGER */}
                        <div className="xl:col-span-8">
                            <TelephonyLogs businessId={businessId} />
                        </div>
                    </div>
                </TabsContent>

                {/* --- SIGNAL STREAM: NEURAL GAPS --- */}
                <TabsContent value="intelligence" className="mt-8 outline-none ring-0">
                    <KnowledgeGapLedger businessId={businessId} />
                </TabsContent>
                
                {/* --- SIGNAL STREAM: LIVE WEB TRAFFIC --- */}
                <TabsContent value="visitors" className="mt-8 outline-none ring-0">
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <div className="space-y-1">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                    <Zap size={18} className="text-blue-600 fill-blue-600" /> Live Traffic Handshake
                                </h3>
                                <p className="text-xs text-slate-500 font-medium italic">Signals representing real-time leads currently interacting with your digital pathways.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Channels</span>
                                <Badge variant="outline" className="bg-white border-slate-200 text-blue-600 font-bold text-[10px] px-3 py-1 rounded-lg">
                                    {visitorCount || 0} SIGNALS
                                </Badge>
                            </div>
                        </div>
                        
                        <VisitorPathwayTracker businessId={businessId} />
                    </div>
                </TabsContent>
            </Tabs>

            {/* --- FORENSIC FOOTER --- */}
            <div className="pt-8 opacity-40 flex items-center justify-center gap-4 text-slate-900">
                 <ShieldCheck size={14} />
                 <span className="text-[9px] font-black uppercase tracking-[0.4em]">
                    Aura Receptionist Engine v2.0 • Real-Time Comm-Audit Active
                 </span>
            </div>
        </div>
    );
}