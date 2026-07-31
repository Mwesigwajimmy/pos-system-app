'use client';

/**
 * --- BBU1 BIOLOGICAL GROWTH ENGINE ---
 * VERSION: v2.0 OMEGA (VALUE TRANSFORMATION)
 * Use: Monitors inputs (Burn Rate) vs. Projected Yield for Crops/Livestock.
 * Logic: Linked to agri_production_batches and mfg_production_ingredient_logs.
 *
 * HONEST NOTE ON THIS PASS:
 * The original file had zero data wiring — `businessId` was accepted as a prop but never
 * used anywhere, and every number on screen ("Batch: Maize-Alpha-24", "72%", "450 kg",
 * "UGX 4.2M", etc.) was hardcoded. There was no missing *field* to add so much as an
 * entire missing *data layer*, so that's what this pass adds: two real Supabase queries
 * (production batches + ingredient logs) with the maturity %, burn totals, WIP valuation,
 * and yield projection all now computed from that data instead of typed in by hand.
 *
 * Table/column names below (agri_production_batches, mfg_production_ingredient_logs, and
 * their columns) are my best inference from the comment header and the sibling
 * AgriPlotManager file — I don't have your actual schema. If a column name doesn't match
 * your database, the fix is a one-line swap in the two queries below; nothing else in the
 * component depends on the exact names.
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
    Zap,
    Droplets,
    CloudRain,
    ArrowRight,
    TrendingUp,
    CircleDollarSign,
    PackageSearch,
    Dna,
    Loader2,
    Sprout
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const GROWTH_STAGES = ['Seedling', 'Vegetative', 'Flowering', 'Harvest'];

// Maps a 0-100 maturity index onto the 4 discrete stage markers above.
const stageIndexFromPct = (pct: number) => {
    if (pct >= 90) return 3;
    if (pct >= 50) return 2;
    if (pct >= 20) return 1;
    return 0;
};

const formatMoney = (n: number) => `UGX ${Math.round(n).toLocaleString()}`;

export function BiologicalGrowthEngine({ businessId }: { businessId: string }) {
    const supabase = createClient();

    // ACTIVE GROWTH CYCLES — real batches for this business, joined to their plot.
    const { data: batches, isLoading: isBatchesLoading } = useQuery({
        queryKey: ['growth_engine_batches', businessId],
        enabled: !!businessId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('agri_production_batches')
                .select('*, agri_land_plots(name)')
                .eq('business_id', businessId)
                .eq('status', 'active')
                .order('planting_date', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    const batchIds = React.useMemo(() => (batches || []).map((b: any) => b.id), [batches]);

    // INPUT CONSUMPTION ("BURN") — every logged ingredient application for these batches.
    const { data: ingredientLogs, isLoading: isLogsLoading } = useQuery({
        queryKey: ['growth_engine_ingredient_logs', batchIds],
        enabled: batchIds.length > 0,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('mfg_production_ingredient_logs')
                .select('*')
                .in('batch_id', batchIds);
            if (error) throw error;
            return data || [];
        }
    });

    const isLoading = isBatchesLoading || (batchIds.length > 0 && isLogsLoading);

    // Per-batch derived metrics: maturity %, current stage, and burn totals by input category.
    const enrichedBatches = React.useMemo(() => {
        return (batches || []).map((batch: any) => {
            let maturityPct = Number(batch.maturity_percentage);
            if (!Number.isFinite(maturityPct)) {
                if (batch.planting_date && batch.expected_harvest_date) {
                    const start = new Date(batch.planting_date).getTime();
                    const end = new Date(batch.expected_harvest_date).getTime();
                    const now = Date.now();
                    maturityPct = end > start ? Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100)) : 0;
                } else {
                    maturityPct = 0;
                }
            }

            const logs = (ingredientLogs || []).filter((l: any) => l.batch_id === batch.id);
            const fertilizerQty = logs
                .filter((l: any) => (l.input_category || '').toLowerCase().includes('fertil'))
                .reduce((sum: number, l: any) => sum + (Number(l.quantity_applied) || 0), 0);
            const medicalUnits = logs
                .filter((l: any) => ['medical', 'pesticide', 'medicine'].some(k => (l.input_category || '').toLowerCase().includes(k)))
                .reduce((sum: number, l: any) => sum + (Number(l.quantity_applied) || 0), 0);
            const wipValuation = logs.reduce((sum: number, l: any) => sum + (Number(l.cost) || 0), 0);

            return { ...batch, maturityPct, fertilizerQty, medicalUnits, wipValuation, logCount: logs.length };
        });
    }, [batches, ingredientLogs]);

    // Portfolio-level yield projection, aggregated across all active batches.
    const projection = React.useMemo(() => {
        const list = enrichedBatches;
        const projectedQty = list.reduce((sum, b: any) => sum + (Number(b.projected_yield_qty) || 0), 0);
        const withCost = list.filter((b: any) => Number(b.cost_per_unit) > 0);
        const withMarket = list.filter((b: any) => Number(b.market_price_per_unit) > 0);
        const avgCost = withCost.length ? withCost.reduce((s: number, b: any) => s + Number(b.cost_per_unit), 0) / withCost.length : 0;
        const avgMarket = withMarket.length ? withMarket.reduce((s: number, b: any) => s + Number(b.market_price_per_unit), 0) / withMarket.length : 0;
        const margin = avgMarket > 0 ? ((avgMarket - avgCost) / avgMarket) * 100 : 0;
        const unit = list[0]?.projected_yield_unit || 'units';
        return { projectedQty, avgCost, avgMarket, margin, unit, hasData: withCost.length > 0 && withMarket.length > 0 };
    }, [enrichedBatches]);

    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

            {/* ============================= LIVE PRODUCTION TRACKER ============================= */}
            <div className="xl:col-span-8 space-y-6">
                <Card className="border border-slate-200 rounded-xl overflow-hidden shadow-none">
                    <CardHeader className="bg-slate-900 text-white px-6 py-5">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Dna className="text-purple-400" size={18} aria-hidden="true" /> Active growth cycles
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="p-6 space-y-8">
                        {isLoading ? (
                            <div className="py-14 text-center text-slate-400">
                                <Loader2 className="animate-spin inline mr-2" size={16} aria-hidden="true" />
                                <span className="text-sm font-medium">Loading active growth cycles…</span>
                            </div>
                        ) : enrichedBatches.length === 0 ? (
                            <div className="py-14 text-center text-slate-400">
                                <Sprout size={28} className="mx-auto mb-3" aria-hidden="true" />
                                <p className="text-sm font-medium">No active growth cycles for this business yet.</p>
                            </div>
                        ) : (
                            enrichedBatches.map((batch: any, idx: number) => {
                                const activeStage = stageIndexFromPct(batch.maturityPct);
                                return (
                                    <div key={batch.id} className={cn("space-y-6", idx > 0 && "pt-8 border-t border-slate-100")}>
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
                                            <div>
                                                <h4 className="text-lg font-semibold text-slate-900 tracking-tight">
                                                    {batch.variety_breed || batch.name || 'Unnamed batch'}
                                                </h4>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    {batch.planting_date ? `Planted ${new Date(batch.planting_date).toLocaleDateString()}` : 'Planting date not logged'}
                                                    {' · '}
                                                    {batch.agri_land_plots?.name ? `Plot: ${batch.agri_land_plots.name}` : 'Plot unassigned'}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="text-2xl font-semibold text-blue-600 font-mono tabular-nums">{Math.round(batch.maturityPct)}%</span>
                                                <p className="text-[11px] text-slate-400">Maturity index</p>
                                            </div>
                                        </div>

                                        <div className="relative pb-6">
                                            <Progress value={batch.maturityPct} className="h-2.5 bg-slate-100 rounded-full" />
                                            <div className="absolute top-5 left-0 w-full flex justify-between">
                                                {GROWTH_STAGES.map((stage, i) => (
                                                    <div key={i} className="flex flex-col items-center gap-1.5">
                                                        <div className={cn("h-2.5 w-2.5 rounded-full border-2 border-white shadow-sm", i <= activeStage ? "bg-emerald-500" : "bg-slate-200")} />
                                                        <span className={cn("text-[10px]", i <= activeStage ? "text-emerald-600 font-medium" : "text-slate-400")}>{stage}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                                <Droplets className="text-blue-500 mb-2" size={18} aria-hidden="true" />
                                                <p className="text-[11px] text-blue-500 font-medium">Fertilizer burn</p>
                                                <p className="text-sm font-semibold text-slate-900">
                                                    {batch.fertilizerQty > 0 ? `${batch.fertilizerQty.toLocaleString()} kg applied` : 'No logs yet'}
                                                </p>
                                            </div>
                                            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                                                <Zap className="text-purple-500 mb-2" size={18} aria-hidden="true" />
                                                <p className="text-[11px] text-purple-500 font-medium">Medical inputs</p>
                                                <p className="text-sm font-semibold text-slate-900">
                                                    {batch.medicalUnits > 0 ? `${batch.medicalUnits.toLocaleString()} units applied` : 'No logs yet'}
                                                </p>
                                            </div>
                                            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                                <CircleDollarSign className="text-emerald-500 mb-2" size={18} aria-hidden="true" />
                                                <p className="text-[11px] text-emerald-500 font-medium">WIP valuation</p>
                                                <p className="text-sm font-semibold text-slate-900 tabular-nums">
                                                    {batch.wipValuation > 0 ? formatMoney(batch.wipValuation) : 'No cost logged yet'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ============================= SIDEBAR: HARVEST PROJECTION ============================= */}
            <div className="xl:col-span-4">
                <Card className="border border-slate-200 rounded-xl p-6 space-y-6 shadow-none sticky top-6">
                    <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-4">Yield prediction</h3>

                    {isLoading ? (
                        <div className="py-8 text-center text-slate-400 text-sm">
                            <Loader2 className="animate-spin inline mr-2" size={14} aria-hidden="true" /> Calculating…
                        </div>
                    ) : enrichedBatches.length === 0 ? (
                        <p className="text-sm text-slate-400 py-4">No active batches to project yield from.</p>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3.5">
                                <div className="h-11 w-11 rounded-lg bg-slate-900 flex items-center justify-center text-white shrink-0">
                                    <PackageSearch size={19} aria-hidden="true" />
                                </div>
                                <div>
                                    <p className="text-xl font-semibold text-slate-900 font-mono tabular-nums">
                                        {projection.projectedQty > 0 ? `~${projection.projectedQty.toLocaleString()} ${projection.unit}` : 'Not yet projected'}
                                    </p>
                                    <p className="text-[11px] text-slate-400">Projected finished stock</p>
                                </div>
                            </div>

                            {projection.hasData ? (
                                <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                                    <div className="flex justify-between items-center text-[11.5px]">
                                        <span className="text-slate-500">Avg. cost / unit</span>
                                        <span className="text-slate-900 font-medium">{formatMoney(projection.avgCost)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[11.5px]">
                                        <span className="text-slate-500">Avg. market price / unit</span>
                                        <span className="text-emerald-600 font-medium">{formatMoney(projection.avgMarket)}</span>
                                    </div>
                                    <div className="h-px bg-slate-200" />
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-900 font-medium">Projected margin</span>
                                        <span className="text-blue-600 font-semibold text-lg">{projection.margin.toFixed(0)}%</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-400">
                                    Cost and market price haven't been set on these batches yet, so margin can't be calculated.
                                </div>
                            )}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}