'use client';

import React, { useState, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useFormState } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CheckCircle2, Zap, ShieldCheck, Layers, Percent, 
    ArrowRight, Trash2, Plus, Activity, ShieldAlert,
    Cpu, ChevronRight, Settings2, Calculator, Info
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createOrUpdatePricingRule } from '@/app/actions/pricing';
import { cn } from '@/lib/utils';

interface BuilderProps {
    initialData?: any;
    customers: { id: string; name: string }[];
    // Real Enterprise: Products must include price for the math engine to work
    products: { id: string; name: string; price: number }[]; 
    locations: { id: string; name: string }[];
    currencies: string[];
    tenantId: string;
}

export function PricingRuleBuilder({ 
    initialData, customers, products, locations, currencies, tenantId 
}: BuilderProps) {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("config");
    const [stagedTabs, setStagedTabs] = useState<string[]>([]);
    
    const { control, handleSubmit, register, watch, trigger, setValue, formState: { errors } } = useForm({
        defaultValues: {
            tenant_id: tenantId,
            name: initialData?.name || '',
            description: initialData?.description || '',
            priority: initialData?.priority || 1,
            is_active: initialData?.is_active ?? true,
            is_stackable: initialData?.is_stackable ?? false,
            conditions: initialData?.conditions || [],
            actions: initialData?.actions || [],
        },
    });

    const { fields: condFields, append: addCond, remove: remCond } = useFieldArray({ control, name: "conditions" });
    const { fields: actFields, append: addAct, remove: remAct } = useFieldArray({ control, name: "actions" });

    const watchedData = watch();
    const [state, formAction] = useFormState(createOrUpdatePricingRule, { success: false, message: '' });

    // --- REAL ENTERPRISE MATH ENGINE ---
    const pricingCalculation = useMemo(() => {
        // Find the first selected product price as our calculation base
        // FIXED: Added explicit types to 'c' to prevent TS implicit any error
        const firstProductCondition = (watchedData.conditions as any[]).find((c: any) => c.type === 'PRODUCT' && c.target_id);
        const product = products.find(p => p.id === firstProductCondition?.target_id);
        const basePrice = product?.price || 100; // Fallback to 100 for percentage visualization

        let finalPrice = basePrice;
        let totalDiscount = 0;

        // FIXED: Added explicit types to 'action' to prevent follow-up build errors
        (watchedData.actions as any[]).forEach((action: any) => {
            if (action.type === 'FIXED_PRICE') {
                const diff = basePrice - (Number(action.value) || 0);
                totalDiscount += diff;
                finalPrice = Number(action.value) || 0;
            } else if (action.type === 'PERCENTAGE_DISCOUNT') {
                const discount = (basePrice * (Number(action.value) || 0)) / 100;
                totalDiscount += discount;
                finalPrice -= discount;
            }
        });

        return {
            basePrice,
            finalPrice: Math.max(0, finalPrice),
            totalDiscount: Math.max(0, totalDiscount),
            hasRealProduct: !!product
        };
    }, [watchedData.conditions, watchedData.actions, products]);

    const onActualSubmit = (data: any) => {
        const formData = new FormData();
        const { conditions, actions, ...ruleDetails } = data;
        formData.append('ruleData', JSON.stringify({ ...ruleDetails, id: initialData?.id }));
        formData.append('conditions', JSON.stringify(conditions || []));
        formData.append('actions', JSON.stringify(actions || []));
        formAction(formData);
    };

    const stageSection = async (tab: string, nextTab?: string) => {
        const fieldsToValidate: any = tab === 'config' ? ['name', 'priority'] : tab === 'logic' ? ['conditions'] : ['actions'];
        const isValid = await trigger(fieldsToValidate);
        if (isValid) {
            setStagedTabs(prev => Array.from(new Set([...prev, tab])));
            if (nextTab) setActiveTab(nextTab);
        } else {
            toast({ title: "Validation Error", description: "Incomplete logic detected.", variant: "destructive" });
        }
    };

    const isFullyStaged = stagedTabs.length >= 3;

    return (
        <form onSubmit={handleSubmit(onActualSubmit)} className="w-full max-w-[1600px] mx-auto p-4 md:p-8 space-y-8 bg-[#f8fafc] min-h-screen">
            
            {/* ENTERPRISE HEADER */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-xl">
                        <Cpu className="text-white w-8 h-8" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-blue-600 text-white font-bold px-2 py-0.5 text-[10px] uppercase tracking-tighter">PRICING_ENGINE_V4</Badge>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Enterprise Node</span>
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                            {initialData?.id ? 'Modify Deployment' : 'New Pricing Deployment'}
                        </h1>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                    <div className="flex-1 sm:flex-none flex items-center gap-3 px-5 py-3 bg-emerald-50 rounded-xl border border-emerald-100">
                        <Activity className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">{stagedTabs.length}/3 Verified</span>
                    </div>
                    <Button 
                        type="submit" 
                        disabled={!isFullyStaged}
                        className={cn(
                            "flex-1 xl:flex-none h-14 px-10 font-black text-sm uppercase tracking-widest transition-all rounded-2xl",
                            isFullyStaged 
                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 shadow-xl hover:-translate-y-1" 
                            : "bg-slate-100 text-slate-400 cursor-not-allowed"
                        )}
                    >
                        <Zap className="w-5 h-5 mr-2" /> Commit to Production
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* WORKSPACE */}
                <div className="lg:col-span-8 space-y-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid grid-cols-3 w-full bg-white border border-slate-200 p-2 rounded-2xl h-20 shadow-sm">
                            {[
                                { id: 'config', label: '1. Context', icon: Settings2 },
                                { id: 'logic', label: '2. Conditions', icon: Layers },
                                { id: 'outcomes', label: '3. Outcomes', icon: Percent },
                            ].map(tab => (
                                <TabsTrigger 
                                    key={tab.id} 
                                    value={tab.id} 
                                    className="rounded-xl font-bold text-xs md:text-sm transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white flex items-center justify-center gap-2 h-full"
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                    {stagedTabs.includes(tab.id) && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <AnimatePresence mode="wait">
                            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
                                
                                <TabsContent value="config">
                                    <Card className="border-slate-200 shadow-xl rounded-[32px] overflow-hidden bg-white">
                                        <CardHeader className="p-8 md:p-10 border-b border-slate-50 bg-slate-50/30">
                                            <CardTitle className="text-2xl font-black text-slate-900">Deployment Identity</CardTitle>
                                            <CardDescription className="text-slate-500 font-bold">Define the scope and priority of this logic node.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-8 md:p-10 space-y-10">
                                            <div className="grid md:grid-cols-2 gap-8">
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logic Handle</Label>
                                                    <Input {...register('name')} placeholder="e.g. CORE_REVENUE_25" className="h-16 border-slate-200 bg-white rounded-2xl font-bold text-lg px-6 focus:ring-4 focus:ring-blue-500/10" />
                                                </div>
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Execution Priority (0-100)</Label>
                                                    <Input type="number" {...register('priority')} className="h-16 border-slate-200 bg-white rounded-2xl font-bold text-lg px-6" />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between p-8 bg-blue-50/50 rounded-3xl border border-blue-100 shadow-inner">
                                                <div className="flex items-center gap-5">
                                                    <div className="p-4 bg-white rounded-2xl shadow-sm border border-blue-100">
                                                        <ShieldCheck className="w-6 h-6 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 text-sm uppercase">Production Live Status</p>
                                                        <p className="text-xs text-slate-500 font-bold">When enabled, this rule takes effect immediately across all points of sale.</p>
                                                    </div>
                                                </div>
                                                <Controller control={control} name="is_active" render={({ field }) => (
                                                    <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-blue-600" />
                                                )} />
                                            </div>
                                            <div className="flex justify-end">
                                                <Button type="button" onClick={() => stageSection('config', 'logic')} className="h-16 px-12 bg-slate-900 text-white font-black rounded-2xl hover:bg-black transition-all group uppercase tracking-widest text-xs">
                                                    Verify Parameters <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="logic">
                                    <Card className="border-slate-200 shadow-xl rounded-[32px] overflow-hidden bg-white">
                                        <CardHeader className="p-8 md:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-slate-50 bg-slate-50/30">
                                            <div>
                                                <CardTitle className="text-2xl font-black text-slate-900">Condition Matrix</CardTitle>
                                                <CardDescription className="text-slate-500 font-bold">Specify the triggers that activate this rule.</CardDescription>
                                            </div>
                                            <Button type="button" onClick={() => addCond({ type: 'PRODUCT', target_id: '', branch_id: '', quantity_min: 1 })} className="w-full sm:w-auto rounded-2xl bg-blue-600 text-white font-black h-14 px-8 shadow-lg shadow-blue-100">
                                                <Plus className="w-5 h-5 mr-2" /> Add Trigger
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="p-8 md:p-10 space-y-6">
                                            {condFields.length === 0 && (
                                                <div className="py-24 text-center border-4 border-dashed border-slate-50 rounded-[40px]">
                                                    <Layers className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                                                    <p className="text-slate-400 font-black text-sm tracking-[0.2em] uppercase">Global Execution Scope</p>
                                                </div>
                                            )}
                                            {condFields.map((field, index) => {
                                                const currentType = watch(`conditions.${index}.type`);
                                                return (
                                                    <div key={field.id} className="flex flex-col lg:grid lg:grid-cols-12 gap-6 items-end bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all">
                                                        <div className="w-full lg:col-span-3 space-y-2">
                                                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logic Group</Label>
                                                            <Controller control={control} name={`conditions.${index}.type`} render={({ field }) => (
                                                                <Select onValueChange={(val) => { field.onChange(val); setValue(`conditions.${index}.target_id`, ''); }} value={field.value}>
                                                                    <SelectTrigger className="h-14 border-slate-200 rounded-2xl font-bold bg-slate-50/50">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="rounded-2xl border-slate-200 shadow-2xl">
                                                                        <SelectItem value="PRODUCT">Product Catalog</SelectItem>
                                                                        <SelectItem value="CUSTOMER">Customer Segment</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            )}/>
                                                        </div>

                                                        {/* FIXED SELECTION & OVERLAP */}
                                                        <div className="w-full lg:col-span-5 space-y-2">
                                                            <Label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                                                                Target {currentType === 'PRODUCT' ? 'Product' : 'Customer'}
                                                            </Label>
                                                            <Controller control={control} name={`conditions.${index}.target_id`} render={({ field: targetField }) => (
                                                                <Select key={`${currentType}-${index}`} onValueChange={targetField.onChange} value={targetField.value}>
                                                                    <SelectTrigger className="h-14 border-blue-200 bg-blue-50/30 rounded-2xl font-black text-blue-900">
                                                                        <SelectValue placeholder="Select Target..." />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="rounded-2xl max-h-[400px] shadow-2xl">
                                                                        {currentType === 'PRODUCT' 
                                                                            ? products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} - ${p.price}</SelectItem>)
                                                                            : customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)
                                                                        }
                                                                    </SelectContent>
                                                                </Select>
                                                            )}/>
                                                        </div>

                                                        <div className="w-full lg:col-span-3 space-y-2">
                                                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</Label>
                                                            <Controller control={control} name={`conditions.${index}.branch_id`} render={({ field }) => (
                                                                <Select onValueChange={field.onChange} value={field.value}>
                                                                    <SelectTrigger className="h-14 border-slate-200 rounded-2xl font-bold">
                                                                        <SelectValue placeholder="All Branches" />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="rounded-2xl">
                                                                        {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                                                                    </SelectContent>
                                                                </Select>
                                                            )}/>
                                                        </div>

                                                        <div className="w-full lg:col-span-1 flex justify-end">
                                                            <Button variant="ghost" size="icon" onClick={() => remCond(index)} className="h-14 w-14 rounded-2xl text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all">
                                                                <Trash2 className="w-6 h-6" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            <div className="flex flex-col sm:flex-row justify-between pt-8 gap-4">
                                                <Button type="button" variant="ghost" onClick={() => setActiveTab('config')} className="h-14 px-8 font-black text-slate-500 uppercase tracking-widest text-xs">Previous</Button>
                                                <Button type="button" onClick={() => stageSection('logic', 'outcomes')} className="h-14 px-12 bg-slate-900 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-xs">
                                                    Deploy Conditions <ChevronRight className="ml-2 w-5 h-5" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="outcomes">
                                    <Card className="border-slate-200 shadow-xl rounded-[32px] overflow-hidden bg-white">
                                        <CardHeader className="p-8 md:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-slate-50 bg-slate-50/30">
                                            <div>
                                                <CardTitle className="text-2xl font-black text-slate-900">Revenue Mutations</CardTitle>
                                                <CardDescription className="text-slate-500 font-bold">Define the financial adjustments applied by this node.</CardDescription>
                                            </div>
                                            <Button type="button" onClick={() => addAct({ type: 'PERCENTAGE_DISCOUNT', value: 0, currency_code: currencies[0] })} className="w-full sm:w-auto rounded-2xl bg-emerald-600 text-white font-black h-14 px-8 shadow-lg shadow-emerald-100">
                                                <Plus className="w-5 h-5 mr-2" /> Add Mutation
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="p-8 md:p-10 space-y-6">
                                            {actFields.map((field, index) => (
                                                <div key={field.id} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end bg-slate-50/50 p-8 rounded-[32px] border border-slate-100">
                                                    <div className="lg:col-span-5 space-y-2">
                                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mutation Strategy</Label>
                                                        <Controller control={control} name={`actions.${index}.type`} render={({ field }) => (
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <SelectTrigger className="h-14 border-slate-200 bg-white rounded-2xl font-black">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent className="rounded-2xl shadow-2xl">
                                                                    <SelectItem value="FIXED_PRICE">Fixed Unit Price</SelectItem>
                                                                    <SelectItem value="PERCENTAGE_DISCOUNT">Percentage Rebate (%)</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        )}/>
                                                    </div>
                                                    <div className="lg:col-span-5 space-y-2">
                                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adjustment Value</Label>
                                                        <div className="relative">
                                                            <Input type="number" step="0.01" {...register(`actions.${index}.value`)} className="h-14 border-slate-200 bg-white rounded-2xl font-black text-xl pl-16 focus:ring-4 focus:ring-emerald-500/10" />
                                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs uppercase">Value</div>
                                                        </div>
                                                    </div>
                                                    <div className="lg:col-span-2 flex justify-end">
                                                        <Button variant="ghost" size="icon" onClick={() => remAct(index)} className="h-14 w-14 rounded-2xl text-slate-300 hover:text-red-600 hover:bg-red-50">
                                                            <Trash2 className="w-6 h-6" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex flex-col sm:flex-row justify-between pt-8 gap-4">
                                                <Button type="button" variant="ghost" onClick={() => setActiveTab('logic')} className="h-14 px-8 font-black text-slate-500 uppercase text-xs">Back</Button>
                                                <Button type="button" onClick={() => stageSection('outcomes')} className="h-16 px-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-2xl shadow-emerald-100 transition-all uppercase tracking-widest text-xs">
                                                    Finalize Deployment <CheckCircle2 className="ml-2 w-6 h-6" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </motion.div>
                        </AnimatePresence>
                    </Tabs>
                </div>

                {/* REAL MATH SIDEBAR */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="sticky top-12 space-y-6">
                        <Card className="bg-slate-900 border-none rounded-[40px] overflow-hidden shadow-2xl">
                            <div className="h-3 w-full bg-blue-600" />
                            <CardHeader className="p-8 md:p-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <Calculator className="w-5 h-5 text-blue-400" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Financial Impact Engine</span>
                                </div>
                                <CardTitle className="text-2xl font-black text-white tracking-tight">
                                    {watchedData.name || 'UNNAMED_NODE'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 md:p-10 pt-0 space-y-10">
                                
                                {/* REAL MATH RESULTS */}
                                <div className="space-y-6">
                                    <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-500 uppercase">Unit Base Price</span>
                                            <span className="text-lg font-bold text-white">${pricingCalculation.basePrice.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-emerald-500 uppercase">Total Saving</span>
                                            <span className="text-lg font-bold text-emerald-400">-${pricingCalculation.totalDiscount.toFixed(2)}</span>
                                        </div>
                                        <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                                            <span className="text-xs font-black text-blue-400 uppercase">New Unit Cost</span>
                                            <span className="text-3xl font-black text-white tracking-tighter">${pricingCalculation.finalPrice.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {!pricingCalculation.hasRealProduct && (
                                        <div className="flex items-start gap-3 p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                                            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-amber-200/70 font-bold leading-relaxed">
                                                Visualizing math using GLOBAL_BASE ($100). Select a Product Catalog target for specific revenue impact.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                                        <p className="text-[9px] font-black text-slate-500 uppercase mb-2">Integrity</p>
                                        <p className="text-lg font-black text-white">{stagedTabs.length}/3</p>
                                    </div>
                                    <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                                        <p className="text-[9px] font-black text-slate-500 uppercase mb-2">Rank</p>
                                        <p className="text-lg font-black text-blue-400">#{watchedData.priority}</p>
                                    </div>
                                </div>

                                <div className="pt-4 space-y-4">
                                    <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase">
                                        <span>Pipeline Progress</span>
                                        <span className={isFullyStaged ? "text-emerald-400" : "text-blue-400"}>
                                            {isFullyStaged ? "Deployment Ready" : "Initializing..."}
                                        </span>
                                    </div>
                                    <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                                        <motion.div animate={{ width: `${(stagedTabs.length / 3) * 100}%` }} className="h-full bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)]" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {!isFullyStaged && (
                            <Alert className="bg-blue-600 border-none rounded-3xl p-6 text-white shadow-2xl">
                                <ShieldAlert className="h-6 w-6 text-blue-200" />
                                <AlertTitle className="text-xs font-black uppercase tracking-[0.2em] mb-2">Enterprise Security Lock</AlertTitle>
                                <AlertDescription className="text-xs font-bold text-blue-100/80 leading-relaxed">
                                    Full logic verification is required before committing to production. Complete Context, Conditions, and Outcomes.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                </div>
            </div>
        </form>
    );
}