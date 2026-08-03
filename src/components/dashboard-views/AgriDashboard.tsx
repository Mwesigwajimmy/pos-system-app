'use client';

/**
 * --- BBU1 SOVEREIGN AGRI-EXECUTIVE HUD ---
 * VERSION: v1.1 OMEGA (DIRECTOR'S EYE — CRASH FIX & CLEANUP)
 * Use: Global financial oversight of farm operations.
 *
 * NOTE: `businessId` is accepted but the KPI / activity / harvest data below
 * is still static placeholder content — it isn't queried yet. The shapes are
 * kept in named constants so wiring in a live Supabase query later is a
 * drop-in replacement rather than a rewrite.
 */

import * as React from "react";
import {
    TrendingUp,
    ArrowUpRight,
    AlertTriangle,
    Activity,
    Coins,
    MapPin,
    CalendarCheck,
    Maximize2,
    Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';

const Sprout = ({ size, className }: { size: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M7 20h10"/><path d="M10 20c5.5-3 5.5-13 0-16"/><path d="M14 20c-5.5-3-5.5-13 0-16"/></svg>
);

// MOCK DATA — replace with a live query keyed off `businessId`
const KPI_DATA = [
    { label: "Aggregate Farm Value", value: "UGX 142M", icon: Coins, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Cumulative Expenses", value: "UGX 38.4M", icon: TrendingUp, color: "text-red-600", bg: "bg-red-50" },
    { label: "Active Biologic Batches", value: "08 Units", icon: Sprout, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Mortality / Leakage", value: "4.2%", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
];

// MOCK DATA — replace with a live query keyed off `businessId`
const FIELD_ACTIVITY = [
    { id: 1, title: "Activity Complete: Application of Spray [A-04]", recordedBy: "Manager John", plot: "Plot C", time: "12:42 PM" },
    { id: 2, title: "Activity Complete: Irrigation Cycle [B-02]", recordedBy: "Manager John", plot: "Plot B", time: "10:15 AM" },
    { id: 3, title: "Activity Complete: Soil pH Calibration [C-01]", recordedBy: "Field Agent Amara", plot: "Plot A", time: "08:30 AM" },
];

// MOCK DATA — replace with a live query keyed off `businessId`
const UPCOMING_HARVESTS = [
    { id: 1, batch: "Maize Batch Alpha-24", expectedDate: "14 Aug 2026", status: "IN-PRODUCTION" },
    { id: 2, batch: "Bean Batch Delta-11", expectedDate: "29 Aug 2026", status: "IN-PRODUCTION" },
];

export default function AgriDashboard({ businessId }: { businessId: string }) {
    return (
        <div className="space-y-10">
            {/* --- TOP KPI ROW --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {KPI_DATA.map((kpi, i) => (
                    <Card key={i} className="border-none shadow-xl bg-white rounded-3xl">
                        <CardContent className="p-6 flex items-center gap-5">
                            <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shadow-inner shrink-0", kpi.bg, kpi.color)}>
                                <kpi.icon size={28} />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                                <p className="text-2xl font-black text-slate-900 tracking-tighter truncate">{kpi.value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* --- RECENT FIELD ACTIVITY (FORENSIC PROOF) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase px-2 flex items-center gap-3">
                        <Activity size={20} className="text-blue-600" /> Verified Field Activity
                    </h2>
                    <div className="space-y-4">
                        {FIELD_ACTIVITY.map((activity) => (
                            <div key={activity.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-blue-200 transition-all">
                                <div className="flex gap-6 items-center min-w-0">
                                    <div className="h-16 w-16 rounded-2xl bg-slate-100 flex flex-col items-center justify-center text-slate-400 border border-slate-200 relative overflow-hidden shrink-0">
                                        <MapPin size={24} />
                                        <span className="text-[8px] font-bold mt-1">GPS-TAG</span>
                                        <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer">
                                            <Maximize2 size={24} />
                                        </div>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-900">{activity.title}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2 mt-1 flex-wrap">
                                            Recorded by {activity.recordedBy} • {activity.plot} • <span className="inline-flex items-center gap-1"><Clock size={10} /> {activity.time}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                                    <Badge className="bg-emerald-50 text-emerald-700 border-none px-4 py-1.5 font-black text-[10px] rounded-xl uppercase">
                                        VERIFIED PROOF
                                    </Badge>
                                    <ArrowUpRight size={16} className="text-slate-200 group-hover:text-blue-500 transition-all group-hover:translate-x-1 group-hover:-translate-y-1" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- CALENDAR / HARVEST ALERTS --- */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase px-2 flex items-center gap-3">
                        <CalendarCheck size={20} className="text-blue-600" /> Upcoming Harvests
                    </h2>
                    <Card className="border-none shadow-2xl bg-slate-900 text-white rounded-[2.5rem] p-8">
                        <div className="space-y-8">
                            {UPCOMING_HARVESTS.map((harvest, i) => (
                                <div key={harvest.id} className="flex gap-4 items-start relative">
                                    {i < UPCOMING_HARVESTS.length - 1 && <div className="absolute left-[11px] top-10 w-[2px] h-10 bg-slate-700" />}
                                    <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0 border-4 border-slate-800">
                                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                    </div>
                                    <div className="space-y-1 min-w-0">
                                        <p className="text-sm font-bold">{harvest.batch}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Expected Harvest: {harvest.expectedDate}</p>
                                        <Badge variant="outline" className="text-[9px] border-blue-600 text-blue-400 font-black mt-2">
                                            {harvest.status}
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