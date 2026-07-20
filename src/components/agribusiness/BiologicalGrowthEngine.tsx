'use client';

/**
 * --- BBU1 BIOLOGICAL GROWTH ENGINE ---
 * VERSION: v1.0 OMEGA (VALUE TRANSFORMATION)
 * Use: Monitors inputs (Burn Rate) vs. Projected Yield for Crops/Livestock.
 * Logic: Linked to mfg_production_ingredient_logs.
 */

import * as React from "react";
import { 
    Zap, 
    Droplets, 
    CloudRain, 
    ArrowRight, 
    TrendingUp, 
    CircleDollarSign,
    PackageSearch,
    Dna
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export function BiologicalGrowthEngine({ businessId }: { businessId: string }) {
    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* --- LIVE PRODUCTION TRACKER --- */}
            <div className="xl:col-span-8 space-y-8">
                <Card className="border-none shadow-3xl bg-white rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="bg-slate-900 text-white p-8">
                        <CardTitle className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
                            <Dna className="text-purple-400 animate-pulse" /> Active Growth Cycles
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-10">
                        {/* BATCH 1: MAIZE */}
                        <div className="space-y-6">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h4 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Batch: Maize-Alpha-24</h4>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Planted: 14 May 2026 • Location: Plot A</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-4xl font-black text-blue-600 font-mono tracking-tighter">72%</span>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Maturity Index</p>
                                </div>
                            </div>
                            
                            <div className="relative">
                                <Progress value={72} className="h-4 bg-slate-50 rounded-full" />
                                <div className="absolute top-8 left-0 w-full flex justify-between px-2">
                                    {['Seedling', 'Vegetative', 'Flowering', 'Harvest'].map((stage, i) => (
                                        <div key={i} className="flex flex-col items-center">
                                            <div className={cn("h-3 w-3 rounded-full mb-2 border-2 border-white shadow-sm", i <= 2 ? "bg-emerald-500" : "bg-slate-200")} />
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stage}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* --- INPUT CONSUMPTION WELD (THE "BURN") --- */}
                        <div className="pt-10 grid grid-cols-3 gap-6">
                            <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
                                <Droplets className="text-blue-500 mb-3" size={24} />
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Fertilizer Burn</p>
                                <p className="text-lg font-black text-slate-900">450 kg Applied</p>
                            </div>
                            <div className="p-6 bg-purple-50/50 rounded-3xl border border-purple-100">
                                <Zap className="text-purple-500 mb-3" size={24} />
                                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Medical Inputs</p>
                                <p className="text-lg font-black text-slate-900">12 Units (Sprayed)</p>
                            </div>
                            <div className="p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100">
                                <CircleDollarSign className="text-emerald-500 mb-3" size={24} />
                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">WIP Valuation</p>
                                <p className="text-lg font-black text-slate-900 tabular-nums">UGX 4.2M</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* --- SIDEBAR: HARVEST PROJECTION --- */}
            <div className="xl:col-span-4 space-y-6">
                <Card className="border-none shadow-2xl bg-white rounded-[2rem] p-8 space-y-6">
                    <h3 className="font-black text-slate-900 uppercase tracking-tight text-lg border-b border-slate-50 pb-4">Yield Prediction</h3>
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
                                <PackageSearch size={24} />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-slate-900 font-mono tracking-tighter">~450 Bags</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Projected Finished Stock</p>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 rounded-3xl space-y-4">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                <span className="text-slate-400">Current Cost/Bag</span>
                                <span className="text-slate-900">UGX 12,400</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                <span className="text-slate-400">Market Price/Bag</span>
                                <span className="text-emerald-600">UGX 65,000</span>
                            </div>
                            <div className="h-px bg-slate-200" />
                            <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest">
                                <span className="text-slate-900">Projected Margin</span>
                                <span className="text-blue-600 text-lg">82%</span>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}