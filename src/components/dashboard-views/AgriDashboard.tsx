'use client';

/**
 * --- BBU1 SOVEREIGN AGRI-EXECUTIVE HUD ---
 * VERSION: v1.0 OMEGA (DIRECTOR'S EYE)
 * Use: Global financial oversight of farm operations.
 */

import * as React from "react";
import { 
    TrendingUp, 
    ArrowUpRight, 
    AlertTriangle, 
    Target, 
    Activity, 
    Coins,
    MapPin,
    CalendarCheck
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AgriDashboard({ businessId }: { businessId: string }) {
    return (
        <div className="space-y-10">
            {/* --- TOP KPI ROW --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: "Aggregate Farm Value", value: "UGX 142M", icon: Coins, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Cumulative Expenses", value: "UGX 38.4M", icon: TrendingUp, color: "text-red-600", bg: "bg-red-50" },
                    { label: "Active Biologic Batches", value: "08 Units", icon: Sprout, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Mortality / Leakage", value: "4.2%", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
                ].map((kpi, i) => (
                    <Card key={i} className="border-none shadow-xl bg-white rounded-3xl">
                        <CardContent className="p-6 flex items-center gap-5">
                            <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shadow-inner", kpi.bg, kpi.color)}>
                                <kpi.icon size={28} />
                            </div>
                            <div className="flex flex-col">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                                <p className="text-2xl font-black text-slate-900 tracking-tighter">{kpi.value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* --- RECENT FIELD ACTIVITY (FORENSIC PROOF) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase px-2">Verified Field Activity</h2>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between group hover:border-blue-200 transition-all">
                                <div className="flex gap-6 items-center">
                                    <div className="h-16 w-16 rounded-2xl bg-slate-100 flex flex-col items-center justify-center text-slate-400 border border-slate-200 relative overflow-hidden">
                                        <MapPin size={24} />
                                        <span className="text-[8px] font-bold mt-1">GPS-TAG</span>
                                        <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                            <Maximize2 size={24} />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">Activity Complete: Application of Spray [A-04]</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
                                            Recorded by Manager John • Plot C • <Clock size={10} /> 12:42 PM
                                        </p>
                                    </div>
                                </div>
                                <Badge className="bg-emerald-50 text-emerald-700 border-none px-4 py-1.5 font-black text-[10px] rounded-xl uppercase">
                                    VERIFIED PROOF
                                </Badge>
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- CALENDAR / HARVEST ALERTS --- */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase px-2">Upcoming Harvests</h2>
                    <Card className="border-none shadow-2xl bg-slate-900 text-white rounded-[2.5rem] p-8">
                        <div className="space-y-8">
                            {[1, 2].map((i) => (
                                <div key={i} className="flex gap-4 items-start relative">
                                    {i === 1 && <div className="absolute left-[11px] top-10 w-[2px] h-10 bg-slate-700" />}
                                    <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0 border-4 border-slate-800">
                                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold">Maize Batch Alpha-24</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Expected Harvest: 14 Aug 2026</p>
                                        <Badge variant="outline" className="text-[9px] border-blue-600 text-blue-400 font-black mt-2">
                                            IN-PRODUCTION
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

const Sprout = ({ size, className }: { size: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M7 20h10"/><path d="M10 20c5.5-3 5.5-13 0-16"/><path d="M14 20c-5.5-3-5.5-13 0-16"/></svg>
);