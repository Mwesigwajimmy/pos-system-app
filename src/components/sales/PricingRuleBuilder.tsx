'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useFormState } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CheckCircle2, Zap, ShieldCheck, Layers, Percent, 
    ArrowRight, Globe, Trash2, Plus, Activity, ShieldAlert,
    Cpu, Box, Users, CreditCard, Target, ChevronRight,
    Search, LayoutGrid, Settings2, Calculator, Info,
    ArrowUpRight, BarChart3, Lock, Unlock, Database,
    Smartphone, Tablet, Monitor, Scale, Calculator as CalcIcon,
    History, Globe2, Landmark, FileJson, AlertTriangle
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createOrUpdatePricingRule } from '@/app/actions/pricing';
import { cn } from '@/lib/utils';

/**
 * TIER-1 ENTERPRISE ARCHITECTURE
 * Multi-tenant, Formula-ready, Volume-Tiered Global Pricing Data Interface.
 */
interface TierBreak {
    min_qty: number;
    max_qty: number | null;
    value: number;
}

interface ActionData {
    type: 'PERCENTAGE_DISCOUNT' | 'FIXED_PRICE' | 'FORMULA' | 'VOLUME_TIER';
    value: number;
    formula_string?: string;
    tiers?: TierBreak[];
    currency_code: string;
}

interface PricingRuleFormValues {
    tenant_id: string;
    name: string;
    description: string;
    priority: number;
    is_active: boolean;
    is_stackable: boolean;
    is_exclusive: boolean; 
    tax_strategy: 'NET' | 'GROSS'; 
    conditions: {
        type: 'PRODUCT' | 'CUSTOMER' | 'LOCATION';
        target_id: string;
        location_id: string;
    }[];
    actions: ActionData[];
}

interface BuilderProps {
    initialData?: any;
    customers: { id: string; name: string }[];
    products: { id: string; name: string; price: number }[];
    locations: { id: string; name: string }[];
    currencies: string[];
    tenantId: string;
}

/**
 * GLOBAL PRICING INTELLIGENCE BUILDER V5.0
 * Engineered for Enterprise Multi-Currency & Multi-Country Deployments.
 */
