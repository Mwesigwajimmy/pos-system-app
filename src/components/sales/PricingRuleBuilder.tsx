'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useFormState } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CheckCircle2, Zap, ShieldCheck, Layers, Percent, 
    ArrowRight, Trash2, Plus, Activity, ShieldAlert,
    Cpu, Calculator, Info, Settings2, ChevronRight
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
    
    const { control, handleSubmit, register, watch, trigger, setValue, formState: { errors } } = useForm({
        defaultValues: {
            tenant_id: tenantId,
            name: initialData?.name || '',
            description: initialData?.description || '',
            priority: initialData?.priority || 1,
            is_active: initialData?.is_active ?? true,
            is_stackable: initialData?.is_stackable ?? false,
            conditions: initialData?.conditions || [{ type: 'PRODUCT', target_id: '', location_id: 'GLOBAL' }],
            actions: initialData?.actions || [{ type: 'PERCENTAGE_DISCOUNT', value: 0, currency_code: currencies[0] }],
        },
    });

    const { fields: condFields, append: addCond, remove: remCond } = useFieldArray({ control, name: "conditions" });
    const { fields: actFields, append: addAct, remove: remAct } = useFieldArray({ control, name: "actions" });

    const [state, formAction] = useFormState(createOrUpdatePricingRule, { success: false, message: '' });

    // --- AUTONOMOUS INTEGRITY ENGINE ---
    // Watches every keystroke and automatically records activity for each node
    useEffect(() => {
        const subscription = watch((value) => {
            const verified = [];
            // Step 1 Check
            if (value.name?.trim() && Number(value.priority) >= 0) verified.push('config');
            // Step 2 Check (Must have a product target)
            if (value.conditions?.some((c: any) => c.target_id && c.target_id !== "")) verified.push('logic');
            // Step 3 Check (Must have a value > 0)
            if (value.actions?.some((a: any) => Number(a.value) > 0)) verified.push('outcomes');
            
            setStagedTabs(verified);
        });
        return () => subscription.unsubscribe();
    }, [watch]);

    // --- REAL ENTERPRISE MATH ENGINE ---
    const pricingCalculation = useMemo(() => {
        const conditions = watch('conditions') as any[];
        const actions = watch('actions') as any[];

        const firstProductCondition = conditions?.find((c: any) => c.type === 'PRODUCT' && c.target_id);
        const product = products.find(p => p.id.toString() === firstProductCondition?.target_id?.toString());
        const basePrice = product?.price || 0;

        let finalPrice = basePrice;
        let totalDiscount = 0;

        actions?.forEach((action: any) => {
            const val = Number(action.value) || 0;
            if (action.type === 'FIXED_PRICE') {
                totalDiscount = basePrice - val;
                finalPrice = val;
            } else if (action.type === 'PERCENTAGE_DISCOUNT') {
                const discount = (basePrice * val) / 100;
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
    }, [watch('conditions'), watch('actions'), products]);

    const onActualSubmit = (data: any) => {
        const formData = new FormData();
        const { conditions, actions, ...ruleDetails } = data;
        formData.append('ruleData', JSON.stringify({ ...ruleDetails, id: initialData?.id }));
        formData.append('conditions', JSON.stringify(conditions || []));
        formData.append('actions', JSON.stringify(actions || []));
        formAction(formData);
    };

    const isFullyStaged = stagedTabs.length >= 3;
    const watchedData = watch();

    // Helper to check if a specific tab is ready to proceed
    const isTabVerified = (tab: string) => stagedTabs.includes(tab);

    return (
        <form onSubmit={handleSubmit(onActualSubmit)} className="w-full space-y-8">
            
            {/* ENGINE STATUS BAR */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
                        <Cpu className="text-white w-7 h-7" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-blue-50 text-blue-600 border-blue-100 font-bold px-2 py-0 text-[10px] uppercase">
                                Multi-Tenant Node
                            </Badge>
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Logic v4.2.0</span>
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tighter">
                            {initialData?.id ? 'Edit Configuration' : 'Deploy Pricing Logic'}
                        </h1>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                    <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 transition-all">
                        <Activity className={cn("w-4 h-4 transition-colors", isFullyStaged ? "text-emerald-500 animate-pulse" : "text-amber-500")} />
                        <span className="text-xs font-bold text-slate-600">Integrity: {stagedTabs.length}/3 Verified</span>
                    </div>
                    <Button 
                        type="submit" 
                        disabled={!isFullyStaged}
                        className={cn(
                            "flex-1 lg:flex-none h-12 px-8 font-black text-xs uppercase tracking-widest transition-all rounded-xl",
                            isFullyStaged 
                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-100 hover:-translate-y-0.5" 
                            : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                        )}
                    >
                        {isFullyStaged ? <Zap className="w-4 h-4 mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                        Push to Production
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid grid-cols-3 w-full bg-white border border-slate-200 p-1.5 rounded-2xl h-16 shadow-sm">
                            <TabsTrigger value="config" className="rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                                {isTabVerified('config') ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Settings2 className="w-3.5 h-3.5" />}
                                1. Context
                            </TabsTrigger>
                            <TabsTrigger value="logic" className="rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                                {isTabVerified('logic') ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Layers className="w-3.5 h-3.5" />}
                                2. Logic
                            </TabsTrigger>
                            <TabsTrigger value="outcomes" className="rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                                {isTabVerified('outcomes') ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Percent className="w-3.5 h-3.5" />}
                                3. Outcomes
                            </TabsTrigger>
                        </TabsList>

                        <AnimatePresence mode="wait">
                            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
                                
                                {/* TAB 1: CONTEXT */}
                                <TabsContent value="config">
                                    <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
                                        <CardHeader className="p-8 border-b border-slate-50">
                                            <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter">Logic Parameters</CardTitle>
                                            <CardDescription className="text-slate-500 font-bold text-xs uppercase tracking-tight">Set identifiers and execution rank.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-8 space-y-8">
                                            <div className="grid md:grid-cols-2 gap-8">
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logic Handle *</Label>
                                                    <Input {...register('name')} placeholder="e.g. YEAR_END_LIQUIDATION" className="h-14 border-slate-200 rounded-xl font-bold" />
                                                </div>
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority Weight</Label>
                                                    <Input type="number" {...register('priority')} className="h-14 border-slate-200 rounded-xl font-bold" />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                                <div className="flex items-center gap-4">
                                                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                                                    <div>
                                                        <p className="font-black text-slate-900 text-xs uppercase">Live Deployment</p>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase">Activate mutations in real-time checkout.</p>
                                                    </div>
                                                </div>
                                                <Controller control={control} name="is_active" render={({ field }) => (
                                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                )} />
                                            </div>
                                            <div className="flex justify-end pt-4">
                                                <Button 
                                                    type="button" 
                                                    onClick={() => setActiveTab('logic')}
                                                    className={cn(
                                                        "h-14 px-10 font-black text-xs uppercase tracking-widest rounded-xl transition-all group",
                                                        isTabVerified('config') ? "bg-slate-900 text-white hover:bg-black" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                    )}
                                                >
                                                    Proceed to Logic <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* TAB 2: LOGIC (CONDITIONS) */}
                                <TabsContent value="logic">
                                    <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
                                        <CardHeader className="p-8 flex flex-row items-center justify-between border-b border-slate-50">
                                            <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter">Condition Matrix</CardTitle>
                                            <Button type="button" variant="outline" onClick={() => addCond({ type: 'PRODUCT', target_id: '', location_id: 'GLOBAL' })} className="rounded-xl border-slate-200 font-black text-[10px] uppercase tracking-widest h-10 px-4">
                                                <Plus className="w-4 h-4 mr-2" /> New Trigger
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="p-8 space-y-6">
                                            {condFields.map((field, index) => {
                                                const currentType = watch(`conditions.${index}.type`);
                                                return (
                                                    <div key={field.id} className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:border-blue-200">
                                                        <div className="lg:col-span-3 space-y-2">
                                                            <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Category</Label>
                                                            <Controller control={control} name={`conditions.${index}.type`} render={({ field }) => (
                                                                <Select onValueChange={(val) => { field.onChange(val); setValue(`conditions.${index}.target_id`, ''); }} value={field.value}>
                                                                    <SelectTrigger className="h-12 border-slate-200 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                                                                    <SelectContent className="rounded-xl"><SelectItem value="PRODUCT">Product Catalog</SelectItem></SelectContent>
                                                                </Select>
                                                            )}/>
                                                        </div>

                                                        <div className="lg:col-span-4 space-y-2">
                                                            <Label className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Select Product</Label>
                                                            <Controller control={control} name={`conditions.${index}.target_id`} render={({ field }) => (
                                                                <Select onValueChange={field.onChange} value={field.value}>
                                                                    <SelectTrigger className="h-12 border-blue-200 bg-blue-50/10 rounded-xl font-black text-xs"><SelectValue placeholder="Choose Target..." /></SelectTrigger>
                                                                    <SelectContent className="rounded-xl max-h-60">
                                                                        {products.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name} — ${p.price}</SelectItem>)}
                                                                    </SelectContent>
                                                                </Select>
                                                            )}/>
                                                        </div>

                                                        <div className="lg:col-span-3 space-y-2">
                                                            <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Branch Context</Label>
                                                            <Controller control={control} name={`conditions.${index}.location_id`} render={({ field }) => (
                                                                <Select onValueChange={field.onChange} value={field.value}>
                                                                    <SelectTrigger className="h-12 border-slate-200 rounded-xl font-bold"><SelectValue placeholder="Global Scope" /></SelectTrigger>
                                                                    <SelectContent className="rounded-xl"><SelectItem value="GLOBAL">All Branches</SelectItem>{locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                                                                </Select>
                                                            )}/>
                                                        </div>
                                                        <div className="lg:col-span-2 flex justify-end">
                                                            <Button variant="ghost" size="icon" onClick={() => remCond(index)} className="h-12 w-12 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-5 h-5" /></Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            <div className="flex justify-between pt-6">
                                                <Button type="button" variant="ghost" onClick={() => setActiveTab('config')} className="font-black text-[10px] uppercase text-slate-400 hover:text-slate-900 transition-colors">Back</Button>
                                                <Button 
                                                    type="button" 
                                                    onClick={() => setActiveTab('outcomes')} 
                                                    className={cn(
                                                        "h-12 px-8 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg transition-all",
                                                        isTabVerified('logic') ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                    )}
                                                >
                                                    Deploy Conditions <ChevronRight className="ml-2 w-4 h-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* TAB 3: OUTCOMES */}
                                <TabsContent value="outcomes">
                                    <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
                                        <CardHeader className="p-8 flex flex-row items-center justify-between border-b border-slate-50">
                                            <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter">Revenue Mutations</CardTitle>
                                            <Button type="button" variant="outline" onClick={() => addAct({ type: 'PERCENTAGE_DISCOUNT', value: 0, currency_code: currencies[0] })} className="rounded-xl border-slate-200 font-black text-[10px] uppercase tracking-widest h-10 px-4">
                                                <Plus className="w-4 h-4 mr-2" /> New Mutation
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="p-8 space-y-6">
                                            {actFields.map((field, index) => (
                                                <div key={field.id} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-all">
                                                    <div className="lg:col-span-4 space-y-2">
                                                        <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mode</Label>
                                                        <Controller control={control} name={`actions.${index}.type`} render={({ field }) => (
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <SelectTrigger className="h-12 border-slate-200 bg-white rounded-xl font-black text-xs uppercase"><SelectValue /></SelectTrigger>
                                                                <SelectContent className="rounded-xl">
                                                                    <SelectItem value="FIXED_PRICE">Fixed Price</SelectItem>
                                                                    <SelectItem value="PERCENTAGE_DISCOUNT">Percentage Rebate</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        )}/>
                                                    </div>
                                                    <div className="lg:col-span-5 space-y-2">
                                                        <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mutation Value</Label>
                                                        <div className="relative">
                                                            <Input type="number" step="0.01" {...register(`actions.${index}.value`)} className="h-12 border-slate-200 bg-white rounded-xl font-black text-lg pl-14" />
                                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Val</div>
                                                        </div>
                                                    </div>
                                                    <div className="lg:col-span-3 flex justify-end">
                                                        <Button variant="ghost" size="icon" onClick={() => remAct(index)} className="h-12 w-12 rounded-xl text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 className="w-5 h-5" /></Button>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex justify-between pt-6">
                                                <Button type="button" variant="ghost" onClick={() => setActiveTab('logic')} className="font-black text-[10px] uppercase text-slate-400 transition-colors">Back</Button>
                                                <Button 
                                                    type="submit" 
                                                    disabled={!isFullyStaged} 
                                                    className={cn(
                                                        "h-14 px-10 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-xl transition-all",
                                                        isTabVerified('outcomes') ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-50" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                    )}
                                                >
                                                    Finalize Deployment <CheckCircle2 className="ml-2 w-5 h-5" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </motion.div>
                        </AnimatePresence>
                    </Tabs>
                </div>

                {/* SIDEBAR: IMPACT TELEMETRY */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="sticky top-12 space-y-6">
                        <Card className="bg-slate-900 border-none rounded-[32px] overflow-hidden shadow-2xl">
                            <div className="h-2 w-full bg-blue-500" />
                            <CardHeader className="p-8">
                                <div className="flex items-center gap-2 mb-4">
                                    <Calculator className="w-4 h-4 text-blue-400" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Live Revenue Projection</span>
                                </div>
                                <CardTitle className="text-xl font-black text-white tracking-tighter">
                                    {watchedData.name || 'UNNAMED_NODE'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 pt-0 space-y-8">
                                <div className="space-y-6">
                                    <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-500 uppercase">Unit Base Price</span>
                                            <span className="text-lg font-black text-white">${pricingCalculation.basePrice.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-emerald-500 uppercase">Engine Rebate</span>
                                            <span className="text-lg font-black text-emerald-400">-${pricingCalculation.totalDiscount.toLocaleString()}</span>
                                        </div>
                                        <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                                            <span className="text-xs font-black text-blue-400 uppercase">Projected Sale</span>
                                            <span className="text-3xl font-black text-white tracking-tighter">${pricingCalculation.finalPrice.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
                                        <p className={cn("text-sm font-black", isFullyStaged ? "text-emerald-400" : "text-white")}>{stagedTabs.length}/3 Verified</p>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Priority</p>
                                        <p className="text-sm font-black text-blue-400">RANK_{watchedData.priority}</p>
                                    </div>
                                </div>

                                <div className="pt-4 space-y-3">
                                    <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        <span>Sync Readiness</span>
                                        <span className={isFullyStaged ? "text-emerald-400" : "text-blue-400"}>
                                            {isFullyStaged ? "COMMITTED" : "BUFFERING"}
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${(stagedTabs.length / 3) * 100}%` }} className="h-full bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <AnimatePresence>
                            {!isFullyStaged && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                    <Alert className="bg-blue-50 border-blue-100 rounded-2xl p-5 shadow-sm">
                                        <ShieldAlert className="h-5 w-5 text-blue-600" />
                                        <AlertTitle className="text-[10px] font-black text-blue-900 uppercase tracking-widest mb-1">System Lock Active</AlertTitle>
                                        <AlertDescription className="text-[10px] text-blue-700/80 font-bold uppercase tracking-tight">
                                            Define Logic Context, Conditions, and Revenue Outcomes to unlock production commits.
                                        </AlertDescription>
                                    </Alert>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </form>
    );
}