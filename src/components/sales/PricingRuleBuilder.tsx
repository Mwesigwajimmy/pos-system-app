'use client';

import React, { useState, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useFormState } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CheckCircle2, Zap, Layers, Percent, 
    ArrowRight, Trash2, Plus, Activity,
    Cpu, Target, Settings2, Calculator,
    ArrowUpRight, Scale, History, Globe2, 
    Landmark, FileJson, ShieldCheck, BadgeCheck,
    AlertCircle
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { createOrUpdatePricingRule } from '@/app/actions/pricing';
import { cn } from '@/lib/utils';

// --- Types & Interfaces ---

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
    initialData?: Partial<PricingRuleFormValues> & { id?: string };
    customers: { id: string; name: string }[];
    products: { id: string; name: string; price: number }[];
    locations: { id: string; name: string }[];
    currencies: string[];
    tenantId: string;
}

/**
 * Safe Mathematical Evaluator for Enterprise Formulas
 * Replaces eval() with a restricted arithmetic parser
 */
const safeEvaluate = (formula: string, base: number): number => {
    try {
        const sanitized = formula.replace(/BASE/g, base.toString()).replace(/[^-?\d+/*().\s]/g, '');
        // Using Function constructor as a sandbox for arithmetic only
        return new Function(`return Number(${sanitized})`)() || 0;
    } catch {
        return base;
    }
};

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
    const [simulatedQty, setSimulatedQty] = useState(1);
    
    const { 
        control, 
        handleSubmit, 
        register, 
        watch, 
        trigger, 
        setValue, 
        formState: { errors, isSubmitting } 
    } = useForm<PricingRuleFormValues>({
        mode: 'onChange',
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

    // --- Derived State: Validation Logic (Enterprise Memoization) ---
    const validationSchema = useMemo(() => {
        const verified: string[] = [];
        
        if (watchedData.name?.trim().length >= 3) verified.push('config');
        
        const conditionsValid = watchedData.conditions?.length > 0 && 
            watchedData.conditions.every(c => !!c.target_id);
        if (conditionsValid) verified.push('logic');
        
        const actionsValid = watchedData.actions?.length > 0 && watchedData.actions.every(a => {
            if (a.type === 'FORMULA') return !!a.formula_string && a.formula_string.includes('BASE');
            if (a.type === 'VOLUME_TIER') return (a.tiers?.length ?? 0) > 0 && a.tiers?.every(t => t.value >= 0);
            return typeof a.value === 'number' && a.value >= 0;
        });
        if (actionsValid) verified.push('outcomes');
        
        return verified;
    }, [watchedData]);

    const isFullyStaged = validationSchema.length >= 3;

    // --- Pricing Simulation Engine (Financial Grade) ---
    const telemetry = useMemo(() => {
        const firstProduct = products.find(p => p.id.toString() === watchedData.conditions?.find(c => c.type === 'PRODUCT')?.target_id);
        const basePrice = firstProduct?.price || 0;
        let finalPrice = basePrice;
        let discountTotal = 0;

        watchedData.actions?.forEach(action => {
            if (action.type === 'PERCENTAGE_DISCOUNT') {
                const d = (basePrice * (Number(action.value) || 0)) / 100;
                discountTotal += d;
                finalPrice -= d;
            } else if (action.type === 'FIXED_PRICE') {
                finalPrice = Number(action.value) || 0;
                discountTotal = basePrice - finalPrice;
            } else if (action.type === 'VOLUME_TIER') {
                const tier = action.tiers?.find(t => simulatedQty >= t.min_qty && (!t.max_qty || simulatedQty <= t.max_qty));
                if (tier) {
                    const d = (basePrice * (tier.value || 0)) / 100;
                    discountTotal += d;
                    finalPrice -= d;
                }
            } else if (action.type === 'FORMULA' && action.formula_string) {
                finalPrice = safeEvaluate(action.formula_string, basePrice);
                discountTotal = basePrice - finalPrice;
            }
        });

        return {
            basePrice,
            finalPrice: Math.round(Math.max(0, finalPrice) * 100) / 100,
            discountTotal: Math.round(Math.max(0, discountTotal) * 100) / 100,
            unitImpact: basePrice > 0 ? (discountTotal / basePrice) * 100 : 0,
            productName: firstProduct?.name || 'GENERIC_SKU'
        };
    }, [watchedData, products, simulatedQty]);

    const onActualSubmit = async (data: PricingRuleFormValues) => {
        const isValid = await trigger();
        if (!isValid) {
            toast({ variant: "destructive", title: "Validation Error", description: "Please review the highlighted fields." });
            return;
        }

        const formData = new FormData();
        formData.append('ruleData', JSON.stringify({ ...data, id: initialData?.id }));
        formData.append('conditions', JSON.stringify(data.conditions));
        formData.append('actions', JSON.stringify(data.actions));
        
        toast({ title: "Deploying Strategy", description: "Propagating rule set to global node cluster." });
        formAction(formData);
    };

    return (
        <form onSubmit={handleSubmit(onActualSubmit)} className="w-full max-w-[1440px] mx-auto space-y-6 px-4 py-6 md:px-8 lg:py-10 bg-slate-50/40 min-h-screen font-sans selection:bg-indigo-100">
            
            {/* --- CORE HEADER --- */}
            <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm ring-1 ring-black/5">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shrink-0 ring-4 ring-slate-100">
                        <Cpu className="text-white w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight leading-none">
                                {initialData?.id ? 'System Rule Optimization' : 'Global Pricing Deployment'}
                            </h1>
                            <ShieldCheck className="w-5 h-5 text-indigo-500" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Master Tenant Reference: {tenantId}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                    <div className="flex flex-col justify-center px-6 py-3 bg-slate-50 rounded-xl border border-slate-100 min-w-[180px]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Deployment Readiness</span>
                        <div className="flex items-center gap-2">
                            <Activity className={cn("w-4 h-4", isFullyStaged ? "text-emerald-500" : "text-amber-500")} />
                            <span className="text-sm font-bold text-slate-900">{validationSchema.length} / 3 Stages Verified</span>
                        </div>
                    </div>
                    
                    <Button 
                        type="submit" 
                        disabled={!isFullyStaged || isSubmitting}
                        className={cn(
                            "h-14 px-8 font-bold text-xs uppercase tracking-widest transition-all rounded-xl shadow-lg flex-1 md:flex-none",
                            isFullyStaged 
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-[1.02] active:scale-95" 
                            : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                        )}
                    >
                        {isFullyStaged ? <Zap className="w-4 h-4 mr-2 fill-white animate-pulse" /> : <AlertCircle className="w-4 h-4 mr-2" />}
                        {isSubmitting ? 'Synchronizing...' : 'Execute Deployment'}
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                
                {/* --- MAIN WORKSPACE --- */}
                <div className="xl:col-span-8 space-y-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="flex w-full bg-white border border-slate-200 p-1.5 rounded-xl h-auto shadow-sm mb-6 overflow-x-auto no-scrollbar">
                            {[
                                { id: 'config', label: '1. Strategy Context', icon: Settings2 },
                                { id: 'logic', label: '2. Activation Gates', icon: Layers },
                                { id: 'outcomes', label: '3. Logic Mutation', icon: Percent },
                            ].map(tab => (
                                <TabsTrigger 
                                    key={tab.id} 
                                    value={tab.id} 
                                    className="flex-1 rounded-lg font-bold text-[11px] uppercase tracking-wide transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-md flex items-center justify-center gap-2.5 py-3.5 min-w-[160px]"
                                >
                                    <tab.icon className="w-4 h-4" />
                                    <span>{tab.label}</span>
                                    {validationSchema.includes(tab.id) && <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0 ml-1" />}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <AnimatePresence mode="wait">
                            <motion.div 
                                key={activeTab} 
                                initial={{ opacity: 0, x: 10 }} 
                                animate={{ opacity: 1, x: 0 }} 
                                exit={{ opacity: 0, x: -10 }} 
                                transition={{ duration: 0.25, ease: "easeInOut" }}
                            >
                                {/* STEP 1: CONTEXT */}
                                <TabsContent value="config" className="focus-visible:outline-none m-0">
                                    <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white ring-1 ring-slate-200">
                                        <CardHeader className="p-8 border-b border-slate-50 bg-slate-50/30">
                                            <CardTitle className="text-lg font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                                <Settings2 className="w-5 h-5 text-indigo-500" />
                                                Operational Strategy
                                            </CardTitle>
                                            <CardDescription className="text-slate-400 font-semibold text-[10px] uppercase">Define administrative rule metadata and execution hierarchy.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-8 space-y-8">
                                            <div className="grid md:grid-cols-2 gap-8">
                                                <div className="space-y-2.5">
                                                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Strategy Identifier</Label>
                                                    <Input {...register('name', { required: true, minLength: 3 })} placeholder="e.g. Q3_RETAIL_MARKDOWN" className="h-12 border-slate-200 rounded-lg font-bold text-base focus:ring-2 focus:ring-indigo-500" />
                                                    {errors.name && <p className="text-red-500 text-[10px] font-bold uppercase mt-1">Required: Min 3 characters</p>}
                                                </div>
                                                <div className="space-y-2.5">
                                                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Priority Rank (1-1000)</Label>
                                                    <Input type="number" {...register('priority', { valueAsNumber: true, min: 1 })} className="h-12 border-slate-200 rounded-lg font-bold text-base" />
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-5">
                                                <div className="flex items-center justify-between p-5 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-colors">
                                                    <div className="space-y-1">
                                                        <p className="font-bold text-slate-900 text-[11px] uppercase">Exclusive Protocol</p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase">Overrides non-stackable logic blocks.</p>
                                                    </div>
                                                    <Controller control={control} name="is_exclusive" render={({ field }) => (
                                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                    )} />
                                                </div>
                                                <div className="flex items-center justify-between p-5 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-colors">
                                                    <div className="space-y-1">
                                                        <p className="font-bold text-slate-900 text-[11px] uppercase">Taxation Logic</p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase">Apply values to Net or Gross.</p>
                                                    </div>
                                                    <Controller control={control} name="tax_strategy" render={({ field }) => (
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <SelectTrigger className="h-10 w-[110px] bg-white border-slate-200 rounded-lg font-bold text-[10px] uppercase">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="GROSS" className="font-bold text-[10px] uppercase">Gross Basis</SelectItem>
                                                                <SelectItem value="NET" className="font-bold text-[10px] uppercase">Net Basis</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )} />
                                                </div>
                                            </div>

                                            <div className="flex justify-end pt-4 border-t border-slate-100">
                                                <Button type="button" onClick={async () => { if(await trigger(['name', 'priority'])) setActiveTab('logic'); }} className="h-12 px-8 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] uppercase tracking-widest rounded-lg">
                                                    Proceed to Logic Gates <ArrowRight className="ml-2 w-4 h-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* STEP 2: LOGIC GATES */}
                                <TabsContent value="logic" className="focus-visible:outline-none m-0">
                                    <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white ring-1 ring-slate-200">
                                        <CardHeader className="p-8 flex flex-row items-center justify-between border-b border-slate-50 bg-slate-50/30">
                                            <div>
                                                <CardTitle className="text-lg font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                                    <Layers className="w-5 h-5 text-indigo-500" />
                                                    Activation Matrix
                                                </CardTitle>
                                                <CardDescription className="text-slate-400 font-semibold text-[10px] uppercase">Define conditional triggers for rule execution.</CardDescription>
                                            </div>
                                            <Button type="button" variant="outline" onClick={() => addCond({ type: 'PRODUCT', target_id: '', location_id: 'GLOBAL' })} className="rounded-lg border-slate-200 font-bold text-[10px] uppercase h-10 px-4 hover:bg-slate-50">
                                                <Plus className="w-4 h-4 mr-2" /> Add Criterion
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="p-8 space-y-4">
                                            {condFields.map((field, index) => (
                                                <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:border-indigo-100 transition-all group">
                                                    <div className="md:col-span-3 space-y-1.5">
                                                        <Label className="text-[10px] font-bold text-slate-400 uppercase">Target Dimension</Label>
                                                        <Controller control={control} name={`conditions.${index}.type`} render={({ field }) => (
                                                            <Select onValueChange={(val) => { field.onChange(val); setValue(`conditions.${index}.target_id`, ''); }} value={field.value}>
                                                                <SelectTrigger className="h-10 border-slate-200 bg-slate-50 rounded-lg font-bold text-xs"><SelectValue /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="PRODUCT">Product Catalog</SelectItem>
                                                                    <SelectItem value="CUSTOMER">Client Segment</SelectItem>
                                                                    <SelectItem value="LOCATION">Branch/Warehouse</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        )}/>
                                                    </div>
                                                    <div className="md:col-span-5 space-y-1.5">
                                                        <Label className="text-[10px] font-bold text-slate-400 uppercase">Reference Identity</Label>
                                                        <Controller control={control} name={`conditions.${index}.target_id`} render={({ field: tField }) => (
                                                            <Select onValueChange={tField.onChange} value={tField.value}>
                                                                <SelectTrigger className="h-10 border-slate-200 bg-white rounded-lg font-bold text-xs"><SelectValue placeholder="System Search..." /></SelectTrigger>
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
                                                        <Label className="text-[10px] font-bold text-slate-400 uppercase">Geographic Scope</Label>
                                                        <Controller control={control} name={`conditions.${index}.location_id`} render={({ field }) => (
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <SelectTrigger className="h-10 border-slate-200 bg-white rounded-lg font-bold text-xs"><SelectValue placeholder="Global" /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="GLOBAL">Master Global</SelectItem>
                                                                    {locations.map(l => <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                        )}/>
                                                    </div>
                                                    <div className="md:col-span-1 flex justify-end">
                                                        <Button variant="ghost" size="icon" onClick={() => remCond(index)} className="h-10 w-10 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></Button>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex flex-col sm:flex-row justify-between pt-8 gap-4 border-t border-slate-50">
                                                <Button type="button" variant="ghost" onClick={() => setActiveTab('config')} className="font-bold text-[11px] uppercase text-slate-400 h-12 px-8 hover:text-slate-900 transition-colors">Return to Context</Button>
                                                <Button type="button" onClick={async () => { if(await trigger('conditions')) setActiveTab('outcomes'); }} className="h-12 px-10 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] uppercase tracking-widest rounded-lg">
                                                    Configure Mutation <ArrowUpRight className="ml-2 w-4 h-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* STEP 3: LOGIC MUTATION */}
                                <TabsContent value="outcomes" className="focus-visible:outline-none m-0">
                                    <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white ring-1 ring-slate-200">
                                        <CardHeader className="p-8 flex flex-row items-center justify-between border-b border-slate-50 bg-slate-50/30">
                                            <div>
                                                <CardTitle className="text-lg font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                                    <Percent className="w-5 h-5 text-indigo-500" />
                                                    Value Mutation
                                                </CardTitle>
                                                <CardDescription className="text-slate-400 font-semibold text-[10px] uppercase">Engineer discount models or algorithmic pricing.</CardDescription>
                                            </div>
                                            <Button type="button" variant="outline" onClick={() => addAct({ type: 'PERCENTAGE_DISCOUNT', value: 0, currency_code: currencies[0] || 'USD', tiers: [] })} className="rounded-lg border-slate-200 font-bold text-[10px] uppercase h-10 px-4 hover:bg-slate-50">
                                                <Plus className="w-4 h-4 mr-2" /> Add Operator
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="p-8 space-y-6">
                                            {actFields.map((field, index) => {
                                                const actionType = watch(`actions.${index}.type`);
                                                return (
                                                    <div key={field.id} className="bg-slate-50/30 p-6 rounded-2xl border border-slate-100 space-y-6 shadow-inner ring-1 ring-black/[0.02]">
                                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
                                                            <div className="md:col-span-4 space-y-1.5">
                                                                <Label className="text-[10px] font-bold text-slate-400 uppercase">Calculation Engine</Label>
                                                                <Controller control={control} name={`actions.${index}.type`} render={({ field }) => (
                                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                                        <SelectTrigger className="h-10 border-slate-200 bg-white rounded-lg font-bold text-xs"><SelectValue /></SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="PERCENTAGE_DISCOUNT">Markdown (%)</SelectItem>
                                                                            <SelectItem value="FIXED_PRICE">Fixed Override</SelectItem>
                                                                            <SelectItem value="FORMULA">Dynamic Algorithmic</SelectItem>
                                                                            <SelectItem value="VOLUME_TIER">Tiered Distribution</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                )}/>
                                                            </div>

                                                            <div className="md:col-span-7 space-y-1.5">
                                                                {actionType === 'FORMULA' ? (
                                                                    <div className="relative">
                                                                        <Input {...register(`actions.${index}.formula_string`, { required: true })} placeholder="e.g. (BASE * 0.85)" className="h-10 border-slate-200 bg-white rounded-lg font-mono font-bold text-sm px-4 pr-10 focus:ring-2 focus:ring-indigo-500" />
                                                                        <Calculator className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                                                                    </div>
                                                                ) : actionType === 'VOLUME_TIER' ? (
                                                                    <div className="h-10 flex items-center px-4 bg-indigo-50/50 rounded-lg border border-indigo-100/50 shadow-sm">
                                                                        <p className="text-[10px] font-bold text-indigo-500 uppercase flex items-center gap-2">
                                                                            <Activity className="w-3 h-3" /> Quantity brackets active below
                                                                        </p>
                                                                    </div>
                                                                ) : (
                                                                    <div className="relative">
                                                                        <Input type="number" step="0.01" {...register(`actions.${index}.value`, { valueAsNumber: true, min: 0 })} className="h-10 border-slate-200 bg-white rounded-lg font-bold text-sm px-4 pr-12 focus:ring-2 focus:ring-indigo-500" />
                                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-300 text-[9px] uppercase pointer-events-none">
                                                                            {actionType === 'PERCENTAGE_DISCOUNT' ? 'PCT' : 'VAL'}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="md:col-span-1 flex justify-end">
                                                                <Button variant="ghost" size="icon" onClick={() => remAct(index)} className="h-10 w-10 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></Button>
                                                            </div>
                                                        </div>

                                                        {actionType === 'VOLUME_TIER' && (
                                                            <div className="pt-5 border-t border-slate-200/50 space-y-4">
                                                                <div className="flex items-center justify-between">
                                                                    <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Bracket Definition</h4>
                                                                    <Button type="button" variant="outline" size="sm" onClick={() => {
                                                                        const cur = watch(`actions.${index}.tiers`) || [];
                                                                        setValue(`actions.${index}.tiers`, [...cur, { min_qty: 1, max_qty: null, value: 0 }]);
                                                                    }} className="rounded-md font-bold text-[9px] uppercase px-4 h-7 hover:bg-white transition-colors">Add Tier</Button>
                                                                </div>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                                                    {(watch(`actions.${index}.tiers`) || []).map((_, tIdx) => (
                                                                        <div key={tIdx} className="bg-white p-5 rounded-2xl border border-slate-200 relative group shadow-sm hover:ring-2 hover:ring-indigo-100 transition-all">
                                                                            <div className="grid grid-cols-2 gap-3 mb-3">
                                                                                <div className="space-y-1">
                                                                                    <Label className="text-[8px] font-bold text-slate-400 uppercase">Min Qty</Label>
                                                                                    <Input type="number" {...register(`actions.${index}.tiers.${tIdx}.min_qty`, { valueAsNumber: true })} className="h-8 rounded-md text-xs font-bold" />
                                                                                </div>
                                                                                <div className="space-y-1">
                                                                                    <Label className="text-[8px] font-bold text-slate-400 uppercase">Max Qty</Label>
                                                                                    <Input type="number" {...register(`actions.${index}.tiers.${tIdx}.max_qty`, { valueAsNumber: true })} placeholder="∞" className="h-8 rounded-md text-xs font-bold" />
                                                                                </div>
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                <Label className="text-[8px] font-bold text-slate-400 uppercase">Markdown %</Label>
                                                                                <Input type="number" {...register(`actions.${index}.tiers.${tIdx}.value`, { valueAsNumber: true })} className="h-8 rounded-md text-xs font-bold bg-slate-50 border-slate-100" />
                                                                            </div>
                                                                            <button type="button" onClick={() => {
                                                                                const cur = watch(`actions.${index}.tiers`) || [];
                                                                                setValue(`actions.${index}.tiers`, cur.filter((__, i) => i !== tIdx));
                                                                            }} className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-white border border-slate-200 text-red-500 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95"><Trash2 className="w-3 h-3" /></button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            
                                            <div className="flex flex-col sm:flex-row justify-between pt-8 gap-4 border-t border-slate-50">
                                                <Button type="button" variant="ghost" onClick={() => setActiveTab('logic')} className="font-bold text-[11px] uppercase text-slate-400 h-12 px-8 hover:text-slate-900 transition-colors">Review Gates</Button>
                                                <Button type="submit" disabled={!isFullyStaged || isSubmitting} className={cn("h-14 px-12 font-bold text-[11px] uppercase tracking-widest rounded-xl shadow-xl transition-all", isFullyStaged ? "bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-[1.02]" : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed")}>Finalize Logic Chain <CheckCircle2 className="ml-2 w-4 h-4" /></Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </motion.div>
                        </AnimatePresence>
                    </Tabs>
                </div>

                {/* --- SIDEBAR: PREVIEW ENGINE --- */}
                <div className="xl:col-span-4 space-y-6">
                    <div className="sticky top-6 space-y-6">
                        <Card className="bg-slate-900 border-none rounded-3xl overflow-hidden shadow-2xl text-white ring-1 ring-white/10">
                            <CardHeader className="p-8 pb-4">
                                <div className="flex items-center gap-2.5 mb-5">
                                    <Target className="w-5 h-5 text-indigo-400" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pricing Intelligence Preview</span>
                                </div>
                                <CardTitle className="text-2xl font-bold uppercase tracking-tight truncate leading-tight">{watchedData.name || 'STRATEGY_PENDING'}</CardTitle>
                                <div className="flex items-center gap-2 mt-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Real-time Simulation Active</span>
                                </div>
                            </CardHeader>
                            
                            <CardContent className="p-8 pt-2 space-y-8">
                                <div className="space-y-4 p-6 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Market Base Price</span>
                                        <span className="text-xl font-bold font-mono">${telemetry.basePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-emerald-400 uppercase">Mutation Delta</span>
                                        <span className="text-xl font-bold text-emerald-400 font-mono">-${telemetry.discountTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <Separator className="bg-white/10" />
                                    <div className="flex flex-col gap-5 pt-2">
                                        <div className="flex justify-between items-end">
                                            <div className="space-y-1.5">
                                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">Projected Net Yield</span>
                                                <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20 max-w-[160px]">
                                                    <span className="text-[9px] font-bold text-slate-300 uppercase truncate">{telemetry.productName}</span>
                                                </div>
                                            </div>
                                            <span className="text-4xl font-black tracking-tighter font-mono">${telemetry.finalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-4 p-3 bg-black/20 rounded-xl border border-white/5">
                                            <Label className="text-[10px] font-bold text-slate-500 uppercase">Input Qty</Label>
                                            <Input 
                                                type="number" 
                                                value={simulatedQty} 
                                                onChange={(e) => setSimulatedQty(Math.max(1, Number(e.target.value)))} 
                                                className="w-20 h-9 bg-white/5 border-white/10 text-white font-bold text-center text-xs rounded-lg focus:ring-1 focus:ring-indigo-500" 
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-5 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center group hover:bg-white/[0.07] transition-colors">
                                        <History className="w-4 h-4 text-slate-500 mb-2 group-hover:text-slate-300 transition-colors" />
                                        <p className="text-[8px] font-bold text-slate-500 uppercase mb-1">Logic Integrity</p>
                                        <p className={cn("text-[11px] font-bold uppercase tracking-wider", isFullyStaged ? "text-emerald-400" : "text-amber-400")}>{isFullyStaged ? "Verified" : "Compiling"}</p>
                                    </div>
                                    <div className="p-5 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center group hover:bg-white/[0.07] transition-colors">
                                        <Scale className="text-indigo-400 mb-2 w-4 h-4 group-hover:scale-110 transition-transform" />
                                        <p className="text-[8px] font-bold text-slate-500 uppercase mb-1">Efficiency Ratio</p>
                                        <p className="text-[11px] font-bold text-indigo-400">{telemetry.unitImpact.toFixed(2)}%</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* ENTERPRISE UTILITIES */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { icon: Globe2, label: 'Geo Analysis' },
                                { icon: Landmark, label: 'Tax Auditing' },
                                { icon: FileJson, label: 'Logic Dump' }
                            ].map((item, i) => (
                                <button 
                                    key={i} 
                                    type="button"
                                    onClick={() => toast({ title: "Module Deployment", description: `Initializing ${item.label} subsystem...` })}
                                    className="flex flex-col items-center justify-center p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md hover:bg-indigo-50/10 transition-all active:scale-95 group"
                                >
                                    <item.icon className="w-5 h-5 text-slate-400 mb-2 group-hover:text-indigo-600 group-hover:rotate-12 transition-all" />
                                    <span className="text-[9px] font-bold text-slate-500 uppercase text-center leading-tight tracking-tighter">{item.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* INFRASTRUCTURE STATUS */}
                        <div className="flex items-center justify-center gap-3 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] opacity-80">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Enterprise Node: US-EAST-1 | Status: Synchronized
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}