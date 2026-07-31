'use client';

/**
 * --- BBU1 BIOLOGICAL ASSET REGISTRY ---
 * VERSION: v1.2 OMEGA (REGISTRATION ACTIVE)
 * Use: Individual ID tracking for animals (Health, Feeding, Genealogy).
 * Logic: Linked to agri_livestock_ledger for forensic biological identity.
 *
 * LAYOUT / UI PASS NOTES:
 * - The `animals` useQuery, the search filtering logic, and the RegisterLivestockModal
 *   integration are all untouched — same table, same filters, same queryKey.
 * - Bug fix (not a style change): `MapPin` was referenced in the table but never imported,
 *   which would throw `MapPin is not defined` the moment any row rendered. Added to imports.
 * - The three row actions (View history / Log activity / Weight audit) had no onClick in
 *   the original — they were visually present but did nothing. I haven't invented backing
 *   logic for those since I don't know your health-log/milk-log/weight-log tables; they're
 *   still inert here, same as before, just visually consistent. Say the word and I'll wire
 *   them up the same way I did the "Annex New Acreage" form once I know the target tables.
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
    Fingerprint,
    Stethoscope,
    Milk,
    Scale,
    History,
    Search,
    AlertCircle,
    UserPlus,
    Tag,
    Activity,
    ShieldCheck,
    MapPin
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// --- IMPORT THE REGISTRATION MODAL (THE WELD) ---
import { RegisterLivestockModal } from "./RegisterLivestockModal";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2";

export function LivestockRegistry({ businessId }: { businessId: string }) {
    const supabase = createClient();
    const [search, setSearch] = React.useState("");

    // DATA HANDSHAKE: Pulling from the physical Agri Ledger — untouched
    const { data: animals, isLoading } = useQuery({
        queryKey: ['livestock_assets', businessId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('agri_livestock_ledger')
                .select('*, plot:agri_land_plots(name)')
                .eq('business_id', businessId)
                .is('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        }
    });

    // Search filtering logic — untouched
    const filteredAnimals = React.useMemo(() => {
        if (!animals) return [];
        return animals.filter(a =>
            a.asset_tag_id.toLowerCase().includes(search.toLowerCase()) ||
            a.breed_dna?.toLowerCase().includes(search.toLowerCase())
        );
    }, [animals, search]);

    return (
        <div className="space-y-6">
            {/* ============================= ACTION HEADER ============================= */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
                <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} aria-hidden="true" />
                    <Input
                        placeholder="Search ear-tag, plot, or breed…"
                        aria-label="Search livestock by ear-tag, plot, or breed"
                        className="pl-10 h-11 rounded-lg bg-slate-50 border-slate-200 text-sm text-slate-900 focus-visible:ring-blue-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <RegisterLivestockModal businessId={businessId} />
            </div>

            {/* ============================= DATA LEDGER ============================= */}
            <Card className="border border-slate-200 rounded-xl overflow-hidden shadow-none">
                <CardHeader className="border-b border-slate-100 px-6 py-5 bg-slate-50 flex flex-row items-center justify-between gap-3">
                    <div className="space-y-1">
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-900">
                            <Fingerprint className="text-blue-600" size={18} aria-hidden="true" /> Biological asset ledger
                        </CardTitle>
                        <p className="text-[11px] text-slate-400">Identity tracking & genealogy</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
                        <ShieldCheck size={14} className="text-emerald-500" aria-hidden="true" />
                        <span className="text-[11px] font-medium">Verification stable</span>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/60">
                                <TableRow className="h-12 border-slate-100">
                                    <TableHead className="pl-6 font-medium text-[11px] uppercase tracking-wide text-slate-500">Asset identity</TableHead>
                                    <TableHead className="font-medium text-[11px] uppercase tracking-wide text-slate-500">Breed / variety</TableHead>
                                    <TableHead className="font-medium text-[11px] uppercase tracking-wide text-slate-500 text-center">Health status</TableHead>
                                    <TableHead className="font-medium text-[11px] uppercase tracking-wide text-slate-500 text-center">Plot</TableHead>
                                    <TableHead className="text-right pr-6 font-medium text-[11px] uppercase tracking-wide text-slate-500">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-56 text-center">
                                            <div className="flex flex-col items-center gap-2.5 text-slate-400">
                                                <Activity className="animate-pulse" size={22} aria-hidden="true" />
                                                <p className="text-sm font-medium">Loading livestock records…</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredAnimals.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-56 text-center">
                                            <div className="flex flex-col items-center gap-2 text-slate-300">
                                                <Tag size={32} aria-hidden="true" />
                                                <p className="text-sm font-medium text-slate-400">No assets found for this search.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredAnimals.map((animal: any) => (
                                        <TableRow key={animal.id} className="h-[76px] hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-none">
                                            <TableCell className="pl-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 shrink-0 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                        <Tag size={17} aria-hidden="true" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-slate-900 text-[13.5px] tabular-nums">{animal.asset_tag_id}</span>
                                                        <span className="text-[10.5px] text-slate-400">ID verified</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-700 text-[13px]">{animal.breed_dna || 'Cross breed'}</span>
                                                    <span className="text-[11px] text-slate-400">DOB: {animal.date_of_birth || 'Unrecorded'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium text-[11px] px-2.5 py-1 rounded-md capitalize">
                                                    <Stethoscope size={11} className="mr-1.5" aria-hidden="true" /> {animal.health_status || 'Healthy'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-[12.5px] font-medium text-slate-600 flex items-center justify-center gap-1.5">
                                                    <MapPin size={12} className="text-red-500" aria-hidden="true" /> {animal.plot?.name || 'Unassigned'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="pr-6 text-right">
                                                <div className="flex justify-end gap-1.5">
                                                    <Button variant="ghost" size="icon" title="View history" aria-label={`View history for ${animal.asset_tag_id}`} className={cn("h-9 w-9 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50", FOCUS_RING)}>
                                                        <History size={16} aria-hidden="true" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" title="Log activity" aria-label={`Log activity for ${animal.asset_tag_id}`} className={cn("h-9 w-9 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50", FOCUS_RING)}>
                                                        <Milk size={16} aria-hidden="true" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" title="Weight audit" aria-label={`Weight audit for ${animal.asset_tag_id}`} className={cn("h-9 w-9 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50", FOCUS_RING)}>
                                                        <Scale size={16} aria-hidden="true" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* ============================= FOOTER ============================= */}
            <div className="pt-2 flex items-center justify-center gap-2 text-slate-300">
                <ShieldCheck size={12} aria-hidden="true" />
                <span className="text-[10.5px] font-medium tracking-wide">
                    Sovereign biological registry v1.2 · Secure genetic ID sync active
                </span>
            </div>
        </div>
    );
}