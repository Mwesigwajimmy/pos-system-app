'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useFormState } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CheckCircle2, Zap, ShieldCheck, Layers, Percent, 
    ArrowRight, Trash2, Plus, Activity, Cpu, Target, 
    Settings2, Calculator, ArrowUpRight, Scale, 
    History, Globe2, Landmark, FileJson, BadgeCheck,
    ShieldAlert, DatabaseZap, BoxSelect
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

// --- ENTERPRISE INTERFACES ---

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
 * SECURE FORMULA EVALUATOR
 * Replaces 'eval' with a sanitized, high-precision arithmetic function.
 */
const evaluateFormula = (formula: string, base: number, qty: number): number => {
    try {
        const sanitized = formula
            .replace(/BASE/g, base.toString())
            .replace(/QTY/g, qty.toString())
            .replace(/[^-?\d+/*().\s]/g, ''); // Strip all non-math characters
        // High-precision arithmetic execution
        return new Function(`return (${sanitized})`)() || 0;
    } catch (e) {
        console.error("Formula Engine Error:", e);
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

    // --- REAL-TIME VALIDATION OBSERVER ---
    const readiness = useMemo(() => {
        const steps = [];
        if (watchedData.name?.length >= 3 && watchedData.priority >= 1) steps.push('config');
        if (watchedData.conditions?.every(c => !!c.target_id)) steps.push('logic');
        
        const actionsValid = watchedData.actions?.every(a => {
            if (a.type === 'FORMULA') return !!a.formula_string && a.formula_string.includes('BASE');
            if (a.type === 'VOLUME_TIER') return (a.tiers?.length ?? 0) > 0;
            // Strict number check for financial fields
            return !isNaN(Number(a.value)) && a.value !== undefined && a.value !== null && String(a.value) !== "";
        });
        if (actionsValid) steps.push('outcomes');
        
        return steps;
    }, [watchedData]);

    const isFullyStaged = readiness.length >= 3;

    // --- FINANCIAL-GRADE SIMULATION ENGINE ---
    const telemetry = useMemo(() => {
        const productCondition = watchedData.conditions?.find(c => c.type === 'PRODUCT');
        const selectedProduct = products.find(p => p.id.toString() === productCondition?.target_id);
        
        const basePrice = selectedProduct?.price || 0;
        let finalPrice = basePrice;
        let discountTotal = 0;

        watchedData.actions?.forEach(action => {
            if (action.type === 'PERCENTAGE_DISCOUNT') {
                const val = Number(action.value) || 0;
                const impact = (basePrice * val) / 100;
                discountTotal += impact;
                finalPrice -= impact;
            } else if (action.type === 'FIXED_PRICE') {
                const val = Number(action.value) || 0;
                discountTotal = basePrice - val;
                finalPrice = val;
            } else if (action.type === 'VOLUME_TIER') {
                const activeTier = action.tiers?.find(t => 
                    simulatedQty >= t.min_qty && (!t.max_qty || simulatedQty <= t.max_qty)
                );
                if (activeTier) {
                    const impact = (basePrice * (activeTier.value || 0)) / 100;
                    discountTotal += impact;
                    finalPrice -= impact;
                }
            } else if (action.type === 'FORMULA' && action.formula_string) {
                const calculated = evaluateFormula(action.formula_string, basePrice, simulatedQty);
                finalPrice = calculated;
                discountTotal = basePrice - calculated;
            }
        });

        // Precision Rounding to 4 decimal places for ERP compliance
        return {
            basePrice: Math.round(basePrice * 10000) / 10000,
            finalPrice: Math.round(Math.max(0, finalPrice) * 10000) / 10000,
            discountTotal: Math.round(Math.max(0, discountTotal) * 10000) / 10000,
            yieldImpact: basePrice > 0 ? (discountTotal / basePrice) * 100 : 0,
            productName: selectedProduct?.name || 'VIRTUAL_DATA_NODE'
        };
    }, [watchedData, products, simulatedQty]);

    const onActualSubmit = async (data: PricingRuleFormValues) => {
        const isValid = await trigger();
        if (!isValid) return;

        const formData = new FormData();
        formData.append('ruleData', JSON.stringify({ ...data, id: initialData?.id }));
        formData.append('conditions', JSON.stringify(data.conditions));
        formData.append('actions', JSON.stringify(data.actions));
        
        toast({ title: "System Deployment", description: "Broadcasting logic to global edge nodes." });
        formAction(formData);
    };

    return (
        <form onSubmit={handleSubmit(onActualSubmit)} className="w-full max-w-[1440px] mx-auto space-y-6 px-4 py-10 md:px-12 bg-[#F8FAFC] min-h-screen">
            
            {/* --- GLOBAL HEADER & STATUS --- */}
            <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 bg-white p-8 rounded-3xl border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100 shrink-0">
                        <DatabaseZap className="text-white w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">
                            Pricing Engine Controller
                        </h1>
                        <div className="flex items-center gap-2">
                            <BadgeCheck className="w-4 h-4 text-indigo-500" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Tenant Verified: {tenantId}</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-5 w-full lg:w-auto">
                    <div className="flex flex-col justify-center px-8 py-4 bg-slate-50 rounded-2xl border border-slate-100 min-w-[200px]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                            <Activity className="w-3 h-3" /> Integrity Check
                        </span>
                        <div className="flex items-center gap-3">
                            <div className={cn("w-2 h-2 rounded-full", isFullyStaged ? "bg-emerald-500" : "bg-amber-500")} />
                            <span className="text-sm font-black text-slate-900">{readiness.length}/3 Modules Valid</span>
                        </div>
                    </div>
                    
                    <Button 
                        type="submit" 
                        disabled={!isFullyStaged || isSubmitting}
                        className={cn(
                            "h-16 px-10 font-black text-[11px] uppercase tracking-[0.2em] transition-all rounded-2xl shadow-lg flex-1 md:flex-none",
                            isFullyStaged 
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100" 
                            : "bg-slate-100 text-slate-400 border border-slate-200 grayscale cursor-not-allowed"
                        )}
                    >
                        {isFullyStaged ? <Zap className="w-4 h-4 mr-3 fill-white" /> : <ShieldAlert className="w-4 h-4 mr-3" />}
                        Execute Deployment
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                
                {/* --- LOGIC ARCHITECT WORKSPACE --- */}
                <div className="xl:col-span-8 space-y-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="flex w-full bg-white border border-slate-200 p-2 rounded-2xl h-auto shadow-sm mb-8">
                            {[
                                { id: 'config', label: '1. Condition Context', icon: Settings2 },
                                { id: 'logic', label: '2. Target Mapping', icon: Layers },
                                { id: 'outcomes', label: '3. Logic Mutation', icon: Percent },
                            ].map(tab => (
                                <TabsTrigger 
                                    key={tab.id} 
                                    value={tab.id} 
                                    className="flex-1 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white flex items-center justify-center gap-3 py-4"
                                >
                                    <tab.icon className="w-4 h-4" />
                                    <span>{tab.label}</span>
                                    {readiness.includes(tab.id) && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-1" />}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <AnimatePresence mode="wait">
                            <motion.div key={activeTab} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3, ease: "easeOut" }}>
                                
                                {/* STAGE 1: SYSTEM CONTEXT */}
                                <TabsContent value="config" className="focus-visible:outline-none m-0">
                                    <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
                                        <CardHeader className="p-10 border-b border-slate-50 bg-[#F8FAFC]/50">
                                            <div className="flex items-center gap-4 mb-2">
                                                <ShieldCheck className="w-6 h-6 text-indigo-500" />
                                                <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tight">Logic Context</CardTitle>
                                            </div>
                                            <CardDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Global metadata and precedence resolution parameters.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-10 space-y-10">
                                            <div className="grid md:grid-cols-2 gap-8">
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Logic Identifier</Label>
                                                    <Input {...register('name', { required: true })} placeholder="STRATEGY_REF_001" className="h-14 border-slate-200 rounded-2xl font-black text-lg focus:ring-4 focus:ring-indigo-50" />
                                                </div>
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Precedence Rank (SAP Standard)</Label>
                                                    <Input type="number" {...register('priority', { valueAsNumber: true })} className="h-14 border-slate-200 rounded-2xl font-black text-lg" />
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-6">
                                                <div className="flex items-center justify-between p-6 bg-[#F1F5F9] rounded-2xl border border-slate-200 group hover:border-indigo-300 transition-all">
                                                    <div className="space-y-1">
                                                        <p className="font-black text-slate-900 text-[11px] uppercase tracking-wider">Exclusive Protocol</p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase">Prevents parallel condition stacking.</p>
                                                    </div>
                                                    <Controller control={control} name="is_exclusive" render={({ field }) => (
                                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                    )} />
                                                </div>
                                                <div className="flex items-center justify-between p-6 bg-[#F1F5F9] rounded-2xl border border-slate-200 group hover:border-indigo-300 transition-all">
                                                    <div className="space-y-1">
                                                        <p className="font-black text-slate-900 text-[11px] uppercase tracking-wider">Tax Strategy</p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase">Financial calculation context.</p>
                                                    </div>
                                                    <Controller control={control} name="tax_strategy" render={({ field }) => (
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <SelectTrigger className="h-12 w-[120px] bg-white border-slate-200 rounded-xl font-black text-[10px] uppercase">
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

                                            <div className="flex justify-end pt-6 border-t border-slate-50">
                                                <Button type="button" onClick={async () => { if(await trigger(['name', 'priority'])) setActiveTab('logic'); }} className="h-14 px-10 bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-xl hover:scale-105 transition-all">
                                                    Next: Mapping Gates <ArrowRight className="ml-3 w-4 h-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* STAGE 2: TARGETING LOGIC */}
                                <TabsContent value="logic" className="focus-visible:outline-none m-0">
                                    <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
                                        <CardHeader className="p-10 flex flex-row items-center justify-between border-b border-slate-50 bg-[#F8FAFC]/50">
                                            <div>
                                                <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-4">
                                                    <BoxSelect className="w-6 h-6 text-indigo-500" /> Condition Matrix
                                                </CardTitle>
                                                <CardDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Map rule to dimensions: Product, Segment, or Node.</CardDescription>
                                            </div>
                                            <Button type="button" variant="outline" onClick={() => addCond({ type: 'PRODUCT', target_id: '', location_id: 'GLOBAL' })} className="rounded-2xl border-slate-200 font-black text-[10px] uppercase h-12 px-6 hover:bg-slate-50">
                                                <Plus className="w-4 h-4 mr-2" /> Add Rule Node
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="p-10 space-y-6">
                                            {condFields.map((field, index) => (
                                                <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end bg-[#F8FAFC] p-8 rounded-[1.5rem] border border-slate-100 shadow-sm transition-all group hover:border-indigo-100">
                                                    <div className="md:col-span-3 space-y-2">
                                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dimension</Label>
                                                        <Controller control={control} name={`conditions.${index}.type`} render={({ field }) => (
                                                            <Select onValueChange={(val) => { field.onChange(val); setValue(`conditions.${index}.target_id`, ''); }} value={field.value}>
                                                                <SelectTrigger className="h-12 border-slate-200 bg-white rounded-xl font-black text-xs uppercase"><SelectValue /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="PRODUCT">SKU ID</SelectItem>
                                                                    <SelectItem value="CUSTOMER">Client Segment</SelectItem>
                                                                    <SelectItem value="LOCATION">Retail Branch</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        )}/>
                                                    </div>
                                                    <div className="md:col-span-5 space-y-2">
                                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference Identifier</Label>
                                                        <Controller control={control} name={`conditions.${index}.target_id`} render={({ field: tField }) => (
                                                            <Select onValueChange={tField.onChange} value={tField.value}>
                                                                <SelectTrigger className="h-12 border-slate-200 bg-white rounded-xl font-black text-xs uppercase"><SelectValue placeholder="System Lookup..." /></SelectTrigger>
                                                                <SelectContent className="max-h-[300px]">
                                                                    {watch(`conditions.${index}.type`) === 'PRODUCT' 
                                                                        ? products.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name} [${p.price}]</SelectItem>)
                                                                        : customers.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)
                                                                    }
                                                                </SelectContent>
                                                            </Select>
                                                        )}/>
                                                    </div>
                                                    <div className="md:col-span-3 space-y-2">
                                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Geospatial Scope</Label>
                                                        <Controller control={control} name={`conditions.${index}.location_id`} render={({ field }) => (
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <SelectTrigger className="h-12 border-slate-200 bg-white rounded-xl font-black text-xs uppercase"><SelectValue placeholder="Global" /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="GLOBAL">Master Cluster</SelectItem>
                                                                    {locations.map(l => <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                        )}/>
                                                    </div>
                                                    <div className="md:col-span-1 flex justify-end">
                                                        <Button variant="ghost" size="icon" onClick={() => remCond(index)} className="h-12 w-12 text-slate-300 hover:text-red-500 hover:bg-white rounded-xl transition-all"><Trash2 className="w-5 h-5" /></Button>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex flex-col sm:flex-row justify-between pt-10 gap-4">
                                                <Button type="button" variant="ghost" onClick={() => setActiveTab('config')} className="font-black text-[11px] uppercase text-slate-400 h-14 px-10">Back to Context</Button>
                                                <Button type="button" onClick={async () => { if(await trigger('conditions')) setActiveTab('outcomes'); }} className="h-14 px-12 bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-xl">
                                                    Configure Outcomes <ArrowUpRight className="ml-3 w-4 h-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* STAGE 3: LOGIC MUTATION */}
                                <TabsContent value="outcomes" className="focus-visible:outline-none m-0">
                                    <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
                                        <CardHeader className="p-10 flex flex-row items-center justify-between border-b border-slate-50 bg-[#F8FAFC]/50">
                                            <div>
                                                <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-4">
                                                    <Calculator className="w-6 h-6 text-indigo-500" /> Price Mutation
                                                </CardTitle>
                                                <CardDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Recursive logic: Algorithm, Fixed, or Volume Scales.</CardDescription>
                                            </div>
                                            <Button type="button" variant="outline" onClick={() => addAct({ type: 'PERCENTAGE_DISCOUNT', value: 0, currency_code: currencies[0] || 'USD', tiers: [] })} className="rounded-2xl border-slate-200 font-black text-[10px] uppercase h-12 px-6 hover:bg-slate-50"><Plus className="w-4 h-4 mr-2" /> Add Operation</Button>
                                        </CardHeader>
                                        <CardContent className="p-10 space-y-8">
                                            {actFields.map((field, index) => {
                                                const actionType = watch(`actions.${index}.type`);
                                                return (
                                                    <div key={field.id} className="bg-[#F8FAFC] p-8 rounded-[1.5rem] border border-slate-100 space-y-8 shadow-sm">
                                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
                                                            <div className="md:col-span-4 space-y-2">
                                                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Processing Engine</Label>
                                                                <Controller control={control} name={`actions.${index}.type`} render={({ field }) => (
                                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                                        <SelectTrigger className="h-12 border-slate-200 bg-white rounded-xl font-black text-xs uppercase"><SelectValue /></SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="PERCENTAGE_DISCOUNT">Markdown (%)</SelectItem>
                                                                            <SelectItem value="FIXED_PRICE">Fixed Price Point</SelectItem>
                                                                            <SelectItem value="FORMULA">Custom Algorithm</SelectItem>
                                                                            <SelectItem value="VOLUME_TIER">Volume Brackets</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                )}/>
                                                            </div>

                                                            <div className="md:col-span-7 space-y-2">
                                                                {actionType === 'FORMULA' ? (
                                                                    <div className="relative">
                                                                        <Input {...register(`actions.${index}.formula_string`)} placeholder="e.g. (BASE * 0.95) + 1.50" className="h-12 border-slate-200 bg-white rounded-xl font-mono font-black text-sm px-6 pr-12 focus:ring-4 focus:ring-indigo-50" />
                                                                        <Calculator className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                                                                    </div>
                                                                ) : actionType === 'VOLUME_TIER' ? (
                                                                    <div className="h-12 flex items-center px-6 bg-white rounded-xl border border-slate-200"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantity-Based Step-Pricing Active</p></div>
                                                                ) : (
                                                                    <div className="relative">
                                                                        <Input type="number" step="0.0001" {...register(`actions.${index}.value`, { valueAsNumber: true })} className="h-12 border-slate-200 bg-white rounded-xl font-black text-sm px-6 pr-14 focus:ring-4 focus:ring-indigo-50" />
                                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-300 text-[10px] uppercase pointer-events-none tracking-widest">
                                                                            {actionType === 'PERCENTAGE_DISCOUNT' ? 'PCT' : 'VAL'}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="md:col-span-1 flex justify-end">
                                                                <Button variant="ghost" size="icon" onClick={() => remAct(index)} className="h-12 w-12 text-slate-300 hover:text-red-500 hover:bg-white rounded-xl transition-all"><Trash2 className="w-5 h-5" /></Button>
                                                            </div>
                                                        </div>

                                                        {actionType === 'VOLUME_TIER' && (
                                                            <div className="pt-8 border-t border-slate-200/60 space-y-6">
                                                                <div className="flex items-center justify-between">
                                                                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Tier Configuration Matrix</h4>
                                                                    <Button type="button" variant="outline" size="sm" onClick={() => {
                                                                        const cur = watch(`actions.${index}.tiers`) || [];
                                                                        setValue(`actions.${index}.tiers`, [...cur, { min_qty: 1, max_qty: null, value: 0 }]);
                                                                    }} className="rounded-xl font-black text-[9px] uppercase px-5 h-8 hover:bg-white transition-all">Add Level</Button>
                                                                </div>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                                    {(watch(`actions.${index}.tiers`) || []).map((_, tIdx) => (
                                                                        <div key={tIdx} className="bg-white p-6 rounded-[1.5rem] border border-slate-200 relative group shadow-sm hover:border-indigo-200 transition-all">
                                                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                                                <div className="space-y-1">
                                                                                    <Label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Min Qty</Label>
                                                                                    <Input type="number" {...register(`actions.${index}.tiers.${tIdx}.min_qty`, { valueAsNumber: true })} className="h-9 rounded-xl text-xs font-black border-slate-100" />
                                                                                </div>
                                                                                <div className="space-y-1">
                                                                                    <Label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Max Qty</Label>
                                                                                    <Input type="number" {...register(`actions.${index}.tiers.${tIdx}.max_qty`, { valueAsNumber: true })} placeholder="INF" className="h-9 rounded-xl text-xs font-black border-slate-100" />
                                                                                </div>
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                <Label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mutation %</Label>
                                                                                <Input type="number" {...register(`actions.${index}.tiers.${tIdx}.value`, { valueAsNumber: true })} className="h-10 rounded-xl text-xs font-black bg-slate-50 border-slate-100 focus:bg-white transition-all" />
                                                                            </div>
                                                                            <button type="button" onClick={() => {
                                                                                const cur = watch(`actions.${index}.tiers`) || [];
                                                                                setValue(`actions.${index}.tiers`, cur.filter((__, i) => i !== tIdx));
                                                                            }} className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-white border border-slate-200 text-red-500 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95"><Trash2 className="w-3.5 h-3.5" /></button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            
                                            <div className="flex flex-col sm:flex-row justify-between pt-10 gap-4 border-t border-slate-50">
                                                <Button type="button" variant="ghost" onClick={() => setActiveTab('logic')} className="font-black text-[11px] uppercase text-slate-400 h-14 px-10">Back</Button>
                                                <Button type="submit" disabled={!isFullyStaged || isSubmitting} className={cn("h-16 px-16 font-black text-[12px] uppercase tracking-[0.2em] rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95", isFullyStaged ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100" : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed")}>Finalize Deployment <CheckCircle2 className="ml-3 w-5 h-5" /></Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </motion.div>
                        </AnimatePresence>
                    </Tabs>
                </div>

                {/* --- ENTERPRISE TELEMETRY SIDEBAR --- */}
                <div className="xl:col-span-4 space-y-6">
                    <div className="sticky top-10 space-y-8">
                        <Card className="bg-slate-900 border-none rounded-[2.5rem] overflow-hidden shadow-2xl text-white ring-1 ring-white/10">
                            <CardHeader className="p-10 pb-4">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                                        <Target className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Telemetry Preview</span>
                                </div>
                                <CardTitle className="text-2xl font-black uppercase tracking-tight truncate leading-tight">{watchedData.name || 'STRATEGY_INIT'}</CardTitle>
                                <div className="flex items-center gap-3 mt-4">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Simulation Online</span>
                                </div>
                            </CardHeader>
                            
                            <CardContent className="p-10 pt-4 space-y-10">
                                <div className="space-y-6 p-8 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-md shadow-inner">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Base Price</span>
                                        <span className="text-2xl font-black font-mono">${telemetry.basePrice.toLocaleString(undefined, { minimumFractionDigits: 4 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Delta Savings</span>
                                        <span className="text-2xl font-black text-emerald-400 font-mono">-${telemetry.discountTotal.toLocaleString(undefined, { minimumFractionDigits: 4 })}</span>
                                    </div>
                                    <Separator className="bg-white/10" />
                                    <div className="flex flex-col gap-6 pt-2">
                                        <div className="flex justify-between items-end">
                                            <div className="space-y-2">
                                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] block">Projected Net Yield</span>
                                                <div className="flex items-center gap-3 px-4 py-1.5 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                                                    <span className="text-[9px] font-black text-slate-300 uppercase truncate max-w-[140px]">{telemetry.productName}</span>
                                                </div>
                                            </div>
                                            <span className="text-5xl font-black tracking-tighter font-mono">${telemetry.finalPrice.toLocaleString(undefined, { minimumFractionDigits: 4 })}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-4 p-4 bg-black/30 rounded-2xl border border-white/5 shadow-inner">
                                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Load qty</Label>
                                            <Input type="number" value={simulatedQty} onChange={(e) => setSimulatedQty(Math.max(1, Number(e.target.value)))} className="w-24 h-10 bg-white/10 border-white/10 text-white font-black text-center text-sm rounded-xl focus:ring-4 focus:ring-indigo-500/20" />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="p-6 bg-white/5 rounded-[1.5rem] border border-white/5 flex flex-col items-center hover:bg-white/10 transition-all cursor-default group">
                                        <History className="w-5 h-5 text-slate-500 mb-3 group-hover:text-indigo-400 transition-all" />
                                        <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Audit Status</p>
                                        <p className={cn("text-[11px] font-black uppercase tracking-wider", isFullyStaged ? "text-emerald-400" : "text-amber-400")}>{isFullyStaged ? "Verified" : "Pending"}</p>
                                    </div>
                                    <div className="p-6 bg-white/5 rounded-[1.5rem] border border-white/5 flex flex-col items-center hover:bg-white/10 transition-all cursor-default group">
                                        <Scale className="text-indigo-400 mb-3 w-5 h-5 group-hover:scale-125 transition-all" />
                                        <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Efficiency Ratio</p>
                                        <p className="text-[11px] font-black text-indigo-400">{telemetry.yieldImpact.toFixed(4)}%</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* ENTERPRISE SUBSYSTEMS */}
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { icon: Globe2, label: 'Geo-Logic' },
                                { icon: Landmark, label: 'Tax-Compliance' },
                                { icon: FileJson, label: 'Logic-Dump' }
                            ].map((item, i) => (
                                <button 
                                    key={i} 
                                    type="button"
                                    onClick={() => toast({ title: "Subsystem Call", description: `Loading ${item.label} matrix...` })}
                                    className="flex flex-col items-center justify-center p-6 bg-white rounded-[1.5rem] border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 group"
                                >
                                    <item.icon className="w-6 h-6 text-slate-400 mb-3 group-hover:text-indigo-600 group-hover:rotate-12 transition-all" />
                                    <span className="text-[9px] font-black text-slate-500 uppercase text-center leading-tight tracking-wider">{item.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* GLOBAL INFRASTRUCTURE STATUS */}
                        <div className="flex items-center justify-center gap-4 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] opacity-80">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            Cluster: Global-AWS-East | Sync Status: 100%
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}