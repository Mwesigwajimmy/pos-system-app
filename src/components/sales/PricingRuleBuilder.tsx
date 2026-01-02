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
 * ENTERPRISE ARCHITECTURE
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
 * GLOBAL PRICING BUILDER
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

    const watchedData = watch();

    const { fields: condFields, append: addCond, remove: remCond } = useFieldArray({ control, name: "conditions" });
    const { fields: actFields, append: addAct, remove: remAct } = useFieldArray({ control, name: "actions" });

    const [state, formAction] = useFormState(createOrUpdatePricingRule, { success: false, message: '' });

    // 2. AUTONOMOUS INTEGRITY OBSERVER
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

    // 3. REVENUE TELEMETRY (REAL-TIME IMPACT SIMULATOR)
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

    // Helper for second picture buttons
    const handleUtilityAction = (label: string) => {
        toast({ title: "Module Activated", description: `Opening ${label} workspace...` });
    };

    return (
        <form onSubmit={handleSubmit(onActualSubmit)} className="w-full max-w-[1680px] mx-auto space-y-8 px-4 py-8 md:px-10 lg:py-12 bg-slate-50/20">
            
            {/* --- GLOBAL STATUS & DEPLOYMENT CONTROL --- */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8 bg-white p-6 sm:p-10 rounded-[30px] border border-slate-200 shadow-sm transition-all duration-500">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-slate-950 rounded-[25px] flex items-center justify-center shadow-xl relative overflow-hidden shrink-0">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className="absolute inset-0 bg-gradient-to-tr from-blue-500/30 to-transparent" />
                        <Cpu className="text-white w-8 h-8 sm:w-12 sm:h-12 relative z-10" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                            <Badge className="bg-slate-900 text-white border-none px-3 py-1 text-[9px] font-bold uppercase tracking-widest">GLOBAL_ENGINE_V5</Badge>
                            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-emerald-600 uppercase">Write Sync Active</span>
                            </div>
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
                            {initialData?.id ? 'Modify Active Logic' : 'Deploy Global Engine'}
                        </h1>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-6 w-full xl:w-auto">
                    <div className="flex flex-col justify-center px-8 py-4 bg-slate-50 rounded-[20px] border border-slate-100 min-w-[200px]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Integrity Score</span>
                        <div className="flex items-center gap-3">
                            <Activity className={cn("w-5 h-5", isFullyStaged ? "text-emerald-500" : "text-amber-500")} />
                            <span className="text-xl font-bold text-slate-900">{stagedTabs.length}/3 Verified</span>
                        </div>
                    </div>
                    
                    <Button 
                        type="submit" 
                        disabled={!isFullyStaged}
                        className={cn(
                            "h-16 sm:h-20 px-10 sm:px-14 font-bold text-sm uppercase tracking-widest transition-all rounded-[24px] shadow-xl flex-1 md:flex-none",
                            isFullyStaged 
                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100" 
                            : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                        )}
                    >
                        {isFullyStaged ? <Zap className="w-6 h-6 mr-3 fill-white" /> : <Lock className="w-6 h-6 mr-3" />}
                        Commit Deployment
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* --- PRIMARY LOGIC WORKSPACE --- */}
                <div className="lg:col-span-8 space-y-8 order-2 lg:order-1">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid grid-cols-3 w-full bg-white border border-slate-200 p-2 rounded-[25px] min-h-[70px] h-auto shadow-sm mb-10 gap-2">
                            {[
                                { id: 'config', label: '1. Strategy Context', icon: Settings2 },
                                { id: 'logic', label: '2. Intelligence Gates', icon: Layers },
                                { id: 'outcomes', label: '3. Logic Mutation', icon: Percent },
                            ].map(tab => (
                                <TabsTrigger 
                                    key={tab.id} 
                                    value={tab.id} 
                                    className="rounded-[18px] font-bold text-[10px] uppercase tracking-wider transition-all data-[state=active]:bg-slate-950 data-[state=active]:text-white flex items-center justify-center gap-3 py-3 h-full whitespace-normal text-center"
                                >
                                    <tab.icon className="w-4 h-4 shrink-0" />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                    {stagedTabs.includes(tab.id) && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <AnimatePresence mode="wait">
                            <motion.div key={activeTab} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }}>
                                
                                {/* TAB 1: CONTEXT */}
                                <TabsContent value="config" className="focus-visible:outline-none">
                                    <Card className="border-none shadow-xl rounded-[40px] overflow-hidden bg-white">
                                        <CardHeader className="p-8 sm:p-12 border-b border-slate-50 bg-slate-50/40">
                                            <div className="flex items-center gap-6 mb-2">
                                                <div className="p-3 bg-blue-100 rounded-2xl"><Settings2 className="w-5 h-5 text-blue-600" /></div>
                                                <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight uppercase">Strategy Protocol</CardTitle>
                                            </div>
                                            <CardDescription className="text-slate-500 font-bold text-[10px] uppercase">Define handle, rank, conflict resolution, and tax modes.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-8 sm:p-12 space-y-10">
                                            <div className="grid md:grid-cols-2 gap-10">
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Logic Handle *</Label>
                                                    <Input {...register('name')} placeholder="e.g. REGIONAL_DISCOUNT_V1" className="h-14 border-slate-200 rounded-[15px] font-bold text-lg px-6" />
                                                    {errors.name && <p className="text-red-500 text-[10px] font-bold uppercase">{errors.name.message?.toString()}</p>}
                                                </div>
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Execution Weight (1-1000)</Label>
                                                    <div className="relative">
                                                        <Input type="number" {...register('priority')} className="h-14 border-slate-200 rounded-[15px] font-bold text-lg px-6" />
                                                        <BarChart3 className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-6">
                                                <div className="flex items-center justify-between p-8 bg-slate-50 rounded-[25px] border border-slate-100">
                                                    <div className="flex items-center gap-4">
                                                        <Lock className="w-6 h-6 text-blue-600" />
                                                        <div>
                                                            <p className="font-bold text-slate-900 text-[11px] uppercase">Exclusive Execution</p>
                                                            <p className="text-[9px] text-slate-500 font-bold uppercase">Priority lock mode.</p>
                                                        </div>
                                                    </div>
                                                    <Controller control={control} name="is_exclusive" render={({ field }) => (
                                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                    )} />
                                                </div>
                                                <div className="flex items-center justify-between p-8 bg-slate-50 rounded-[25px] border border-slate-100">
                                                    <div className="flex items-center gap-4">
                                                        <Landmark className="w-6 h-6 text-blue-600" />
                                                        <div>
                                                            <p className="font-bold text-slate-900 text-[11px] uppercase">Tax Protocol</p>
                                                            <p className="text-[9px] text-slate-500 font-bold uppercase">Logic calc mode.</p>
                                                        </div>
                                                    </div>
                                                    <Controller control={control} name="tax_strategy" render={({ field }) => (
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <SelectTrigger className="h-12 w-[110px] bg-white border-slate-200 rounded-xl font-bold text-[10px]">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="GROSS" className="font-bold">Gross (Incl)</SelectItem>
                                                                <SelectItem value="NET" className="font-bold">Net (Excl)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )} />
                                                </div>
                                            </div>

                                            <div className="flex justify-end pt-6">
                                                <Button type="button" onClick={async () => { const valid = await trigger(['name', 'priority']); if(valid) setActiveTab('logic'); }} className="h-16 px-10 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-lg hover:bg-black transition-all">
                                                    Access Gates <ArrowRight className="ml-3 w-5 h-5" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* TAB 2: INTELLIGENCE GATES */}
                                <TabsContent value="logic" className="focus-visible:outline-none">
                                    <Card className="border-none shadow-xl rounded-[40px] overflow-hidden bg-white">
                                        <CardHeader className="p-8 sm:p-12 flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-50 bg-slate-50/40 gap-6">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-6">
                                                    <div className="p-3 bg-purple-100 rounded-2xl"><Layers className="w-5 h-5 text-purple-600" /></div>
                                                    <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight uppercase">Activation Matrix</CardTitle>
                                                </div>
                                                <CardDescription className="text-slate-500 font-bold text-[10px] uppercase">Identify catalog, client, or branch triggers.</CardDescription>
                                            </div>
                                            <Button type="button" variant="outline" onClick={() => addCond({ type: 'PRODUCT', target_id: '', location_id: 'GLOBAL' })} className="rounded-xl border-slate-200 hover:bg-slate-50 font-bold text-[10px] uppercase h-12 px-8">
                                                <Plus className="w-5 h-5 mr-2" /> Add Gate Node
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="p-8 sm:p-12 space-y-6">
                                            {condFields.map((field, index) => (
                                                <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end bg-white p-6 rounded-[25px] border border-slate-200 shadow-sm transition-all">
                                                    <div className="md:col-span-3 space-y-2">
                                                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dimension</Label>
                                                        <Controller control={control} name={`conditions.${index}.type`} render={({ field }) => (
                                                            <Select onValueChange={(val) => { field.onChange(val); setValue(`conditions.${index}.target_id`, ''); }} value={field.value}>
                                                                <SelectTrigger className="h-12 border-slate-100 bg-slate-50/50 rounded-xl font-bold text-xs uppercase"><SelectValue /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="PRODUCT" className="font-bold">Catalog SKU</SelectItem>
                                                                    <SelectItem value="CUSTOMER" className="font-bold">Client Segment</SelectItem>
                                                                    <SelectItem value="LOCATION" className="font-bold">Cluster Branch</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        )}/>
                                                    </div>
                                                    <div className="md:col-span-4 space-y-2">
                                                        <Label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Target Identity</Label>
                                                        <Controller control={control} name={`conditions.${index}.target_id`} render={({ field: targetField }) => (
                                                            <Select onValueChange={targetField.onChange} value={targetField.value}>
                                                                <SelectTrigger className="h-12 border-blue-100 bg-blue-50/20 rounded-xl font-bold text-xs"><SelectValue placeholder="Identify target..." /></SelectTrigger>
                                                                <SelectContent className="max-h-[300px]">
                                                                    {watch(`conditions.${index}.type`) === 'PRODUCT' 
                                                                        ? products.map(p => <SelectItem key={p.id} value={p.id.toString()} className="font-bold border-b border-slate-50 last:border-none">{p.name} — <span className="text-blue-600">${p.price}</span></SelectItem>)
                                                                        : customers.map(c => <SelectItem key={c.id} value={c.id.toString()} className="font-bold">{c.name}</SelectItem>)
                                                                    }
                                                                </SelectContent>
                                                            </Select>
                                                        )}/>
                                                    </div>
                                                    <div className="md:col-span-3 space-y-2">
                                                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scope</Label>
                                                        <Controller control={control} name={`conditions.${index}.location_id`} render={({ field }) => (
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <SelectTrigger className="h-12 border-slate-100 bg-slate-50/50 rounded-xl font-bold text-xs uppercase"><SelectValue placeholder="Global" /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="GLOBAL" className="font-bold">Universal</SelectItem>
                                                                    {locations.map(l => <SelectItem key={l.id} value={l.id.toString()} className="font-bold">{l.name}</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                        )}/>
                                                    </div>
                                                    <div className="md:col-span-2 flex justify-end pb-1">
                                                        <Button variant="ghost" size="icon" onClick={() => remCond(index)} className="h-12 w-12 rounded-xl text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 className="w-5 h-5" /></Button>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex flex-col sm:flex-row justify-between pt-10 gap-6">
                                                <Button type="button" variant="ghost" onClick={() => setActiveTab('config')} className="font-bold text-[10px] uppercase text-slate-400 hover:text-slate-950 h-16 px-10">Back to Context</Button>
                                                <Button type="button" onClick={async () => { const valid = await trigger('conditions'); if(valid) setActiveTab('outcomes'); }} className="h-16 px-12 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-lg hover:bg-black transition-all">
                                                    Define Logic <ArrowUpRight className="ml-3 w-5 h-5" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* TAB 3: LOGIC MUTATION */}
                                <TabsContent value="outcomes" className="focus-visible:outline-none">
                                    <Card className="border-none shadow-xl rounded-[40px] overflow-hidden bg-white">
                                        <CardHeader className="p-8 sm:p-12 flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-50 bg-slate-50/40 gap-6">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-6">
                                                    <div className="p-3 bg-emerald-100 rounded-2xl"><Percent className="w-5 h-5 text-emerald-600" /></div>
                                                    <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight uppercase">Logic Mutation</CardTitle>
                                                </div>
                                                <CardDescription className="text-slate-500 font-bold text-[10px] uppercase">Manage formulas and quantity breaks.</CardDescription>
                                            </div>
                                            <Button type="button" variant="outline" onClick={() => addAct({ type: 'PERCENTAGE_DISCOUNT', value: 0, currency_code: currencies[0] || 'USD', tiers: [] })} className="rounded-xl border-slate-200 hover:bg-slate-50 font-bold text-[10px] uppercase h-12 px-8 shrink-0"><Plus className="w-5 h-5 mr-2" /> New Logic Row</Button>
                                        </CardHeader>
                                        <CardContent className="p-8 sm:p-12 space-y-10">
                                            {actFields.map((field, index) => {
                                                const actionType = watch(`actions.${index}.type`);
                                                return (
                                                    <div key={field.id} className="bg-slate-50/50 p-8 sm:p-10 rounded-[35px] border border-slate-100 space-y-8 hover:border-emerald-200 transition-all">
                                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
                                                            <div className="md:col-span-4 space-y-3">
                                                                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Type</Label>
                                                                <Controller control={control} name={`actions.${index}.type`} render={({ field }) => (
                                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                                        <SelectTrigger className="h-14 border-slate-100 bg-white rounded-xl font-bold text-xs uppercase"><SelectValue /></SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="PERCENTAGE_DISCOUNT" className="font-bold">Percentage (%)</SelectItem>
                                                                            <SelectItem value="FIXED_PRICE" className="font-bold">Fixed Overwrite ($)</SelectItem>
                                                                            <SelectItem value="FORMULA" className="font-bold">Formula Mode</SelectItem>
                                                                            <SelectItem value="VOLUME_TIER" className="font-bold">Quantity Brackets</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                )}/>
                                                            </div>

                                                            <div className="md:col-span-6 space-y-3">
                                                                {actionType === 'FORMULA' ? (
                                                                    <div className="space-y-3">
                                                                        <Label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest ml-1">Formula (Input: BASE)</Label>
                                                                        <div className="relative">
                                                                            <input {...register(`actions.${index}.formula_string`)} placeholder="e.g. (BASE * 0.9) - 5" className="h-14 border border-blue-200 bg-white rounded-xl font-mono font-bold text-lg px-6 w-full flex items-center" />
                                                                            <CalcIcon className="absolute right-6 top-1/2 -translate-y-1/2 text-blue-300 w-5 h-5" />
                                                                        </div>
                                                                    </div>
                                                                ) : actionType === 'VOLUME_TIER' ? (
                                                                    <div className="p-4 bg-white rounded-xl border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quantity brackets enabled below.</p></div>
                                                                ) : (
                                                                    <div className="space-y-3">
                                                                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Value</Label>
                                                                        <div className="relative">
                                                                            <Input type="number" step="0.01" {...register(`actions.${index}.value`)} className="h-14 border-slate-100 bg-white rounded-xl font-bold text-xl px-6" />
                                                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 font-bold text-slate-300 text-[10px] uppercase">VAL</div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="md:col-span-2 flex justify-end pb-1">
                                                                <Button variant="ghost" size="icon" onClick={() => remAct(index)} className="h-14 w-14 rounded-xl text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 className="w-6 h-6" /></Button>
                                                            </div>
                                                        </div>

                                                        {actionType === 'VOLUME_TIER' && (
                                                            <div className="pt-6 border-t border-slate-100 space-y-6">
                                                                <div className="flex items-center justify-between">
                                                                    <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Quantity Matrix</h4>
                                                                    <Button type="button" variant="outline" size="sm" onClick={() => {
                                                                        const current = watch(`actions.${index}.tiers`) || [];
                                                                        setValue(`actions.${index}.tiers`, [...current, { min_qty: 1, max_qty: null, value: 0 }]);
                                                                    }} className="rounded-lg font-bold text-[9px] uppercase px-4 h-8">New Bracket</Button>
                                                                </div>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                                                    {(watch(`actions.${index}.tiers`) || []).map((tier, tIdx) => (
                                                                        <div key={tIdx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative group">
                                                                            <div className="grid grid-cols-2 gap-4 mb-3">
                                                                                <div className="space-y-1.5">
                                                                                    <Label className="text-[9px] font-bold text-slate-400 uppercase">Min</Label>
                                                                                    <Input type="number" {...register(`actions.${index}.tiers.${tIdx}.min_qty`)} className="h-10 rounded-lg font-bold text-sm" />
                                                                                </div>
                                                                                <div className="space-y-1.5">
                                                                                    <Label className="text-[9px] font-bold text-slate-400 uppercase">Max</Label>
                                                                                    <Input type="number" {...register(`actions.${index}.tiers.${tIdx}.max_qty`)} placeholder="∞" className="h-10 rounded-lg font-bold text-sm" />
                                                                                </div>
                                                                            </div>
                                                                            <div className="space-y-1.5">
                                                                                <Label className="text-[9px] font-bold text-emerald-600 uppercase">Disc %</Label>
                                                                                <Input type="number" {...register(`actions.${index}.tiers.${tIdx}.value`)} className="h-10 rounded-lg font-bold text-base bg-emerald-50/20 border-emerald-100" />
                                                                            </div>
                                                                            <Button type="button" variant="ghost" size="icon" onClick={() => {
                                                                                const current = watch(`actions.${index}.tiers`) || [];
                                                                                setValue(`actions.${index}.tiers`, current.filter((_, i) => i !== tIdx));
                                                                            }} className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-white shadow-md border border-slate-100 text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            
                                            <div className="p-8 bg-blue-50/50 rounded-[35px] border border-blue-100 flex items-start gap-6">
                                                <ShieldCheck className="w-10 h-10 text-blue-600 shrink-0" />
                                                <div className="space-y-1">
                                                    <p className="font-bold text-blue-900 text-base uppercase tracking-tight">Deployment Ready</p>
                                                    <p className="text-[11px] text-blue-700/80 font-bold uppercase leading-relaxed max-w-2xl">Intelligence node compiled. Finalizing will initiate a global sync across all active tenants.</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row justify-between pt-10 gap-6">
                                                <Button type="button" variant="ghost" onClick={() => setActiveTab('logic')} className="font-bold text-[10px] uppercase text-slate-400 hover:text-slate-900 h-16 px-10">Back to Gates</Button>
                                                <Button type="submit" disabled={!isFullyStaged} className={cn("h-16 sm:h-20 px-14 font-bold text-xs uppercase tracking-widest rounded-[24px] shadow-xl transition-all", isFullyStaged ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100" : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed")}>Commit Deployment <CheckCircle2 className="ml-3 w-6 h-6" /></Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </motion.div>
                        </AnimatePresence>
                    </Tabs>
                </div>

                {/* --- SIDEBAR: REVENUE TELEMETRY --- */}
                <div className="lg:col-span-4 space-y-8 order-1 lg:order-2">
                    <div className="sticky top-8 space-y-8">
                        <Card className="bg-slate-950 border-none rounded-[45px] overflow-hidden shadow-2xl relative">
                            <motion.div animate={{ x: [-600, 600] }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }} className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
                            <CardHeader className="p-10 pb-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <CalcIcon className="w-5 h-5 text-blue-400" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Impact Intelligence</span>
                                </div>
                                <CardTitle className="text-2xl sm:text-3xl font-bold text-white tracking-tight uppercase leading-tight truncate">{watchedData.name || 'VIRTUAL_NODE'}</CardTitle>
                                <div className="flex items-center gap-3 mt-4">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Simulation</span>
                                </div>
                            </CardHeader>
                            
                            <CardContent className="p-10 pt-0 space-y-10">
                                <div className="space-y-6">
                                    <div className="p-8 bg-white/5 rounded-[35px] border border-white/5 space-y-8">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Base Gross</span>
                                            <span className="text-xl font-bold text-white">${telemetry.basePrice.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-emerald-500 uppercase">Total Savings</span>
                                            <span className="text-xl font-bold text-emerald-400">-${telemetry.discountTotal.toLocaleString()}</span>
                                        </div>
                                        <div className="pt-8 border-t border-white/10 flex flex-col gap-6">
                                            <div className="flex justify-between items-end">
                                                <div className="space-y-1.5">
                                                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">Net Price</span>
                                                    <div className="flex items-center gap-3 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                                                        <Target className="w-3.5 h-3.5 text-blue-500" />
                                                        <span className="text-[9px] font-bold text-slate-300 uppercase truncate max-w-[120px]">{telemetry.productName}</span>
                                                    </div>
                                                </div>
                                                <span className="text-4xl sm:text-5xl font-bold text-white tracking-tighter leading-none">${telemetry.finalPrice.toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                                                <Label className="text-[9px] font-bold text-slate-500 uppercase shrink-0">Quantity</Label>
                                                <Input type="number" value={simulatedQty} onChange={(e) => setSimulatedQty(Number(e.target.value))} className="w-16 h-9 bg-white/5 border-white/10 text-white font-bold text-center rounded-lg text-xs" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="p-6 bg-white/5 rounded-[25px] border border-white/10 flex flex-col items-center text-center">
                                        <History className="w-4 h-4 text-slate-500 mb-3" />
                                        <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">State</p>
                                        <p className={cn("text-xs font-bold uppercase", isFullyStaged ? "text-emerald-400" : "text-amber-400")}>{isFullyStaged ? "Compiled" : "Incomplete"}</p>
                                    </div>
                                    <div className="p-6 bg-white/5 rounded-[25px] border border-white/10 flex flex-col items-center text-center">
                                        <Scale className="text-blue-500 mb-3 w-4 h-4" />
                                        <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Impact</p>
                                        <p className="text-xs font-bold text-blue-400">{telemetry.unitImpact.toFixed(1)}%</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        <span>Sync Readiness</span>
                                        <span className={isFullyStaged ? "text-emerald-400" : "text-blue-400"}>{stagedTabs.length}/3</span>
                                    </div>
                                    <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden p-1 border border-white/5">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${(stagedTabs.length / 3) * 100}%` }} className="h-full bg-blue-600 rounded-full shadow-[0_0_20px_#2563eb]" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* UTILITY BUTTONS FROM SECOND PICTURE */}
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { icon: Globe2, label: 'Cross-Branch' },
                                { icon: Landmark, label: 'Tax Sync' },
                                { icon: FileJson, label: 'Audit Log' }
                            ].map((item, i) => (
                                <button 
                                    key={i} 
                                    type="button"
                                    onClick={() => handleUtilityAction(item.label)}
                                    className="flex flex-col items-center justify-center p-5 bg-white rounded-[24px] border border-slate-200 shadow-sm hover:border-blue-300 hover:bg-blue-50/20 transition-all active:scale-95 group"
                                >
                                    <item.icon className="w-5 h-5 text-slate-400 mb-2 group-hover:text-blue-500 transition-colors" />
                                    <span className="text-[9px] font-bold text-slate-500 uppercase text-center leading-tight">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}