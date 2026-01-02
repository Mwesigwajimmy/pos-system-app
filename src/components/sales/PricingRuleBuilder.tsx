'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useFormState } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CheckCircle2, Zap, ShieldCheck, Layers, Percent, 
    ArrowRight, Trash2, Plus, Activity,
    Cpu, Target, ChevronRight,
    Settings2, Calculator,
    ArrowUpRight, BarChart3, Lock, Unlock,
    Scale, History, Globe2, Landmark, FileJson,
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
import { createOrUpdatePricingRule } from '@/app/actions/pricing';
import { cn } from '@/lib/utils';

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
    
    const { control, handleSubmit, register, watch, trigger, setValue, formState: { errors, isSubmitting } } = useForm<PricingRuleFormValues>({
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

    // FORM STATUS OBSERVER
    useEffect(() => {
        const subscription = watch((value) => {
            const verified = [];
            if (value.name && value.name.trim().length >= 3) verified.push('config');
            if (value.conditions?.length && value.conditions.every(c => c?.target_id)) verified.push('logic');
            if (value.actions?.length) {
                const actsValid = value.actions.every(a => {
                    if (a?.type === 'FORMULA') return !!a.formula_string;
                    if (a?.type === 'VOLUME_TIER') return (a.tiers?.length ?? 0) > 0;
                    return (a?.value ?? 0) >= 0;
                });
                if (actsValid) verified.push('outcomes');
            }
            setStagedTabs(verified);
        });
        return () => subscription.unsubscribe();
    }, [watch]);

    // PRICING SIMULATION ENGINE
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
                } catch { /* Invalid formula */ }
            }
        });

        return {
            basePrice,
            finalPrice: Math.max(0, finalPrice),
            discountTotal: Math.max(0, discountTotal),
            unitImpact: basePrice > 0 ? (discountTotal / basePrice) * 100 : 0,
            productName: firstProduct?.name || 'VIRTUAL_SKU'
        };
    }, [watchedData.conditions, watchedData.actions, products, simulatedQty]);

    const isFullyStaged = stagedTabs.length >= 3;

    const onActualSubmit = async (data: PricingRuleFormValues) => {
        const isValid = await trigger();
        if (!isValid) return;

        const formData = new FormData();
        formData.append('ruleData', JSON.stringify({ ...data, id: initialData?.id }));
        formData.append('conditions', JSON.stringify(data.conditions));
        formData.append('actions', JSON.stringify(data.actions));
        
        toast({ title: "Deploying...", description: "Synchronizing rule across global tenants." });
        formAction(formData);
    };

    return (
        <form onSubmit={handleSubmit(onActualSubmit)} className="w-full max-w-[1440px] mx-auto space-y-6 px-4 py-6 md:px-8 lg:py-10 bg-slate-50/40 min-h-screen">
            
            {/* --- HEADER CONTROLS --- */}
            <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shrink-0">
                        <Cpu className="text-white w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                            {initialData?.id ? 'Edit Pricing Logic' : 'Pricing Logic Deployment'}
                        </h1>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tenant: {tenantId}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                    <div className="flex flex-col justify-center px-6 py-3 bg-slate-50 rounded-xl border border-slate-100 min-w-[160px]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Validation Status</span>
                        <div className="flex items-center gap-2">
                            <Activity className={cn("w-4 h-4", isFullyStaged ? "text-emerald-500" : "text-amber-500")} />
                            <span className="text-sm font-bold text-slate-900">{stagedTabs.length}/3 steps complete</span>
                        </div>
                    </div>
                    
                    <Button 
                        type="submit" 
                        disabled={!isFullyStaged || isSubmitting}
                        className={cn(
                            "h-14 px-8 font-bold text-xs uppercase tracking-widest transition-all rounded-xl shadow-md flex-1 md:flex-none",
                            isFullyStaged 
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white" 
                            : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                        )}
                    >
                        {isFullyStaged ? <Zap className="w-4 h-4 mr-2 fill-white" /> : <Lock className="w-4 h-4 mr-2" />}
                        Save and Deploy
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                
                {/* --- MAIN WORKSPACE --- */}
                <div className="xl:col-span-8 space-y-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="flex w-full bg-white border border-slate-200 p-1.5 rounded-xl h-auto shadow-sm mb-6 overflow-x-auto no-scrollbar">
                            {[
                                { id: 'config', label: 'Strategy Context', icon: Settings2 },
                                { id: 'logic', label: 'Activation Gates', icon: Layers },
                                { id: 'outcomes', label: 'Logic Definition', icon: Percent },
                            ].map(tab => (
                                <TabsTrigger 
                                    key={tab.id} 
                                    value={tab.id} 
                                    className="flex-1 rounded-lg font-bold text-[11px] uppercase tracking-wide transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white flex items-center justify-center gap-2.5 py-3 min-w-[140px]"
                                >
                                    <tab.icon className="w-3.5 h-3.5" />
                                    <span>{tab.label}</span>
                                    {stagedTabs.includes(tab.id) && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <AnimatePresence mode="wait">
                            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                                
                                {/* STEP 1: CONTEXT */}
                                <TabsContent value="config" className="focus-visible:outline-none m-0">
                                    <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                                        <CardHeader className="p-6 md:p-8 border-b border-slate-50">
                                            <CardTitle className="text-lg font-bold text-slate-900 uppercase tracking-tight">Core Strategy</CardTitle>
                                            <CardDescription className="text-slate-400 font-semibold text-[10px] uppercase">Identify rule handles and execution priority.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-6 md:p-8 space-y-8">
                                            <div className="grid md:grid-cols-2 gap-6">
                                                <div className="space-y-2.5">
                                                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Rule Name</Label>
                                                    <Input {...register('name')} placeholder="e.g. SUMMER_SALE_2026" className="h-12 border-slate-200 rounded-lg font-bold text-base" />
                                                    {errors.name && <p className="text-red-500 text-[10px] font-bold uppercase">{errors.name.message?.toString()}</p>}
                                                </div>
                                                <div className="space-y-2.5">
                                                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Priority Rank (1-1000)</Label>
                                                    <Input type="number" {...register('priority')} className="h-12 border-slate-200 rounded-lg font-bold text-base" />
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div className="flex items-center justify-between p-5 bg-slate-50/50 rounded-xl border border-slate-100">
                                                    <div className="space-y-1">
                                                        <p className="font-bold text-slate-900 text-[11px] uppercase">Exclusive Mode</p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase">Prevents other rules from applying.</p>
                                                    </div>
                                                    <Controller control={control} name="is_exclusive" render={({ field }) => (
                                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                    )} />
                                                </div>
                                                <div className="flex items-center justify-between p-5 bg-slate-50/50 rounded-xl border border-slate-100">
                                                    <div className="space-y-1">
                                                        <p className="font-bold text-slate-900 text-[11px] uppercase">Tax Calculation</p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase">Handle Net or Gross amounts.</p>
                                                    </div>
                                                    <Controller control={control} name="tax_strategy" render={({ field }) => (
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <SelectTrigger className="h-10 w-[100px] bg-white border-slate-200 rounded-lg font-bold text-[10px]">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="GROSS" className="font-bold">Gross</SelectItem>
                                                                <SelectItem value="NET" className="font-bold">Net</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )} />
                                                </div>
                                            </div>

                                            <div className="flex justify-end pt-4">
                                                <Button type="button" onClick={async () => { if(await trigger(['name', 'priority'])) setActiveTab('logic'); }} className="h-12 px-8 bg-slate-900 text-white font-bold text-[11px] uppercase tracking-widest rounded-lg">
                                                    Next: Define Gates <ArrowRight className="ml-2 w-4 h-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* STEP 2: GATES */}
                                <TabsContent value="logic" className="focus-visible:outline-none m-0">
                                    <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                                        <CardHeader className="p-6 md:p-8 flex flex-row items-center justify-between border-b border-slate-50">
                                            <div>
                                                <CardTitle className="text-lg font-bold text-slate-900 uppercase tracking-tight">Activation Matrix</CardTitle>
                                                <CardDescription className="text-slate-400 font-semibold text-[10px] uppercase">Target specific products, customers, or regions.</CardDescription>
                                            </div>
                                            <Button type="button" variant="outline" onClick={() => addCond({ type: 'PRODUCT', target_id: '', location_id: 'GLOBAL' })} className="rounded-lg border-slate-200 font-bold text-[10px] uppercase h-10 px-4">
                                                <Plus className="w-4 h-4 mr-2" /> Add Rule
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="p-6 md:p-8 space-y-4">
                                            {condFields.map((field, index) => (
                                                <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50/30 p-4 rounded-xl border border-slate-100 transition-all">
                                                    <div className="md:col-span-3 space-y-1.5">
                                                        <Label className="text-[10px] font-bold text-slate-400 uppercase">Dimension</Label>
                                                        <Controller control={control} name={`conditions.${index}.type`} render={({ field }) => (
                                                            <Select onValueChange={(val) => { field.onChange(val); setValue(`conditions.${index}.target_id`, ''); }} value={field.value}>
                                                                <SelectTrigger className="h-10 border-slate-200 bg-white rounded-lg font-bold text-xs"><SelectValue /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="PRODUCT">Product SKU</SelectItem>
                                                                    <SelectItem value="CUSTOMER">Customer Segment</SelectItem>
                                                                    <SelectItem value="LOCATION">Branch Location</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        )}/>
                                                    </div>
                                                    <div className="md:col-span-5 space-y-1.5">
                                                        <Label className="text-[10px] font-bold text-slate-400 uppercase">Target Identity</Label>
                                                        <Controller control={control} name={`conditions.${index}.target_id`} render={({ field: tField }) => (
                                                            <Select onValueChange={tField.onChange} value={tField.value}>
                                                                <SelectTrigger className="h-10 border-slate-200 bg-white rounded-lg font-bold text-xs"><SelectValue placeholder="Search..." /></SelectTrigger>
                                                                <SelectContent className="max-h-[300px]">
                                                                    {watch(`conditions.${index}.type`) === 'PRODUCT' 
                                                                        ? products.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name} (${p.price})</SelectItem>)
                                                                        : customers.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)
                                                                    }
                                                                </SelectContent>
                                                            </Select>
                                                        )}/>
                                                    </div>
                                                    <div className="md:col-span-3 space-y-1.5">
                                                        <Label className="text-[10px] font-bold text-slate-400 uppercase">Scope</Label>
                                                        <Controller control={control} name={`conditions.${index}.location_id`} render={({ field }) => (
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <SelectTrigger className="h-10 border-slate-200 bg-white rounded-lg font-bold text-xs"><SelectValue placeholder="Global" /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="GLOBAL">Global</SelectItem>
                                                                    {locations.map(l => <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                        )}/>
                                                    </div>
                                                    <div className="md:col-span-1 flex justify-end">
                                                        <Button variant="ghost" size="icon" onClick={() => remCond(index)} className="h-10 w-10 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></Button>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex flex-col sm:flex-row justify-between pt-8 gap-4">
                                                <Button type="button" variant="ghost" onClick={() => setActiveTab('config')} className="font-bold text-[11px] uppercase text-slate-400 h-12 px-8">Back</Button>
                                                <Button type="button" onClick={async () => { if(await trigger('conditions')) setActiveTab('outcomes'); }} className="h-12 px-10 bg-slate-900 text-white font-bold text-[11px] uppercase tracking-widest rounded-lg">
                                                    Define Logic <ArrowUpRight className="ml-2 w-4 h-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* STEP 3: LOGIC */}
                                <TabsContent value="outcomes" className="focus-visible:outline-none m-0">
                                    <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                                        <CardHeader className="p-6 md:p-8 flex flex-row items-center justify-between border-b border-slate-50">
                                            <div>
                                                <CardTitle className="text-lg font-bold text-slate-900 uppercase tracking-tight">Logic Mutation</CardTitle>
                                                <CardDescription className="text-slate-400 font-semibold text-[10px] uppercase">Define discount formulas or tiered pricing.</CardDescription>
                                            </div>
                                            <Button type="button" variant="outline" onClick={() => addAct({ type: 'PERCENTAGE_DISCOUNT', value: 0, currency_code: currencies[0] || 'USD', tiers: [] })} className="rounded-lg border-slate-200 font-bold text-[10px] uppercase h-10 px-4"><Plus className="w-4 h-4 mr-2" /> New Logic</Button>
                                        </CardHeader>
                                        <CardContent className="p-6 md:p-8 space-y-6">
                                            {actFields.map((field, index) => {
                                                const actionType = watch(`actions.${index}.type`);
                                                return (
                                                    <div key={field.id} className="bg-slate-50/40 p-6 rounded-xl border border-slate-100 space-y-6">
                                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                                            <div className="md:col-span-4 space-y-1.5">
                                                                <Label className="text-[10px] font-bold text-slate-400 uppercase">Calculation Type</Label>
                                                                <Controller control={control} name={`actions.${index}.type`} render={({ field }) => (
                                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                                        <SelectTrigger className="h-10 border-slate-200 bg-white rounded-lg font-bold text-xs"><SelectValue /></SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="PERCENTAGE_DISCOUNT">Percentage (%)</SelectItem>
                                                                            <SelectItem value="FIXED_PRICE">Fixed Override</SelectItem>
                                                                            <SelectItem value="FORMULA">Formula Engine</SelectItem>
                                                                            <SelectItem value="VOLUME_TIER">Tiered Brackets</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                )}/>
                                                            </div>

                                                            <div className="md:col-span-7 space-y-1.5">
                                                                {actionType === 'FORMULA' ? (
                                                                    <div className="relative">
                                                                        <Input {...register(`actions.${index}.formula_string`)} placeholder="e.g. (BASE * 0.9)" className="h-10 border-slate-200 bg-white rounded-lg font-mono font-bold text-sm px-4 pr-10" />
                                                                        <Calculator className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                                                                    </div>
                                                                ) : actionType === 'VOLUME_TIER' ? (
                                                                    <div className="h-10 flex items-center px-4 bg-white rounded-lg border border-slate-200"><p className="text-[10px] font-bold text-slate-400 uppercase">Quantity brackets active below</p></div>
                                                                ) : (
                                                                    <div className="relative">
                                                                        <Input type="number" step="0.01" {...register(`actions.${index}.value`)} className="h-10 border-slate-200 bg-white rounded-lg font-bold text-sm px-4" />
                                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-300 text-[9px] uppercase">VAL</div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="md:col-span-1 flex justify-end">
                                                                <Button variant="ghost" size="icon" onClick={() => remAct(index)} className="h-10 w-10 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></Button>
                                                            </div>
                                                        </div>

                                                        {actionType === 'VOLUME_TIER' && (
                                                            <div className="pt-4 border-t border-slate-200/60 space-y-4">
                                                                <div className="flex items-center justify-between">
                                                                    <h4 className="text-[10px] font-bold text-slate-900 uppercase">Tiered Distribution</h4>
                                                                    <Button type="button" variant="outline" size="sm" onClick={() => {
                                                                        const cur = watch(`actions.${index}.tiers`) || [];
                                                                        setValue(`actions.${index}.tiers`, [...cur, { min_qty: 1, max_qty: null, value: 0 }]);
                                                                    }} className="rounded-md font-bold text-[9px] uppercase px-3 h-7">Add Tier</Button>
                                                                </div>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                    {(watch(`actions.${index}.tiers`) || []).map((_, tIdx) => (
                                                                        <div key={tIdx} className="bg-white p-4 rounded-xl border border-slate-200 relative group">
                                                                            <div className="grid grid-cols-2 gap-3 mb-2">
                                                                                <Input type="number" {...register(`actions.${index}.tiers.${tIdx}.min_qty`)} placeholder="Min" className="h-8 rounded-md text-xs font-bold" />
                                                                                <Input type="number" {...register(`actions.${index}.tiers.${tIdx}.max_qty`)} placeholder="Max" className="h-8 rounded-md text-xs font-bold" />
                                                                            </div>
                                                                            <Input type="number" {...register(`actions.${index}.tiers.${tIdx}.value`)} placeholder="Disc %" className="h-8 rounded-md text-xs font-bold bg-slate-50 border-slate-100" />
                                                                            <button type="button" onClick={() => {
                                                                                const cur = watch(`actions.${index}.tiers`) || [];
                                                                                setValue(`actions.${index}.tiers`, cur.filter((__, i) => i !== tIdx));
                                                                            }} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-white border border-slate-200 text-red-500 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            
                                            <div className="flex flex-col sm:flex-row justify-between pt-8 gap-4">
                                                <Button type="button" variant="ghost" onClick={() => setActiveTab('logic')} className="font-bold text-[11px] uppercase text-slate-400 h-12 px-8">Back</Button>
                                                <Button type="submit" disabled={!isFullyStaged || isSubmitting} className={cn("h-14 px-12 font-bold text-[11px] uppercase tracking-widest rounded-xl shadow-lg transition-all", isFullyStaged ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed")}>Finalize Deployment <CheckCircle2 className="ml-2 w-4 h-4" /></Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </motion.div>
                        </AnimatePresence>
                    </Tabs>
                </div>

                {/* --- SIDEBAR: PREVIEW --- */}
                <div className="xl:col-span-4 space-y-6">
                    <div className="sticky top-6 space-y-6">
                        <Card className="bg-slate-900 border-none rounded-2xl overflow-hidden shadow-xl text-white">
                            <CardHeader className="p-8 pb-4">
                                <div className="flex items-center gap-2.5 mb-4">
                                    <Target className="w-4 h-4 text-indigo-400" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pricing Simulation</span>
                                </div>
                                <CardTitle className="text-xl font-bold uppercase tracking-tight truncate">{watchedData.name || 'UNNAMED_RULE'}</CardTitle>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Active Preview</span>
                                </div>
                            </CardHeader>
                            
                            <CardContent className="p-8 pt-0 space-y-8">
                                <div className="space-y-4 p-6 bg-white/5 rounded-xl border border-white/10">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Base Price</span>
                                        <span className="text-lg font-bold">${telemetry.basePrice.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-emerald-400 uppercase">Savings Impact</span>
                                        <span className="text-lg font-bold text-emerald-400">-${telemetry.discountTotal.toLocaleString()}</span>
                                    </div>
                                    <Separator className="bg-white/10" />
                                    <div className="flex flex-col gap-4">
                                        <div className="flex justify-between items-end">
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest block">Simulated Net</span>
                                                <div className="flex items-center gap-2 px-2.5 py-0.5 bg-indigo-500/10 rounded-full border border-indigo-500/20 max-w-[140px]">
                                                    <span className="text-[8px] font-bold text-slate-300 uppercase truncate">{telemetry.productName}</span>
                                                </div>
                                            </div>
                                            <span className="text-3xl font-bold tracking-tight">${telemetry.finalPrice.toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 pt-2">
                                            <Label className="text-[9px] font-bold text-slate-500 uppercase">Preview Qty</Label>
                                            <Input type="number" value={simulatedQty} onChange={(e) => setSimulatedQty(Number(e.target.value))} className="w-16 h-8 bg-white/10 border-white/20 text-white font-bold text-center text-xs rounded-md" />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex flex-col items-center">
                                        <History className="w-3.5 h-3.5 text-slate-500 mb-2" />
                                        <p className="text-[8px] font-bold text-slate-500 uppercase mb-0.5">Status</p>
                                        <p className={cn("text-[10px] font-bold uppercase", isFullyStaged ? "text-emerald-400" : "text-amber-400")}>{isFullyStaged ? "Valid" : "Incomplete"}</p>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex flex-col items-center">
                                        <Scale className="text-indigo-400 mb-2 w-3.5 h-3.5" />
                                        <p className="text-[8px] font-bold text-slate-500 uppercase mb-0.5">Yield</p>
                                        <p className="text-[10px] font-bold text-indigo-400">{telemetry.unitImpact.toFixed(1)}%</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* UTILITIES */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { icon: Globe2, label: 'Geography' },
                                { icon: Landmark, label: 'Taxation' },
                                { icon: FileJson, label: 'Audit Log' }
                            ].map((item, i) => (
                                <button 
                                    key={i} 
                                    type="button"
                                    onClick={() => toast({ title: "Module Ready", description: `Loading ${item.label} matrix...` })}
                                    className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:bg-indigo-50/20 transition-all active:scale-95 group"
                                >
                                    <item.icon className="w-4 h-4 text-slate-400 mb-1.5 group-hover:text-indigo-600" />
                                    <span className="text-[8px] font-bold text-slate-500 uppercase text-center leading-tight">{item.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* SYSTEM STATUS */}
                        <div className="flex items-center justify-center gap-3 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-60">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            System Online | Sync Status: 100%
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}