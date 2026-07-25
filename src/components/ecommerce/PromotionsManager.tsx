'use client';

/**
 * --- BBU1 SOVEREIGN PROMOTIONS & COUPON MANAGER ---
 * VERSION: v11.0 OMEGA (REALTIME PROMO ENGINE & MULTI-REGION DISCOUNTS)
 * JURISDICTION: Unified Multi-Tenant Cloud / Enterprise Digital Commerce
 */

import React, { useState, useMemo, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

import { 
    Card, CardHeader, CardTitle, CardContent, CardDescription 
} from "@/components/ui/card";
import { 
    Table, TableHeader, TableRow, TableHead, TableBody, TableCell 
} from "@/components/ui/table";
import { 
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from "@/components/ui/dialog";
import { 
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Tag, Megaphone, Calendar, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

import { createPromotion, deletePromotion, PromotionFormValues } from "@/lib/ecommerce/actions/promotions";

const supabase = createClient();

// 1. STRICT TYPE DEFINITIONS
export interface Promotion {
  id: string;
  code: string;
  label: string;
  type: "Discount" | "Shipping" | "BOGO" | "Gift";
  value: string;
  currency?: string;
  region: string;
  active: boolean;
  validFrom: string;
  validTo: string;
  tenantId: string;
}

// CLIENT VALIDATION SCHEMA
const formSchema = z.object({
    code: z.string().min(3, "Code too short").transform(v => v.toUpperCase()),
    label: z.string().min(3, "Label required"),
    type: z.enum(["Discount", "Shipping", "BOGO", "Gift"]),
    value: z.string().min(1, "Value required"),
    region: z.string().min(2, "Region required"),
    currency: z.string().optional(),
    validFrom: z.string(),
    validTo: z.string(),
});

// SAFE DATE PARSER HELPER
const formatSafeDate = (dateStr?: string | null, pattern: string = 'MMM dd, yyyy') => {
    if (!dateStr) return 'N/A';
    try {
        const parsed = new Date(dateStr);
        if (isNaN(parsed.getTime())) return 'N/A';
        return format(parsed, pattern);
    } catch (e) {
        return 'N/A';
    }
};

export function PromotionsManager({ initialPromotions: propPromotions }: { initialPromotions?: Promotion[] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // 1. DATA: Identity Context & Currency
  const { data: profile } = useQuery({
    queryKey: ['active_profile_promotions_manager'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('profiles').select('*, business_name, currency, business_id').eq('id', user?.id).limit(1).single();
      return data;
    }
  });

  const activeBusinessId = profile?.business_id;
  const defaultCurrency = profile?.currency || 'UGX';

  // 2. DATA: Live Promotions Query from Supabase
  const { data: livePromotions, isLoading } = useQuery({
    queryKey: ['live_promotions_list', activeBusinessId],
    enabled: !propPromotions && !!activeBusinessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .or(`business_id.eq.${activeBusinessId},tenant_id.eq.${activeBusinessId}`)
        .order('created_at', { ascending: false });

      if (error) return [];

      return (data || []).map((p: any) => ({
        id: String(p.id),
        code: p.code || 'PROMO',
        label: p.label || p.name || 'Campaign Offer',
        type: (p.type || 'Discount') as Promotion['type'],
        value: String(p.value || '10%'),
        currency: p.currency || defaultCurrency,
        region: p.region || 'Global',
        active: p.is_active ?? true,
        validFrom: p.valid_from || p.created_at || new Date().toISOString(),
        validTo: p.valid_to || new Date(Date.now() + 30*24*60*60*1000).toISOString(),
        tenantId: activeBusinessId || ''
      })) as Promotion[];
    }
  });

  const activePromotionsList = useMemo(() => {
    return propPromotions || livePromotions || [];
  }, [propPromotions, livePromotions]);

  const form = useForm<PromotionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        type: "Discount",
        region: "Global",
        currency: defaultCurrency,
        validFrom: new Date().toISOString().split('T')[0],
        validTo: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]
    }
  });

  // MUTATION 1: Create Promotion
  const onSubmit = (data: PromotionFormValues) => {
    startTransition(async () => {
        try {
            // Direct Database Upsert Fallback if Server Action is Offline
            if (activeBusinessId) {
                await supabase.from('promotions').insert([{
                    business_id: activeBusinessId,
                    tenant_id: activeBusinessId,
                    code: data.code.toUpperCase(),
                    label: data.label,
                    type: data.type,
                    value: data.value,
                    region: data.region,
                    currency: data.currency || defaultCurrency,
                    valid_from: data.validFrom,
                    valid_to: data.validTo,
                    is_active: true
                }]);
            } else {
                await createPromotion(data);
            }

            toast.success('Promotion Sealed & Activated!');
            setOpen(false);
            form.reset();
            queryClient.invalidateQueries({ queryKey: ['live_promotions_list'] });
        } catch (err: any) {
            toast.error(`Promotion Creation Failed: ${err.message}`);
        }
    });
  };

  // MUTATION 2: Delete Promotion
  const handleDelete = (id: string) => {
      startTransition(async () => {
          try {
              if (activeBusinessId) {
                  await supabase.from('promotions').delete().eq('id', id);
              } else {
                  await deletePromotion(id);
              }
              toast.success("Promotion removed successfully.");
              queryClient.invalidateQueries({ queryKey: ['live_promotions_list'] });
          } catch (err: any) {
              toast.error(`Delete Failed: ${err.message}`);
          }
      });
  };

  return (
    <Card className="h-full border-slate-200 rounded-[2.5rem] shadow-xl bg-white overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
                <CardTitle className="flex items-center gap-3 text-xl font-black text-slate-900 uppercase tracking-tight">
                    <Megaphone className="h-6 w-6 text-blue-600" />
                    Promotion & Coupon Manager
                </CardTitle>
                <CardDescription className="text-xs font-medium text-slate-500">
                Configure multi-region discounts, shipping offers, and seasonal campaigns.
                </CardDescription>
            </div>
            
            {/* CREATE PROMOTION DIALOG */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg">
                        <Plus className="w-4 h-4 mr-2" /> Create Promotion
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-3xl">
                    <DialogHeader className="bg-slate-900 p-8 text-white text-center">
                        <Tag size={36} className="mx-auto mb-2 text-blue-400" />
                        <DialogTitle className="text-lg font-black uppercase tracking-wider">Add New Promotion</DialogTitle>
                        <DialogDescription className="text-slate-400 text-xs mt-1 uppercase font-medium">Create a new discount code or automated offer</DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-8 bg-white">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Promo Code *</Label>
                                <Input placeholder="SUMMER2026" {...form.register("code")} className="h-11 font-mono uppercase font-bold rounded-xl border-slate-200" />
                                {form.formState.errors.code && <p className="text-xs text-rose-600 font-bold">{form.formState.errors.code.message}</p>}
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Offer Type *</Label>
                                <Select onValueChange={(val: any) => form.setValue("type", val)} defaultValue="Discount">
                                    <SelectTrigger className="h-11 rounded-xl font-bold border-slate-200 text-xs">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Discount" className="font-bold text-xs">Percentage / Fixed Discount</SelectItem>
                                        <SelectItem value="Shipping" className="font-bold text-xs">Free Shipping</SelectItem>
                                        <SelectItem value="BOGO" className="font-bold text-xs">Buy One Get One (BOGO)</SelectItem>
                                        <SelectItem value="Gift" className="font-bold text-xs">Gift Voucher</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Internal Campaign Label *</Label>
                            <Input placeholder="e.g. Summer Sale Campaign" {...form.register("label")} className="h-11 rounded-xl font-bold border-slate-200" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Value *</Label>
                                <Input placeholder="e.g. 15% or 10000" {...form.register("value")} className="h-11 rounded-xl font-bold text-blue-600 border-slate-200" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Currency</Label>
                                <Input placeholder={defaultCurrency} {...form.register("currency")} className="h-11 font-mono uppercase font-bold rounded-xl border-slate-200" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Target Region *</Label>
                            <Input placeholder="Global, Uganda, Kenya, EU" {...form.register("region")} className="h-11 rounded-xl font-bold border-slate-200" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Valid From</Label>
                                <Input type="date" {...form.register("validFrom")} className="h-11 rounded-xl font-bold text-xs border-slate-200" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Valid To</Label>
                                <Input type="date" {...form.register("validTo")} className="h-11 rounded-xl font-bold text-xs border-slate-200" />
                            </div>
                        </div>

                        <DialogFooter className="pt-4 border-t flex gap-4">
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="h-12 font-bold uppercase text-xs text-slate-400">Cancel</Button>
                            <Button type="submit" disabled={isPending} className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl uppercase text-xs flex-1">
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin mx-auto" /> : "Save Promotion"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="w-full">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="h-12">
                  <TableHead className="pl-8 font-bold text-[10px] uppercase text-slate-500">Promo Code & Label</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase text-slate-500">Offer Type</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase text-slate-500">Value</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase text-slate-500">Target Region</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase text-slate-500 text-center">Status</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase text-slate-500">Validity Window</TableHead>
                  <TableHead className="text-right pr-8 font-bold text-[10px] uppercase text-slate-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="h-32 text-center"><Loader2 className="animate-spin inline mr-2 text-blue-600"/> Loading Promotions...</TableCell></TableRow>
                ) : activePromotionsList.length === 0 ? (
                     <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-slate-400">
                            <div className="flex flex-col items-center justify-center">
                                <Tag className="h-8 w-8 mb-2 opacity-20" />
                                <p className="text-xs font-bold uppercase">No active promotion campaigns configured.</p>
                            </div>
                        </TableCell>
                    </TableRow>
                ) : (
                    activePromotionsList.map(p => {
                        const isValid = new Date(p.validTo) > new Date();
                        return (
                            <TableRow key={p.id} className="h-16 hover:bg-slate-50/50">
                                <TableCell className="pl-8">
                                    <div className="flex flex-col">
                                        <span className="font-mono font-black text-blue-600 text-xs">{p.code}</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">{p.label}</span>
                                    </div>
                                </TableCell>
                                <TableCell><Badge variant="outline" className="text-[9px] font-bold uppercase border-slate-200">{p.type}</Badge></TableCell>
                                <TableCell className="font-black text-xs text-slate-900">
                                    {p.value} {p.currency && <span className="text-[9px] text-slate-400 uppercase">{p.currency}</span>}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="text-[9px] font-bold uppercase bg-slate-50 border-slate-200">{p.region}</Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                    {p.active && isValid ? (
                                        <Badge className="bg-emerald-50 text-emerald-700 border-none font-bold text-[9px] uppercase px-3 py-1">ACTIVE</Badge>
                                    ) : (
                                        <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-bold text-[9px] uppercase px-3 py-1">EXPIRED</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-xs font-medium text-slate-500 whitespace-nowrap">
                                    {formatSafeDate(p.validFrom, 'MMM dd')} - {formatSafeDate(p.validTo, 'MMM dd, yyyy')}
                                </TableCell>
                                <TableCell className="text-right pr-8">
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                        onClick={() => handleDelete(p.id)}
                                        disabled={isPending}
                                    >
                                        <Trash2 className="w-4 h-4"/>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}