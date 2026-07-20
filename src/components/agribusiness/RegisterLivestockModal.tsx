'use client';

/**
 * --- BBU1 BIOLOGICAL ASSET REGISTRATION ---
 * VERSION: v1.0 OMEGA (LIVESTOCK IDENTITY GATEWAY)
 * Use: Enterprise-grade registration for individual biological assets.
 * Logic: Linked to agri_livestock_ledger and product_variants.
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

export function RegisterLivestockModal({ businessId }: { businessId: string }) {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();
    const supabase = createClient();

    // --- FORM STATE ---
    const [tagId, setTagId] = useState('');
    const [breed, setBreed] = useState('');
    const [dob, setPlantingDate] = useState('');
    const [gender, setGender] = useState('female');
    const [plotId, setPlotId] = useState('');
    const [variantId, setVariantId] = useState('');

    // 1. DATA: Fetch active farm plots for placement
    const { data: plots } = useQuery({
        queryKey: ['agri_plots_list', businessId],
        queryFn: async () => {
            const { data } = await supabase.from('agri_land_plots').select('id, name').eq('business_id', businessId);
            return data || [];
        }
    });

    // 2. DATA: Fetch biological product types (e.g., "Dairy Cow" product category)
    const { data: livestockTypes } = useQuery({
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

    // --- MUTATION: THE FORENSIC WELD ---
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
        setTagId(''); setBreed(''); setPlantingDate(''); setPlotId(''); setVariantId('');
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 px-8 rounded-2xl shadow-lg shadow-blue-100 gap-3">
                    <Plus size={20} /> Register New Asset
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl p-0 border-none rounded-[2.5rem] shadow-3xl bg-white overflow-hidden">
                
                <div className="bg-slate-900 p-8 text-white">
                    <div className="flex items-center gap-6">
                        <div className="h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl">
                            <Dna size={32} />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-black uppercase tracking-tight">Biological Registration</DialogTitle>
                            <DialogDescription className="text-blue-400 font-bold uppercase text-[10px] tracking-widest mt-1">
                                Assigning Unique Identity to Physical Asset
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                <div className="p-10 space-y-8">
                    {/* SECTION 1: IDENTITY */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Tag ID (Ear-Tag)</Label>
                            <div className="relative">
                                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                <Input value={tagId} onChange={e => setTagId(e.target.value)} placeholder="COW-105-UG" className="h-12 pl-10 border-slate-100 bg-slate-50 font-black text-slate-900 rounded-xl uppercase" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Type</Label>
                            <Select onValueChange={setVariantId}>
                                <SelectTrigger className="h-12 border-slate-100 bg-slate-50 rounded-xl font-bold">
                                    <SelectValue placeholder="Select Species" />
                                </SelectTrigger>
                                <SelectContent>
                                    {livestockTypes?.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* SECTION 2: DNA & VITALITY */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Breed / DNA</Label>
                            <Input value={breed} onChange={e => setBreed(e.target.value)} placeholder="e.g. Holstein" className="h-12 border-slate-100 bg-slate-50 font-bold rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date of Birth</Label>
                            <Input type="date" value={dob} onChange={e => setPlantingDate(e.target.value)} className="h-12 border-slate-100 bg-slate-50 font-bold rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gender</Label>
                            <Select onValueChange={setGender} defaultValue={gender}>
                                <SelectTrigger className="h-12 border-slate-100 bg-slate-50 rounded-xl font-bold">
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
                    <div className="space-y-2 p-6 bg-emerald-50/50 border border-emerald-100 rounded-[1.5rem]">
                        <Label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <MapPin size={12} /> Territorial Anchor (Assigned Plot)
                        </Label>
                        <Select onValueChange={setPlotId}>
                            <SelectTrigger className="h-12 border-emerald-200 bg-white rounded-xl font-bold text-emerald-900">
                                <SelectValue placeholder="Which acre will this asset occupy?" />
                            </SelectTrigger>
                            <SelectContent>
                                {plots?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <Button variant="ghost" onClick={() => setOpen(false)} className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Cancel</Button>
                    <Button onClick={() => mutate()} disabled={isPending} className="h-14 px-12 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-2xl shadow-blue-200 flex gap-3">
                        {isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18} />}
                        Confirm & Lock ID
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}