export function PricingRuleBuilder({ 
    initialData, 
    customers, 
    products, 
    locations, 
    currencies, 
    tenantId 
}: BuilderProps) {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("config");
    const [stagedTabs, setStagedTabs] = useState<string[]>([]);
    const [simulatedQty, setSimulatedQty] = useState(1);
    
    // 1. PRIMARY FORM ORCHESTRATION ENGINE (TYPE-SAFE)
    const { control, handleSubmit, register, watch, trigger, setValue, formState: { errors } } = useForm<PricingRuleFormValues>({
        defaultValues: {
            tenant_id: tenantId,
            name: initialData?.name || '',
            description: initialData?.description || '',
            priority: initialData?.priority || 1,
            is_active: initialData?.is_active ?? true,
            is_stackable: initialData?.is_stackable ?? false,
            is_exclusive: initialData?.is_exclusive ?? false,
            tax_strategy: initialData?.tax_strategy ?? 'GROSS',
            conditions: initialData?.conditions || [{ type: 'PRODUCT', target_id: '', location_id: 'GLOBAL' }],
            actions: initialData?.actions || [{ 
                type: 'PERCENTAGE_DISCOUNT', 
                value: 0, 
                currency_code: currencies[0] || 'USD',
                tiers: [{ min_qty: 1, max_qty: null, value: 0 }] 
            }],
        },
    });

    // Subscribing to all form changes to resolve the "watchedData" reference error
    const watchedData = watch();

    const { fields: condFields, append: addCond, remove: remCond } = useFieldArray({ control, name: "conditions" });
    const { fields: actFields, append: addAct, remove: remAct } = useFieldArray({ control, name: "actions" });

    const [state, formAction] = useFormState(createOrUpdatePricingRule, { success: false, message: '' });

    // 2. AUTONOMOUS INTEGRITY OBSERVER (AIO)
    useEffect(() => {
        const subscription = watch((value) => {
            const verified = [];
            if (value.name && value.name.trim().length >= 3) verified.push('config');
            if (value.conditions && value.conditions.length > 0 && value.conditions.every(c => c?.target_id)) verified.push('logic');
            if (value.actions && value.actions.length > 0) {
                const actsValid = value.actions.every(a => {
                    if (a?.type === 'FORMULA') return !!a.formula_string;
                    if (a?.type === 'VOLUME_TIER') return (a.tiers?.length ?? 0) > 0;
                    return (a?.value ?? 0) > 0;
                });
                if (actsValid) verified.push('outcomes');
            }
            setStagedTabs(verified);
        });
        return () => subscription.unsubscribe();
    }, [watch]);

    // 3. ENTERPRISE REVENUE TELEMETRY (REAL-TIME IMPACT SIMULATOR)
    const telemetry = useMemo(() => {
        const conditions = watch('conditions') || [];
        const actions = watch('actions') || [];
        const firstProduct = products.find(p => p.id.toString() === conditions.find(c => c.type === 'PRODUCT')?.target_id);
        
        const basePrice = firstProduct?.price || 1000;
        let finalPrice = basePrice;
        let discountTotal = 0;

        actions.forEach(action => {
            if (action.type === 'PERCENTAGE_DISCOUNT') {
                const d = (basePrice * (action.value || 0)) / 100;
                discountTotal += d;
                finalPrice -= d;
            } else if (action.type === 'FIXED_PRICE') {
                discountTotal = basePrice - (action.value || 0);
                finalPrice = (action.value || 0);
            } else if (action.type === 'VOLUME_TIER') {
                const tier = action.tiers?.find(t => simulatedQty >= t.min_qty && (!t.max_qty || simulatedQty <= t.max_qty));
                if (tier) {
                    const d = (basePrice * (tier.value || 0)) / 100;
                    discountTotal += d;
                    finalPrice -= d;
                }
            } else if (action.type === 'FORMULA' && action.formula_string) {
                try {
                    const parsed = action.formula_string.replace(/BASE/g, basePrice.toString());
                    const result = eval(parsed); 
                    finalPrice = Number(result);
                    discountTotal = basePrice - finalPrice;
                } catch { /* Formula invalid */ }
            }
        });

        return {
            basePrice,
            finalPrice: Math.max(0, finalPrice),
            discountTotal: Math.max(0, discountTotal),
            unitImpact: basePrice > 0 ? (discountTotal / basePrice) * 100 : 0,
            productName: firstProduct?.name || 'VIRTUAL_SKU'
        };
    }, [watch('conditions'), watch('actions'), products, simulatedQty]);

    const isFullyStaged = stagedTabs.length >= 3;

    const onActualSubmit = (data: any) => {
        const formData = new FormData();
        formData.append('ruleData', JSON.stringify({ ...data, id: initialData?.id }));
        formData.append('conditions', JSON.stringify(data.conditions));
        formData.append('actions', JSON.stringify(data.actions));
        formAction(formData);
    };

    return (
        <form onSubmit={handleSubmit(onActualSubmit)} className="w-full max-w-[1680px] mx-auto space-y-8 px-4 py-8 md:px-10 lg:py-12 bg-slate-50/20">
            
            {/* --- GLOBAL STATUS & DEPLOYMENT CONTROL --- */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8 bg-white p-8 sm:p-12 rounded-[40px] border border-slate-200 shadow-sm transition-all duration-500">
                <div className="flex items-center gap-8">
                    <div className="w-20 h-20 sm:w-28 sm:h-28 bg-slate-950 rounded-[35px] flex items-center justify-center shadow-2xl relative overflow-hidden shrink-0">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className="absolute inset-0 bg-gradient-to-tr from-blue-500/30 to-transparent" />
                        <Cpu className="text-white w-10 h-10 sm:w-14 sm:h-14 relative z-10" />
                    </div>
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <Badge className="bg-slate-900 text-white border-none px-4 py-1 text-[10px] font-black uppercase tracking-widest">TIER_1_INTEL_V5</Badge>
                            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black text-emerald-600 uppercase">Write Sync Active</span>
                            </div>
                        </div>
                        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tighter leading-none">
                            {initialData?.id ? 'Modify Active Logic' : 'Deploy Global Engine'}
                        </h1>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-6 w-full xl:w-auto">
                    <div className="flex flex-col justify-center px-10 py-5 bg-slate-50 rounded-[30px] border border-slate-100 min-w-[220px]">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Integrity Score</span>
                        <div className="flex items-center gap-3">
                            <Activity className={cn("w-5 h-5", isFullyStaged ? "text-emerald-500" : "text-amber-500")} />
                            <span className="text-2xl font-black text-slate-900">{stagedTabs.length}/3 Verified</span>
                        </div>
                    </div>
                    
                    <Button 
                        type="submit" 
                        disabled={!isFullyStaged}
                        className={cn(
                            "h-20 sm:h-24 px-12 sm:px-16 font-black text-sm uppercase tracking-[0.25em] transition-all rounded-[32px] shadow-2xl flex-1 md:flex-none",
                            isFullyStaged 
                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 border-b-8 border-blue-900 active:translate-y-1 active:border-b-0" 
                            : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                        )}
                    >
                        {isFullyStaged ? <Zap className="w-7 h-7 mr-4 fill-white" /> : <Lock className="w-7 h-7 mr-4" />}
                        Commit to Production
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                
                {/* --- PRIMARY LOGIC WORKSPACE --- */}
                <div className="lg:col-span-8 space-y-10 order-2 lg:order-1">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid grid-cols-3 w-full bg-white border border-slate-200 p-2.5 rounded-[40px] h-24 sm:h-28 shadow-sm mb-12">
                            {[
                                { id: 'config', label: '1. Strategy Context', icon: Settings2 },
                                { id: 'logic', label: '2. Intelligence Gates', icon: Layers },
                                { id: 'outcomes', label: '3. Logic Mutation', icon: Percent },
                            ].map(tab => (
                                <TabsTrigger 
                                    key={tab.id} 
                                    value={tab.id} 
                                    className="rounded-[32px] font-black text-[11px] uppercase tracking-widest transition-all data-[state=active]:bg-slate-950 data-[state=active]:text-white flex items-center justify-center gap-4 py-0 h-full"
                                >
                                    <tab.icon className="w-5 h-5" />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                    {stagedTabs.includes(tab.id) && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <AnimatePresence mode="wait">
                            <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
                                
                                {/* TAB 1: CONTEXT & GLOBAL COMPLIANCE */}
                                <TabsContent value="config" className="focus-visible:outline-none">
                                    <Card className="border-none shadow-2xl rounded-[56px] overflow-hidden bg-white">
                                        <CardHeader className="p-10 sm:p-16 border-b border-slate-50 bg-slate-50/40">
                                            <div className="flex items-center gap-6 mb-3">
                                                <div className="p-4 bg-blue-100 rounded-3xl"><Settings2 className="w-6 h-6 text-blue-600" /></div>
                                                <CardTitle className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tighter uppercase">Strategy Protocol</CardTitle>
                                            </div>
                                            <CardDescription className="text-slate-500 font-bold text-sm uppercase">Define handle, rank, conflict resolution, and tax modes.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-10 sm:p-16 space-y-12">
                                            <div className="grid md:grid-cols-2 gap-12">
                                                <div className="space-y-4">
                                                    <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Logic Handle (Global Identity) *</Label>
                                                    <Input {...register('name')} placeholder="e.g. VIP_TIERED_ACCESS_GLOBAL" className="h-20 border-slate-200 focus:ring-[15px] focus:ring-blue-500/5 rounded-[28px] font-black text-xl sm:text-2xl px-10" />
                                                    {errors.name && <p className="text-red-500 text-[11px] font-bold uppercase tracking-widest">{errors.name.message?.toString()}</p>}
                                                </div>
                                                <div className="space-y-4">
                                                    <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Execution Weight (1-1000)</Label>
                                                    <div className="relative">
                                                        <Input type="number" {...register('priority')} className="h-20 border-slate-200 rounded-[28px] font-black text-xl sm:text-2xl px-10" />
                                                        <BarChart3 className="absolute right-10 top-1/2 -translate-y-1/2 text-slate-300 w-7 h-7" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-8">
                                                <div className="flex items-center justify-between p-10 bg-slate-50 rounded-[40px] border border-slate-100 transition-all hover:bg-slate-100/50">
                                                    <div className="flex items-center gap-6">
                                                        <Lock className="w-8 h-8 text-blue-600" />
                                                        <div>
                                                            <p className="font-black text-slate-900 text-sm uppercase">Exclusive Execution</p>
                                                            <p className="text-[10px] text-slate-500 font-bold uppercase">Oracle-style priority lock.</p>
                                                        </div>
                                                    </div>
                                                    <Controller control={control} name="is_exclusive" render={({ field }) => (
                                                        <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-blue-600 scale-150" />
                                                    )} />
                                                </div>
                                                <div className="flex items-center justify-between p-10 bg-slate-50 rounded-[40px] border border-slate-100">
                                                    <div className="flex items-center gap-6">
                                                        <Landmark className="w-8 h-8 text-blue-600" />
                                                        <div>
                                                            <p className="font-black text-slate-900 text-sm uppercase">Tax Protocol</p>
                                                            <p className="text-[10px] text-slate-500 font-bold uppercase">Cross-border logic mode.</p>
                                                        </div>
                                                    </div>
                                                    <Controller control={control} name="tax_strategy" render={({ field }) => (
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <SelectTrigger className="h-14 w-[120px] bg-white border-slate-200 rounded-2xl font-black text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-2xl">
                                                                <SelectItem value="GROSS" className="font-bold py-3">Gross (Incl)</SelectItem>
                                                                <SelectItem value="NET" className="font-bold py-3">Net (Excl)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )} />
                                                </div>
                                            </div>

                                            <div className="flex justify-end pt-8">
                                                <Button type="button" onClick={async () => { const valid = await trigger(['name', 'priority']); if(valid) setActiveTab('logic'); }} className="h-20 px-14 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] rounded-[28px] shadow-2xl hover:bg-black transition-all group">
                                                    Access Activation Matrix <ArrowRight className="ml-4 w-6 h-6 group-hover:translate-x-3 transition-transform" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* TAB 2: ACTIVATION MATRIX (INTELLIGENCE GATES) */}
                                <TabsContent value="logic" className="focus-visible:outline-none">
                                    <Card className="border-none shadow-2xl rounded-[56px] overflow-hidden bg-white">
                                        <CardHeader className="p-10 sm:p-16 flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-50 bg-slate-50/40 gap-8">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-6">
                                                    <div className="p-4 bg-purple-100 rounded-3xl"><Layers className="w-6 h-6 text-purple-600" /></div>
                                                    <CardTitle className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tighter uppercase">Activation Matrix</CardTitle>
                                                </div>
                                                <CardDescription className="text-slate-500 font-bold text-sm uppercase">Identify the catalog, client, or branch triggers.</CardDescription>
                                            </div>
                                            <Button type="button" variant="outline" onClick={() => addCond({ type: 'PRODUCT', target_id: '', location_id: 'GLOBAL' })} className="rounded-[24px] border-slate-200 hover:bg-slate-50 font-black text-[11px] uppercase tracking-widest h-16 px-10 shrink-0">
                                                <Plus className="w-6 h-6 mr-3" /> Add Gate Node
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="p-10 sm:p-16 space-y-8">
                                            {condFields.map((field, index) => (
                                                <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end bg-white p-8 sm:p-10 rounded-[40px] border border-slate-200 shadow-sm hover:border-blue-400 transition-all">
                                                    <div className="md:col-span-3 space-y-3">
                                                        <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Dimension</Label>
                                                        <Controller control={control} name={`conditions.${index}.type`} render={({ field }) => (
                                                            <Select onValueChange={(val) => { field.onChange(val); setValue(`conditions.${index}.target_id`, ''); }} value={field.value}>
                                                                <SelectTrigger className="h-16 border-slate-100 bg-slate-50/50 rounded-[20px] font-black text-xs uppercase"><SelectValue /></SelectTrigger>
                                                                <SelectContent className="rounded-2xl">
                                                                    <SelectItem value="PRODUCT" className="font-bold py-4">Catalog SKU</SelectItem>
                                                                    <SelectItem value="CUSTOMER" className="font-bold py-4">Client Segment</SelectItem>
                                                                    <SelectItem value="LOCATION" className="font-bold py-4">Cluster Branch</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        )}/>
                                                    </div>
                                                    <div className="md:col-span-4 space-y-3">
                                                        <Label className="text-[11px] font-black text-blue-600 uppercase tracking-widest">Target Identity</Label>
                                                        <Controller control={control} name={`conditions.${index}.target_id`} render={({ field: targetField }) => (
                                                            <Select onValueChange={targetField.onChange} value={targetField.value}>
                                                                <SelectTrigger className="h-16 border-blue-100 bg-blue-50/20 rounded-[20px] font-black text-xs"><SelectValue placeholder="Identify target..." /></SelectTrigger>
                                                                <SelectContent className="rounded-2xl max-h-[350px]">
                                                                    {watch(`conditions.${index}.type`) === 'PRODUCT' 
                                                                        ? products.map(p => <SelectItem key={p.id} value={p.id.toString()} className="font-bold py-4 border-b border-slate-50 last:border-none">{p.name} — <span className="text-blue-600">${p.price}</span></SelectItem>)
                                                                        : customers.map(c => <SelectItem key={c.id} value={c.id.toString()} className="font-bold py-4">{c.name}</SelectItem>)
                                                                    }
                                                                </SelectContent>
                                                            </Select>
                                                        )}/>
                                                    </div>
                                                    <div className="md:col-span-3 space-y-3">
                                                        <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Scope</Label>
                                                        <Controller control={control} name={`conditions.${index}.location_id`} render={({ field }) => (
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <SelectTrigger className="h-16 border-slate-100 bg-slate-50/50 rounded-[20px] font-black text-xs uppercase"><SelectValue placeholder="Global" /></SelectTrigger>
                                                                <SelectContent className="rounded-2xl">
                                                                    <SelectItem value="GLOBAL" className="font-bold py-4">Universal Cluster</SelectItem>
                                                                    {locations.map(l => <SelectItem key={l.id} value={l.id.toString()} className="font-bold py-4">{l.name}</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                        )}/>
                                                    </div>
                                                    <div className="md:col-span-2 flex justify-end pb-1">
                                                        <Button variant="ghost" size="icon" onClick={() => remCond(index)} className="h-16 w-16 rounded-[22px] text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all shrink-0"><Trash2 className="w-7 h-7" /></Button>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex flex-col sm:flex-row justify-between pt-12 gap-6">
                                                <Button type="button" variant="ghost" onClick={() => setActiveTab('config')} className="font-black text-[11px] uppercase text-slate-400 hover:text-slate-950 h-20 px-12 rounded-[28px]">Back to Context</Button>
                                                <Button type="button" onClick={async () => { const valid = await trigger('conditions'); if(valid && stagedTabs.includes('logic')) setActiveTab('outcomes'); }} className="h-20 px-16 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-[28px] shadow-2xl hover:bg-black transition-all">
                                                    Define Mutations <ArrowUpRight className="ml-4 w-6 h-6" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* TAB 3: OUTCOME MUTATION (FORMULA, TIERS & COMPLIANCE) */}
                                <TabsContent value="outcomes" className="focus-visible:outline-none">
                                    <Card className="border-none shadow-2xl rounded-[56px] overflow-hidden bg-white">
                                        <CardHeader className="p-10 sm:p-16 flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-50 bg-slate-50/40 gap-8">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-6">
                                                    <div className="p-4 bg-emerald-100 rounded-3xl"><Percent className="w-6 h-6 text-emerald-600" /></div>
                                                    <CardTitle className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tighter uppercase">Outcome Mutation</CardTitle>
                                                </div>
                                                <CardDescription className="text-slate-500 font-bold text-sm uppercase">Manage dynamic formulas, quantity breaks, and rebates.</CardDescription>
                                            </div>
                                            <Button type="button" variant="outline" onClick={() => addAct({ type: 'PERCENTAGE_DISCOUNT', value: 0, currency_code: currencies[0] || 'USD', tiers: [] })} className="rounded-[24px] border-slate-200 hover:bg-slate-50 font-black text-[11px] uppercase h-16 px-10 shrink-0"><Plus className="w-6 h-6 mr-3" /> New Logic Row</Button>
                                        </CardHeader>
                                        <CardContent className="p-10 sm:p-16 space-y-12">
                                            {actFields.map((field, index) => {
                                                const actionType = watch(`actions.${index}.type`);
                                                return (
                                                    <div key={field.id} className="bg-slate-50/50 p-10 sm:p-12 rounded-[48px] border border-slate-100 space-y-10 hover:border-emerald-200 transition-all">
                                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-end">
                                                            <div className="md:col-span-4 space-y-4">
                                                                <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Mutation Type</Label>
                                                                <Controller control={control} name={`actions.${index}.type`} render={({ field }) => (
                                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                                        <SelectTrigger className="h-18 border-slate-100 bg-white rounded-[24px] font-black text-xs uppercase"><SelectValue /></SelectTrigger>
                                                                        <SelectContent className="rounded-[30px] p-2">
                                                                            <SelectItem value="PERCENTAGE_DISCOUNT" className="font-bold py-4">Percentage Rebate (%)</SelectItem>
                                                                            <SelectItem value="FIXED_PRICE" className="font-bold py-4">Fixed Net Overwrite ($)</SelectItem>
                                                                            <SelectItem value="FORMULA" className="font-bold py-4">Formula Engine (Oracle)</SelectItem>
                                                                            <SelectItem value="VOLUME_TIER" className="font-bold py-4">Quantity Brackets (Tiers)</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                )}/>
                                                            </div>

                                                            <div className="md:col-span-6 space-y-4">
                                                                {actionType === 'FORMULA' ? (
                                                                    <div className="space-y-4">
                                                                        <Label className="text-[11px] font-black text-blue-600 uppercase tracking-widest ml-1">Dynamic Formula (Input: BASE)</Label>
                                                                        <div className="relative">
                                                                            <input {...register(`actions.${index}.formula_string`)} placeholder="e.g. (BASE * 0.9) - 5" className="h-18 border-blue-200 bg-white rounded-[24px] font-mono font-black text-xl px-10 w-full flex items-center" />
                                                                            <CalcIcon className="absolute right-8 top-1/2 -translate-y-1/2 text-blue-300 w-6 h-6" />
                                                                        </div>
                                                                    </div>
                                                                ) : actionType === 'VOLUME_TIER' ? (
                                                                    <div className="p-6 bg-white rounded-[24px] border border-slate-100"><p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Multi-Tier Logic Enabled. Add brackets below.</p></div>
                                                                ) : (
                                                                    <div className="space-y-4">
                                                                        <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Mutation Value</Label>
                                                                        <div className="relative">
                                                                            <Input type="number" step="0.01" {...register(`actions.${index}.value`)} className="h-18 border-slate-100 bg-white rounded-[24px] font-black text-2xl px-10" />
                                                                            <div className="absolute right-10 top-1/2 -translate-y-1/2 font-black text-slate-300 text-sm uppercase">VAL</div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="md:col-span-2 flex justify-end pb-1">
                                                                <Button variant="ghost" size="icon" onClick={() => remAct(index)} className="h-18 w-18 rounded-[24px] text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all shrink-0"><Trash2 className="w-8 h-8" /></Button>
                                                            </div>
                                                        </div>

                                                        {/* NESTED VOLUME TIER EDITOR (ORACLE/SAP SPEC) */}
                                                        {actionType === 'VOLUME_TIER' && (
                                                            <div className="pt-8 border-t border-slate-100 space-y-6">
                                                                <div className="flex items-center justify-between">
                                                                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Quantity Tier Matrix</h4>
                                                                    <Button type="button" variant="outline" size="sm" onClick={() => {
                                                                        const current = watch(`actions.${index}.tiers`) || [];
                                                                        setValue(`actions.${index}.tiers`, [...current, { min_qty: 1, max_qty: null, value: 0 }]);
                                                                    }} className="rounded-xl font-black text-[9px] uppercase px-4">New Bracket</Button>
                                                                </div>
                                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                                                    {(watch(`actions.${index}.tiers`) || []).map((tier, tIdx) => (
                                                                        <div key={tIdx} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm relative group">
                                                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                                                <div className="space-y-2">
                                                                                    <Label className="text-[9px] font-black text-slate-400 uppercase">Min</Label>
                                                                                    <Input type="number" {...register(`actions.${index}.tiers.${tIdx}.min_qty`)} className="h-10 rounded-xl font-black text-sm" />
                                                                                </div>
                                                                                <div className="space-y-2">
                                                                                    <Label className="text-[9px] font-black text-slate-400 uppercase">Max</Label>
                                                                                    <Input type="number" {...register(`actions.${index}.tiers.${tIdx}.max_qty`)} placeholder="∞" className="h-10 rounded-xl font-black text-sm" />
                                                                                </div>
                                                                            </div>
                                                                            <div className="space-y-2">
                                                                                <Label className="text-[9px] font-black text-emerald-600 uppercase">Discount %</Label>
                                                                                <Input type="number" {...register(`actions.${index}.tiers.${tIdx}.value`)} className="h-12 rounded-xl font-black text-lg bg-emerald-50/30 border-emerald-100" />
                                                                            </div>
                                                                            <Button type="button" variant="ghost" size="icon" onClick={() => {
                                                                                const current = watch(`actions.${index}.tiers`) || [];
                                                                                setValue(`actions.${index}.tiers`, current.filter((_, i) => i !== tIdx));
                                                                            }} className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white shadow-md border border-slate-100 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></Button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            
                                            <div className="p-12 bg-blue-50/50 rounded-[48px] border border-blue-100 flex items-start gap-8 shadow-inner">
                                                <ShieldCheck className="w-12 h-12 text-blue-600 shrink-0" />
                                                <div className="space-y-2">
                                                    <p className="font-black text-blue-900 text-lg uppercase tracking-tight">Deployment Ready</p>
                                                    <p className="text-[12px] text-blue-700/80 font-bold uppercase leading-relaxed max-w-2xl">Multidimensional intelligence node compiled. Finalizing will initiate a global cluster sync across all active tenants.</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row justify-between pt-10 gap-6">
                                                <Button type="button" variant="ghost" onClick={() => setActiveTab('logic')} className="font-black text-[11px] uppercase text-slate-400 hover:text-slate-900 h-20 px-12 rounded-[28px]">Back to Gates</Button>
                                                <Button type="submit" disabled={!isFullyStaged} className={cn("h-20 sm:h-24 px-16 font-black text-xs uppercase tracking-[0.25em] rounded-[32px] shadow-2xl transition-all", isFullyStaged ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 border-b-8 border-emerald-900 active:translate-y-1 active:border-b-0" : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed")}>Commit Deployment <CheckCircle2 className="ml-4 w-7 h-7" /></Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </motion.div>
                        </AnimatePresence>
                    </Tabs>
                </div>

                {/* --- SIDEBAR: REVENUE TELEMETRY 3.0 --- */}
                <div className="lg:col-span-4 space-y-10 order-1 lg:order-2">
                    <div className="sticky top-10 space-y-10">
                        <Card className="bg-slate-950 border-none rounded-[64px] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] relative">
                            <motion.div animate={{ x: [-800, 800] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
                            <CardHeader className="p-12 pb-8">
                                <div className="flex items-center gap-4 mb-8">
                                    <CalcIcon className="w-6 h-6 text-blue-400" />
                                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.45em]">Impact Intelligence</span>
                                </div>
                                <CardTitle className="text-3xl sm:text-4xl font-black text-white tracking-tighter uppercase leading-tight truncate">{watchedData.name || 'VIRTUAL_NODE'}</CardTitle>
                                <div className="flex items-center gap-3 mt-4">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Real-time Simulation</span>
                                </div>
                            </CardHeader>
                            
                            <CardContent className="p-12 pt-0 space-y-12">
                                <div className="space-y-8">
                                    <div className="p-10 bg-white/5 rounded-[48px] border border-white/5 space-y-10">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Base Gross</span>
                                            <span className="text-2xl font-black text-white">${telemetry.basePrice.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">Logic Savings</span>
                                            <span className="text-2xl font-black text-emerald-400">-${telemetry.discountTotal.toLocaleString()}</span>
                                        </div>
                                        <div className="pt-10 border-t border-white/10 flex flex-col gap-8">
                                            <div className="flex justify-between items-end">
                                                <div className="space-y-2">
                                                    <span className="text-[11px] font-black text-blue-400 uppercase tracking-widest block">Net Simulated Price</span>
                                                    <div className="flex items-center gap-3 px-4 py-2 bg-blue-500/10 rounded-full border border-blue-500/20">
                                                        <Target className="w-4 h-4 text-blue-500" />
                                                        <span className="text-[10px] font-black text-slate-300 uppercase truncate max-w-[150px]">{telemetry.productName}</span>
                                                    </div>
                                                </div>
                                                <span className="text-5xl sm:text-7xl font-black text-white tracking-tighter leading-none">${telemetry.finalPrice.toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                                                <Label className="text-[9px] font-black text-slate-500 uppercase">Simulated Quantity</Label>
                                                <Input type="number" value={simulatedQty} onChange={(e) => setSimulatedQty(Number(e.target.value))} className="w-20 h-10 bg-white/5 border-white/10 text-white font-black text-center rounded-xl" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="p-8 bg-white/5 rounded-[32px] border border-white/10 flex flex-col items-center text-center">
                                        <History className="w-5 h-5 text-slate-500 mb-4" />
                                        <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Build State</p>
                                        <p className={cn("text-sm font-black uppercase", isFullyStaged ? "text-emerald-400" : "text-amber-400")}>{isFullyStaged ? "COMPILED" : "CALIBRATING"}</p>
                                    </div>
                                    <div className="p-8 bg-white/5 rounded-[32px] border border-white/10 flex flex-col items-center text-center">
                                        <Scale className="text-blue-500 mb-4 w-5 h-5" />
                                        <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Margin Impact</p>
                                        <p className="text-sm font-black text-blue-400">{telemetry.unitImpact.toFixed(1)}% REBATE</p>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    <div className="flex justify-between text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">
                                        <span>Cluster Sync Readiness</span>
                                        <span className={isFullyStaged ? "text-emerald-400" : "text-blue-400"}>{isFullyStaged ? "READY" : "STAGING..."}</span>
                                    </div>
                                    <div className="h-5 w-full bg-white/5 rounded-full overflow-hidden p-1.5 border border-white/5">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${(stagedTabs.length / 3) * 100}%` }} className="h-full bg-blue-600 rounded-full shadow-[0_0_30px_#2563eb]" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-3 gap-6">
                            {[
                                { icon: Globe2, label: 'Cross-Branch' },
                                { icon: Landmark, label: 'Tax Sync' },
                                { icon: FileJson, label: 'Audit Log' }
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col items-center justify-center p-6 bg-white rounded-[32px] border border-slate-200 shadow-sm hover:border-blue-300 transition-colors cursor-pointer">
                                    <item.icon className="w-5 h-5 text-slate-400 mb-3" />
                                    <span className="text-[9px] font-black text-slate-500 uppercase text-center">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}