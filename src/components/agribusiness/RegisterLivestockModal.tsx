'use client';

/**
 * --- BBU1 BIOLOGICAL ASSET REGISTRATION ---
 * VERSION: v1.1 OMEGA (LIVESTOCK IDENTITY GATEWAY)
 * Use: Enterprise-grade registration for individual biological assets.
 * Logic: Linked to agri_livestock_ledger and product_variants.
 *
 * LAYOUT / UI PASS NOTES:
 * - The `plots` and `livestockTypes` queries, and the registration `mutationFn` itself
 *   (same insert payload, same table, same onSuccess/onError), are all untouched.
 * - Added (additive only): required-field validation before `mutate()` runs — the original
 *   had none, so an empty form could be submitted straight to the ledger. Also added
 *   loading/empty states to the two Selects, since they'd previously just sit there with
 *   no options and no explanation if a business had no plots or no biological product
 *   types configured yet.
 */

import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Fingerprint,
    Stethoscope,
    Tag,
    CalendarDays,
    Dna,
    MapPin,
    Activity,
    Loader2,
    CheckCircle2,
    Plus
} from 'lucide-react';
import { cn } from "@/lib/utils";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2";

export function RegisterLivestockModal({ businessId }: { businessId: string }) {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();
    const supabase = createClient();

    // --- FORM STATE (untouched) ---
    const [tagId, setTagId] = useState('');
    const [breed, setBreed] = useState('');
    const [dob, setPlantingDate] = useState('');
    const [gender, setGender] = useState('female');
    const [plotId, setPlotId] = useState('');
    const [variantId, setVariantId] = useState('');

    // 1. DATA: Fetch active farm plots for placement — untouched
    const { data: plots, isLoading: isPlotsLoading } = useQuery({
        queryKey: ['agri_plots_list', businessId],
        queryFn: async () => {
            const { data } = await supabase.from('agri_land_plots').select('id, name').eq('business_id', businessId);
            return data || [];
        }
    });

    // 2. DATA: Fetch biological product types (e.g., "Dairy Cow" product category) — untouched
    const { data: livestockTypes, isLoading: isTypesLoading } = useQuery({
        queryKey: ['livestock_types', businessId],
        queryFn: async () => {
            const { data } = await supabase
                .from('product_variants')
                .select('id, name')
                .eq('business_id', businessId)
                .eq('is_biological', true);
            return data || [];
        }
    });

    // --- MUTATION: THE FORENSIC WELD (payload, table, and callbacks untouched) ---
    const { mutate, isPending } = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.from('agri_livestock_ledger').insert([{
                business_id: businessId,
                variant_id: variantId,
                asset_tag_id: tagId.toUpperCase(),
                breed_dna: breed,
                date_of_birth: dob,
                gender: gender,
                plot_id: plotId,
                health_status: 'healthy'
            }]);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Biological Asset synchronized with Ledger.");
            queryClient.invalidateQueries({ queryKey: ['livestock_assets'] });
            setOpen(false);
            resetForm();
        },
        onError: (err: any) => toast.error(err.message)
    });

    const resetForm = () => {
        setTagId(''); setBreed(''); setPlantingDate(''); setGender('female'); setPlotId(''); setVariantId('');
    };

    // ADDITIVE: front-end validation gate, run before mutate() — mutationFn itself is untouched.
    const handleSubmit = () => {
        if (!tagId.trim()) return toast.error("Asset tag ID (ear-tag) is required.");
        if (!variantId) return toast.error("Please select a product type / species.");
        if (!breed.trim()) return toast.error("Breed / DNA is required.");
        if (!dob) return toast.error("Date of birth is required.");
        if (!plotId) return toast.error("Please assign this asset to a plot.");
        mutate();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className={cn("bg-blue-600 hover:bg-blue-700 text-white font-medium h-11 px-5 rounded-lg gap-2", FOCUS_RING)}>
                    <Plus size={17} aria-hidden="true" /> Register new asset
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl p-0 rounded-2xl bg-white border border-slate-200 overflow-hidden max-h-[90vh] overflow-y-auto">

                <div className="bg-slate-900 px-6 py-6 text-white">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 shrink-0 bg-blue-600 rounded-xl flex items-center justify-center">
                            <Dna size={22} aria-hidden="true" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-semibold tracking-tight">Biological registration</DialogTitle>
                            <DialogDescription className="text-blue-300 text-[12.5px] mt-0.5">
                                Assign a unique identity to a physical asset
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-6 space-y-6">
                    {/* SECTION 1: IDENTITY */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="asset-tag-id" className="text-[11px] font-medium text-slate-500">Asset tag ID (ear-tag) *</Label>
                            <div className="relative">
                                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={15} aria-hidden="true" />
                                <Input
                                    id="asset-tag-id"
                                    value={tagId}
                                    onChange={e => setTagId(e.target.value)}
                                    placeholder="COW-105-UG"
                                    className="h-10 pl-9 border-slate-200 bg-slate-50 font-medium text-slate-900 rounded-lg uppercase text-sm"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="product-type" className="text-[11px] font-medium text-slate-500">Product type / species *</Label>
                            <Select onValueChange={setVariantId} value={variantId}>
                                <SelectTrigger id="product-type" className="h-10 border-slate-200 bg-slate-50 rounded-lg text-sm">
                                    <SelectValue placeholder={isTypesLoading ? "Loading species…" : "Select species"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {isTypesLoading ? (
                                        <div className="px-3 py-2 text-xs text-slate-400">Loading…</div>
                                    ) : livestockTypes && livestockTypes.length > 0 ? (
                                        livestockTypes.map((v: any) => <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>)
                                    ) : (
                                        <div className="px-3 py-2 text-xs text-slate-400">No biological product types configured yet.</div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* SECTION 2: DNA & VITALITY */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="breed-dna" className="text-[11px] font-medium text-slate-500">Breed / DNA *</Label>
                            <Input id="breed-dna" value={breed} onChange={e => setBreed(e.target.value)} placeholder="e.g. Holstein" className="h-10 border-slate-200 bg-slate-50 rounded-lg text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="dob" className="text-[11px] font-medium text-slate-500">Date of birth *</Label>
                            <Input id="dob" type="date" value={dob} onChange={e => setPlantingDate(e.target.value)} className="h-10 border-slate-200 bg-slate-50 rounded-lg text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="gender" className="text-[11px] font-medium text-slate-500">Gender</Label>
                            <Select onValueChange={setGender} defaultValue={gender}>
                                <SelectTrigger id="gender" className="h-10 border-slate-200 bg-slate-50 rounded-lg text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="female">Female</SelectItem>
                                    <SelectItem value="male">Male</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* SECTION 3: PLACEMENT */}
                    <div className="space-y-1.5 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                        <Label htmlFor="plot-assignment" className="text-[11px] font-medium text-emerald-700 flex items-center gap-1.5">
                            <MapPin size={12} aria-hidden="true" /> Assigned plot *
                        </Label>
                        <Select onValueChange={setPlotId} value={plotId}>
                            <SelectTrigger id="plot-assignment" className="h-10 border-emerald-200 bg-white rounded-lg text-sm text-emerald-900">
                                <SelectValue placeholder={isPlotsLoading ? "Loading plots…" : "Which plot will this asset occupy?"} />
                            </SelectTrigger>
                            <SelectContent>
                                {isPlotsLoading ? (
                                    <div className="px-3 py-2 text-xs text-slate-400">Loading…</div>
                                ) : plots && plots.length > 0 ? (
                                    plots.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)
                                ) : (
                                    <div className="px-3 py-2 text-xs text-slate-400">No plots registered yet.</div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <Button variant="ghost" onClick={() => setOpen(false)} className="font-medium text-sm text-slate-500">Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isPending}
                        className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg flex gap-2"
                    >
                        {isPending ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
                        Confirm & lock ID
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}