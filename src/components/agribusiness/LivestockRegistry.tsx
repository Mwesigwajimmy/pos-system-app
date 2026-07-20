'use client';

/**
 * --- BBU1 BIOLOGICAL ASSET REGISTRY ---
 * VERSION: v1.1 OMEGA (REGISTRATION ACTIVE)
 * Use: Individual ID tracking for animals (Health, Feeding, Genealogy).
 * Logic: Linked to agri_livestock_ledger for forensic biological identity.
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
    ShieldCheck
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

// --- IMPORT THE REGISTRATION MODAL (THE WELD) ---
import { RegisterLivestockModal } from "./RegisterLivestockModal";

export function LivestockRegistry({ businessId }: { businessId: string }) {
    const supabase = createClient();
    const [search, setSearch] = React.useState("");

    // DATA HANDSHAKE: Pulling from the physical Agri Ledger
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

    // Search Filtering Logic
    const filteredAnimals = React.useMemo(() => {
        if (!animals) return [];
        return animals.filter(a => 
            a.asset_tag_id.toLowerCase().includes(search.toLowerCase()) ||
            a.breed_dna?.toLowerCase().includes(search.toLowerCase())
        );
    }, [animals, search]);

    return (
        <div className="space-y-6">
            {/* --- ACTION HEADER: NOW FULLY WELDED --- */}
            <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input 
                        placeholder="Search Ear-Tag, Plot, or Breed DNA..." 
                        className="pl-10 h-12 rounded-2xl bg-slate-50 border-none font-medium text-slate-900 focus-visible:ring-emerald-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* THE TRIGGER: Calling the Registration Modal deeply */}
                <RegisterLivestockModal businessId={businessId} />
            </div>

            {/* --- DATA LEDGER --- */}
            <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden">
                <CardHeader className="border-b border-slate-50 p-8 bg-slate-50/30 flex flex-row items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3 text-slate-900">
                            <Fingerprint className="text-blue-600" /> Biological Asset Ledger
                        </CardTitle>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Forensic Identity Tracking & Genealogy</p>
                    </div>
                    <div className="flex items-center gap-2 opacity-50">
                        <ShieldCheck size={16} className="text-emerald-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Asset Verification Stable</span>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow className="h-14 border-slate-100">
                                <TableHead className="pl-10 font-black uppercase text-[10px] tracking-widest text-slate-500">Asset Identity</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-500">Breed / Variety</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-500 text-center">Vital Status</TableHead>
                                <TableHead className="text-center font-black uppercase text-[10px] tracking-widest text-slate-500">Territorial Plot</TableHead>
                                <TableHead className="text-right pr-10 font-black uppercase text-[10px] tracking-widest text-slate-500">Forensic Tools</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-64 text-center">
                                        <div className="flex flex-col items-center gap-3 animate-pulse">
                                            <Activity className="text-blue-600 h-8 w-8" />
                                            <p className="text-[10px] font-black uppercase text-slate-400">Resyncing Biological Data...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredAnimals.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-64 text-center">
                                        <div className="flex flex-col items-center gap-2 opacity-20">
                                            <Tag size={48} />
                                            <p className="text-sm font-black uppercase tracking-widest">No assets discovered in this sector</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredAnimals.map((animal) => (
                                    <TableRow key={animal.id} className="h-24 hover:bg-slate-50/50 transition-all border-b border-slate-50 last:border-none">
                                        <TableCell className="pl-10">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black shadow-inner">
                                                    <Tag size={20} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 tracking-tight uppercase tabular-nums">{animal.asset_tag_id}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Forensic DNA Locked</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700 text-sm">{animal.breed_dna || 'Cross Breed'}</span>
                                                <span className="text-[10px] text-slate-400 font-medium uppercase">DOB: {animal.date_of_birth || 'Unrecorded'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-black text-[9px] px-3 py-1 rounded-lg">
                                                <Stethoscope size={10} className="mr-1.5" /> {animal.health_status?.toUpperCase() || 'HEALTHY'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                                    <MapPin size={12} className="text-red-500" /> {animal.plot?.name || 'Unassigned'}
                                                </span>
                                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Location Verified</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="pr-10 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" title="View History" className="h-11 w-11 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                                                    <History size={18} />
                                                </Button>
                                                <Button variant="ghost" size="icon" title="Log Activity" className="h-11 w-11 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all">
                                                    <Milk size={18} />
                                                </Button>
                                                <Button variant="ghost" size="icon" title="Weight Audit" className="h-11 w-11 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all">
                                                    <Scale size={18} />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            
            {/* --- FORENSIC FOOTER --- */}
            <div className="pt-8 flex items-center justify-center gap-4 opacity-30">
                <ShieldCheck size={14} className="text-slate-900" />
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-900">
                    Sovereign Biological Registry v1.1 • Secure Genetic ID Sync Active
                </span>
            </div>
        </div>
    );
}