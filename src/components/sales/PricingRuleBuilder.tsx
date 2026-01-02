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
    ArrowUpRight, BarChart3, Lock, Unlock, Database
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

interface BuilderProps {
    initialData?: any;
    customers: { id: string; name: string }[];
    products: { id: string; name: string; price: number }[];
    locations: { id: string; name: string }[];
    currencies: string[];
    tenantId: string;
}

// Form Values Interface for Enterprise-grade Type Safety
interface PricingRuleFormValues {
    tenant_id: string;
    name: string;
    description: string;
    priority: number;
    is_active: boolean;
    is_stackable: boolean;
    conditions: {
        type: string;
        target_id: string;
        location_id: string;
    }[];
    actions: {
        type: string;
        value: number;
        currency_code: string;
    }[];
}

/**
 * ENTERPRISE PRICING INTELLIGENCE BUILDER
 * Fully autonomous multi-tenant node configuration.
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
    
    // 1. PRIMARY FORM ORCHESTRATION
    const { control, handleSubmit, register, watch, trigger, setValue, formState: { errors } } = useForm<PricingRuleFormValues>({
        defaultValues: {
            tenant_id: tenantId,
            name: initialData?.name || '',
            description: initialData?.description || '',
            priority: initialData?.priority || 1,
            is_active: initialData?.is_active ?? true,
            is_stackable: initialData?.is_stackable ?? false,
            conditions: initialData?.conditions || [{ type: 'PRODUCT', target_id: '', location_id: 'GLOBAL' }],
            actions: initialData?.actions || [{ type: 'PERCENTAGE_DISCOUNT', value: 0, currency_code: currencies[0] || 'USD' }],
        },
    });

    const { fields: condFields, append: addCond, remove: remCond } = useFieldArray({ control, name: "conditions" });
    const { fields: actFields, append: addAct, remove: remAct } = useFieldArray({ control, name: "actions" });

    const [state, formAction] = useFormState(createOrUpdatePricingRule, { success: false, message: '' });

    // 2. AUTONOMOUS INTEGRITY OBSERVER
    // Watches every keystroke and selection to verify the node's readiness in real-time.
    useEffect(() => {
        const subscription = watch((value) => {
            const verified = [];
            
            // Context Validation
            if (value.name && value.name.trim().length > 2 && Number(value.priority) >= 0) {
                verified.push('config');
            }
            
            // Logic Matrix Validation - Fixed optional chaining to avoid "possibly undefined" build error
            if (value.conditions && value.conditions.length > 0 && value.conditions.every((c: any) => c.target_id && c.target_id !== "")) {
                verified.push('logic');
            }
            
            // Outcome Mutation Validation - Fixed for stability
            if (value.actions && value.actions.length > 0 && value.actions.every((a: any) => Number(a.value) > 0)) {
                verified.push('outcomes');
            }
            
            setStagedTabs(verified);
        });
        return () => subscription.unsubscribe();
    }, [watch]);

    // 3. SERVER-SIDE ACTION RESPONSE HANDLER
    useEffect(() => {
        if (state.success) {
            toast({
                title: "Deployment Successful",
                description: state.message,
                variant: "default",
            });
        } else if (state.message) {
            toast({
                title: "Deployment Failed",
                description: state.message,
                variant: "destructive",
            });
        }
    }, [state, toast]);

    // 4. ENTERPRISE REVENUE MATH ENGINE
    // Dynamically calculates the financial impact of the current logic node.
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
                totalDiscount = basePrice > val ? basePrice - val : 0;
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
            hasRealProduct: !!product,
            productName: product?.name || 'GENERIC_ITEM'
        };
    }, [watch('conditions'), watch('actions'), products]);

    const isFullyStaged = stagedTabs.length >= 3;
    const watchedData = watch();

    // 5. NAVIGATION COMMANDS
    const navigateToLogic = async () => {
        const valid = await trigger(['name', 'priority']);
        if (valid) setActiveTab("logic");
    };

    const navigateToOutcomes = async () => {
        const valid = await trigger('conditions');
        if (valid && stagedTabs.includes('logic')) setActiveTab("outcomes");
    };

    const onActualSubmit = (data: any) => {
        const formData = new FormData();
        const { conditions, actions, ...ruleDetails } = data;
        
        formData.append('ruleData', JSON.stringify({ ...ruleDetails, id: initialData?.id }));
        formData.append('conditions', JSON.stringify(conditions || []));
        formData.append('actions', JSON.stringify(actions || []));
        
        formAction(formData);
    };

    return (
        <form onSubmit={handleSubmit(onActualSubmit)} className="w-full space-y-10">
            
            {/* --- HEADER: SYSTEM ENGINE STATUS --- */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm transition-all duration-500 hover:shadow-md">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-slate-900 rounded-[28px] flex items-center justify-center shadow-2xl relative overflow-hidden group">
                        <motion.div 
                            animate={{ rotate: 360 }} 
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-transparent opacity-50" 
                        />
                        <Cpu className="text-white w-10 h-10 relative z-10" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Badge className="bg-blue-600 text-white border-none px-3 py-0.5 text-[10px] font-black uppercase tracking-widest">
                                PRICING_CLUSTER_V4
                            </Badge>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-100">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black text-emerald-600 uppercase">Write Sync Active</span>
                            </div>
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
                            {initialData?.id ? 'Modify Active Configuration' : 'Deploy Pricing Engine'}
                        </h1>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-5 w-full lg:w-auto">
                    <div className="flex-1 lg:flex-none flex flex-col items-center justify-center px-6 py-3 bg-slate-50 rounded-[24px] border border-slate-100">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Integrity Score</span>
                        <div className="flex items-center gap-2">
                            <Activity className={cn("w-4 h-4 transition-colors", isFullyStaged ? "text-emerald-500" : "text-amber-500")} />
                            <span className="text-lg font-black text-slate-900">{stagedTabs.length}/3 Verified</span>
                        </div>
                    </div>
                    
                    <Button 
                        type="submit" 
                        disabled={!isFullyStaged}
                        className={cn(
                            "flex-1 lg:flex-none h-16 px-12 font-black text-xs uppercase tracking-[0.2em] transition-all rounded-[24px] shadow-2xl",
                            isFullyStaged 
                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 hover:-translate-y-1 active:scale-95" 
                            : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                        )}
                    >
                        {isFullyStaged ? <Zap className="w-5 h-5 mr-3 fill-white" /> : <Lock className="w-5 h-5 mr-3" />}
                        Commit to Production
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                
                {/* --- PRIMARY CONFIGURATION WORKSPACE --- */}
                <div className="lg:col-span-8 space-y-8">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid grid-cols-3 w-full bg-white border border-slate-200 p-2 rounded-[32px] h-20 shadow-sm overflow-hidden">
                            {[
                                { id: 'config', label: '1. Context', icon: Settings2 },
                                { id: 'logic', label: '2. Conditions', icon: Layers },
                                { id: 'outcomes', label: '3. Outcomes', icon: Percent },
                            ].map(tab => (
                                <TabsTrigger 
                                    key={tab.id} 
                                    value={tab.id} 
                                    className="rounded-[24px] font-black text-[11px] uppercase tracking-widest transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white flex items-center justify-center gap-3"
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                    {stagedTabs.includes(tab.id) && <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-1" />}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="mt-10"
                            >
                                {/* TAB 1: CORE CONTEXT */}
                                <TabsContent value="config" className="focus-visible:outline-none">
                                    <Card className="border-slate-200 shadow-xl rounded-[40px] overflow-hidden bg-white">
                                        <CardHeader className="p-10 border-b border-slate-50 bg-slate-50/30">
                                            <div className="flex items-center gap-4 mb-2">
                                                <div className="p-2 bg-blue-100 rounded-lg"><Settings2 className="w-4 h-4 text-blue-600" /></div>
                                                <CardTitle className="text-2xl font-black text-slate-900 tracking-tighter">Logic Parameters</CardTitle>
                                            </div>
                                            <CardDescription className="text-slate-500 font-bold text-xs uppercase tracking-tight">Define the global handle and execution rank for this node.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-10 space-y-12">
                                            <div className="grid md:grid-cols-2 gap-10">
                                                <div className="space-y-4">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Logic Handle (Unique Name) *</Label>
                                                    <Input {...register('name')} placeholder="e.g. VIP_SUMMER_EVENT" className="h-16 border-slate-200 focus:ring-8 focus:ring-blue-500/5 rounded-[20px] font-black text-lg px-6" />
                                                    {errors.name && <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest">{errors.name.message?.toString()}</p>}
                                                </div>
                                                <div className="space-y-4">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Priority Weight (Rank 1-100)</Label>
                                                    <div className="relative">
                                                        <Input type="number" {...register('priority')} className="h-16 border-slate-200 rounded-[20px] font-black text-lg px-6 pr-12" />
                                                        <BarChart3 className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between p-8 bg-slate-50 rounded-[32px] border border-slate-100 hover:border-blue-200 transition-colors group">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform">
                                                        <ShieldCheck className="w-6 h-6 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 text-sm uppercase tracking-tight">Live Deployment State</p>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">If disabled, this node will stay in BUFFER state without affecting sales.</p>
                                                    </div>
                                                </div>
                                                <Controller control={control} name="is_active" render={({ field }) => (
                                                    <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-blue-600" />
                                                )} />
                                            </div>

                                            <div className="flex justify-end pt-4">
                                                <Button 
                                                    type="button" 
                                                    onClick={navigateToLogic}
                                                    className={cn(
                                                        "h-16 px-12 font-black text-xs uppercase tracking-widest rounded-[22px] transition-all group",
                                                        stagedTabs.includes('config') ? "bg-slate-900 text-white hover:bg-black shadow-xl" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                    )}
                                                >
                                                    Proceed to Conditions <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* TAB 2: CONDITION MATRIX */}
                                <TabsContent value="logic" className="focus-visible:outline-none">
                                    <Card className="border-slate-200 shadow-xl rounded-[40px] overflow-hidden bg-white">
                                        <CardHeader className="p-10 flex flex-row items-center justify-between border-b border-slate-50 bg-slate-50/30">
                                            <div>
                                                <div className="flex items-center gap-4 mb-2">
                                                    <div className="p-2 bg-purple-100 rounded-lg"><Layers className="w-4 h-4 text-purple-600" /></div>
                                                    <CardTitle className="text-2xl font-black text-slate-900 tracking-tighter">Logic Triggers</CardTitle>
                                                </div>
                                                <CardDescription className="text-slate-500 font-bold text-xs uppercase tracking-tight">Define which targets activate this pricing mutation.</CardDescription>
                                            </div>
                                            <Button type="button" variant="outline" onClick={() => addCond({ type: 'PRODUCT', target_id: '', location_id: 'GLOBAL' })} className="rounded-2xl border-slate-200 hover:bg-slate-50 font-black text-[10px] uppercase tracking-[0.15em] h-12 px-6">
                                                <Plus className="w-4 h-4 mr-2" /> New Logic Row
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="p-10 space-y-8">
                                            {condFields.length === 0 && (
                                                <div className="py-24 text-center border-4 border-dashed border-slate-50 rounded-[40px]">
                                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6"><Box className="w-8 h-8 text-slate-200" /></div>
                                                    <p className="text-slate-300 font-black text-xs uppercase tracking-widest">Global Logic: Applies to all sales without filter.</p>
                                                </div>
                                            )}
                                            
                                            {condFields.map((field, index) => {
                                                const currentType = watch(`conditions.${index}.type`);
                                                return (
                                                    <div key={field.id} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm hover:border-blue-300 transition-all">
                                                        <div className="lg:col-span-3 space-y-3">
                                                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Logic Group</Label>
                                                            <Controller control={control} name={`conditions.${index}.type`} render={({ field }) => (
                                                                <Select onValueChange={(val) => { field.onChange(val); setValue(`conditions.${index}.target_id`, ''); }} value={field.value}>
                                                                    <SelectTrigger className="h-14 border-slate-200 rounded-[18px] font-black text-xs uppercase">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="rounded-2xl shadow-2xl border-slate-100">
                                                                        <SelectItem value="PRODUCT" className="font-bold py-3"><div className="flex items-center gap-2"><Box className="w-3.5 h-3.5" /> Product Catalog</div></SelectItem>
                                                                        <SelectItem value="CUSTOMER" className="font-bold py-3"><div className="flex items-center gap-2"><Users className="w-3.5 h-3.5" /> Customer Segment</div></SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            )}/>
                                                        </div>

                                                        <div className="lg:col-span-4 space-y-3">
                                                            <Label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Target Identity</Label>
                                                            <Controller control={control} name={`conditions.${index}.target_id`} render={({ field: targetField }) => (
                                                                <Select 
                                                                    onValueChange={targetField.onChange} 
                                                                    value={targetField.value}
                                                                >
                                                                    <SelectTrigger className="h-14 border-blue-200 bg-blue-50/10 rounded-[18px] font-black text-xs focus:ring-blue-100">
                                                                        <SelectValue placeholder="Choose target..." />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="rounded-2xl shadow-2xl border-slate-100 max-h-[350px]">
                                                                        {currentType === 'PRODUCT' 
                                                                            ? products.map(p => (
                                                                                <SelectItem key={p.id} value={p.id.toString()} className="font-bold py-4 border-b border-slate-50 last:border-none">
                                                                                    <div className="flex justify-between items-center w-full gap-8">
                                                                                        <span>{p.name}</span>
                                                                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 font-black border-emerald-100">${p.price.toLocaleString()}</Badge>
                                                                                    </div>
                                                                                </SelectItem>
                                                                            ))
                                                                            : customers.map(c => <SelectItem key={c.id} value={c.id.toString()} className="font-bold py-4">{c.name}</SelectItem>)
                                                                        }
                                                                    </SelectContent>
                                                                </Select>
                                                            )}/>
                                                        </div>

                                                        <div className="lg:col-span-3 space-y-3">
                                                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Branch Context</Label>
                                                            <Controller control={control} name={`conditions.${index}.location_id`} render={({ field }) => (
                                                                <Select onValueChange={field.onChange} value={field.value}>
                                                                    <SelectTrigger className="h-14 border-slate-200 rounded-[18px] font-black text-xs uppercase">
                                                                        <SelectValue placeholder="All Branches" />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="rounded-2xl shadow-2xl border-slate-100">
                                                                        <SelectItem value="GLOBAL" className="font-bold py-3"><div className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> All Branches</div></SelectItem>
                                                                        {locations.map(l => <SelectItem key={l.id} value={l.id.toString()} className="font-bold py-3">{l.name}</SelectItem>)}
                                                                    </SelectContent>
                                                                </Select>
                                                            )}/>
                                                        </div>
                                                        <div className="lg:col-span-2 flex justify-end pb-1.5">
                                                            <Button variant="ghost" size="icon" onClick={() => remCond(index)} className="h-12 w-12 rounded-[18px] text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                                                                <Trash2 className="w-6 h-6" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            <div className="flex justify-between pt-10">
                                                <Button type="button" variant="ghost" onClick={() => setActiveTab('config')} className="font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-900 h-14 px-8">Back to Context</Button>
                                                <Button 
                                                    type="button" 
                                                    onClick={navigateToOutcomes} 
                                                    className={cn(
                                                        "h-16 px-12 font-black text-xs uppercase tracking-widest rounded-[22px] shadow-lg transition-all",
                                                        stagedTabs.includes('logic') ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                    )}
                                                >
                                                    Apply Outcomes <ArrowUpRight className="ml-3 w-5 h-5" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* TAB 3: OUTCOME MUTATIONS */}
                                <TabsContent value="outcomes" className="focus-visible:outline-none">
                                    <Card className="border-slate-200 shadow-xl rounded-[40px] overflow-hidden bg-white">
                                        <CardHeader className="p-10 flex flex-row items-center justify-between border-b border-slate-50 bg-slate-50/30">
                                            <div>
                                                <div className="flex items-center gap-4 mb-2">
                                                    <div className="p-2 bg-emerald-100 rounded-lg"><Percent className="w-4 h-4 text-emerald-600" /></div>
                                                    <CardTitle className="text-2xl font-black text-slate-900 tracking-tighter">Revenue Mutations</CardTitle>
                                                </div>
                                                <CardDescription className="text-slate-500 font-bold text-xs uppercase tracking-tight">Final price adjustments applied at checkout.</CardDescription>
                                            </div>
                                            <Button type="button" variant="outline" onClick={() => addAct({ type: 'PERCENTAGE_DISCOUNT', value: 0, currency_code: currencies[0] || 'USD' })} className="rounded-2xl border-slate-200 hover:bg-slate-50 font-black text-[10px] uppercase tracking-[0.15em] h-12 px-6">
                                                <Plus className="w-4 h-4 mr-2" /> New Mutation
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="p-10 space-y-8">
                                            {actFields.map((field, index) => (
                                                <div key={field.id} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end bg-slate-50/50 p-8 rounded-[32px] border border-slate-100 hover:border-emerald-300 transition-all">
                                                    <div className="lg:col-span-4 space-y-3">
                                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mutation Mode</Label>
                                                        <Controller control={control} name={`actions.${index}.type`} render={({ field }) => (
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <SelectTrigger className="h-14 border-slate-200 bg-white rounded-[18px] font-black text-xs uppercase">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent className="rounded-2xl shadow-2xl border-slate-100">
                                                                    <SelectItem value="PERCENTAGE_DISCOUNT" className="font-bold py-3">Percentage Rebate (%)</SelectItem>
                                                                    <SelectItem value="FIXED_PRICE" className="font-bold py-3">Fixed Net Price ($)</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        )}/>
                                                    </div>
                                                    <div className="lg:col-span-5 space-y-3">
                                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mutation Value</Label>
                                                        <div className="relative">
                                                            <Input type="number" step="0.01" {...register(`actions.${index}.value`)} className="h-14 border-slate-200 bg-white rounded-[18px] font-black text-xl pl-16 focus:ring-emerald-500/10" />
                                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-widest">VAL</div>
                                                        </div>
                                                    </div>
                                                    <div className="lg:col-span-3 flex justify-end pb-1">
                                                        <Button variant="ghost" size="icon" onClick={() => remAct(index)} className="h-14 w-14 rounded-[20px] text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all">
                                                            <Trash2 className="w-6 h-6" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                            
                                            <div className="p-8 bg-blue-50/50 rounded-[32px] border border-blue-100 flex items-start gap-6">
                                                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center shrink-0 border border-blue-100">
                                                    <ShieldCheck className="w-6 h-6 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-blue-900 text-sm uppercase tracking-tight mb-1">Integrity Cluster Verified</p>
                                                    <p className="text-[10px] text-blue-700/70 font-bold uppercase leading-relaxed">
                                                        All logic nodes have been successfully compiled. You can now finalize the deployment to the production cluster.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex justify-between pt-6">
                                                <Button type="button" variant="ghost" onClick={() => setActiveTab('logic')} className="font-black text-[10px] uppercase text-slate-400 hover:text-slate-900 h-14 px-8">Back to Conditions</Button>
                                                <Button 
                                                    type="submit" 
                                                    disabled={!isFullyStaged} 
                                                    className={cn(
                                                        "h-16 px-12 font-black text-xs uppercase tracking-[0.2em] rounded-[24px] shadow-2xl transition-all",
                                                        isFullyStaged ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                    )}
                                                >
                                                    Finalize Deployment <CheckCircle2 className="ml-3 w-5 h-5" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </motion.div>
                        </AnimatePresence>
                    </Tabs>
                </div>

                {/* --- SIDEBAR: LIVE REVENUE TELEMETRY --- */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="sticky top-12 space-y-8">
                        <Card className="bg-slate-900 border-none rounded-[48px] overflow-hidden shadow-2xl relative">
                            <motion.div 
                                animate={{ x: [0, 100, 0] }} 
                                transition={{ duration: 10, repeat: Infinity }}
                                className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-emerald-500 to-blue-500" 
                            />
                            <CardHeader className="p-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <Calculator className="w-5 h-5 text-blue-400" />
                                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Revenue Impact Engine</span>
                                </div>
                                <CardTitle className="text-3xl font-black text-white tracking-tighter leading-none mb-1 uppercase">
                                    {watchedData.name || 'UNNAMED_NODE'}
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Real-time Simulation</span>
                                </div>
                            </CardHeader>
                            
                            <CardContent className="p-10 pt-0 space-y-10">
                                <div className="space-y-6">
                                    <div className="p-8 bg-white/5 rounded-[36px] border border-white/5 space-y-6">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Unit Base Price</span>
                                            <span className="text-xl font-black text-white">${pricingCalculation.basePrice.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Logic Node Saving</span>
                                            <span className="text-xl font-black text-emerald-400">-${pricingCalculation.totalDiscount.toLocaleString()}</span>
                                        </div>
                                        <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">New Unit Cost</span>
                                                <div className="flex items-center gap-2">
                                                    <Target className="w-3 h-3 text-blue-500" />
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase">{pricingCalculation.productName}</span>
                                                </div>
                                            </div>
                                            <span className="text-5xl font-black text-white tracking-tighter">${pricingCalculation.finalPrice.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {!pricingCalculation.hasRealProduct && (
                                        <div className="flex items-start gap-4 p-5 bg-amber-500/10 rounded-[24px] border border-amber-500/20">
                                            <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-amber-200/70 font-black leading-relaxed uppercase tracking-tight">
                                                Deploy a target catalog product in Step 2 to link actual revenue telemetry. Currently simulating at base zero.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="p-6 bg-white/5 rounded-[24px] border border-white/10">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Sync Phase</p>
                                        <p className={cn("text-sm font-black uppercase", isFullyStaged ? "text-emerald-400" : "text-white")}>
                                            {stagedTabs.length}/3 COMPILED
                                        </p>
                                    </div>
                                    <div className="p-6 bg-white/5 rounded-[24px] border border-white/10">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Execution Rank</p>
                                        <div className="flex items-center gap-2">
                                            <Unlock className="w-3 h-3 text-blue-500" />
                                            <p className="text-sm font-black text-blue-400">#{watchedData.priority || 0}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 space-y-4">
                                    <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        <span>Cluster Readiness</span>
                                        <span className={isFullyStaged ? "text-emerald-400" : "text-blue-400"}>
                                            {isFullyStaged ? "STAGED_READY" : "CALIBRATING..."}
                                        </span>
                                    </div>
                                    <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }} 
                                            animate={{ width: `${(stagedTabs.length / 3) * 100}%` }} 
                                            className="h-full bg-blue-600 rounded-full shadow-[0_0_20px_#2563eb]" 
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <AnimatePresence>
                            {!isFullyStaged && (
                                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                                    <Alert className="bg-blue-50/50 border-blue-200 rounded-[32px] p-8 shadow-sm">
                                        <ShieldAlert className="h-6 w-6 text-blue-600" />
                                        <AlertTitle className="text-xs font-black text-blue-900 uppercase tracking-widest mb-2">Protocol Lock Active</AlertTitle>
                                        <AlertDescription className="text-[10px] text-blue-700/80 font-bold uppercase tracking-tight leading-relaxed">
                                            Verification required for all 3 logical layers. Please finalize context, triggers, and mutations to unlock production replication.
                                        </AlertDescription>
                                    </Alert>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        
                        <div className="flex items-center gap-4 px-6">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Atomic Sync v4.2.1 Stable</span>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}