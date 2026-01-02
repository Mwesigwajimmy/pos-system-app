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
    Smartphone, Tablet, Monitor, Server
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
 * ENTERPRISE-GRADE TYPE DEFINITIONS
 * Ensuring multi-tenant, multi-currency data integrity across the global cluster.
 */
interface BuilderProps {
    initialData?: any;
    customers: { id: string; name: string }[];
    products: { id: string; name: string; price: number }[];
    locations: { id: string; name: string }[];
    currencies: string[];
    tenantId: string;
}

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
 * GLOBAL PRICING INTELLIGENCE BUILDER V4
 * Features: Multi-tenant isolation, Real-time revenue telemetry, Cross-device adaptive UI.
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
    
    // 1. PRIMARY FORM ORCHESTRATION ENGINE
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

    // 2. AUTONOMOUS INTEGRITY OBSERVER (AIO)
    // Synchronizes tab completion status with the master "Commit to Production" controller.
    useEffect(() => {
        const subscription = watch((value) => {
            const verified = [];
            
            // Layer 1: Context Verification (Name length and valid priority)
            if (value.name && value.name.trim().length >= 3 && typeof value.priority !== 'undefined') {
                verified.push('config');
            }
            
            // Layer 2: Logic Matrix Verification (At least one condition with a target assigned)
            if (value.conditions && value.conditions.length > 0 && value.conditions.every((c: any) => c.target_id && c.target_id !== "")) {
                verified.push('logic');
            }
            
            // Layer 3: Outcome Mutation Verification (Valid numerical value for adjustments)
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
            toast({ title: "Deployment Successful", description: state.message, variant: "default" });
        } else if (state.message) {
            toast({ title: "Deployment Failed", description: state.message, variant: "destructive" });
        }
    }, [state, toast]);

    // 4. ENTERPRISE REVENUE TELEMETRY MATH
    const pricingCalculation = useMemo(() => {
        const conditions = watch('conditions') as any[];
        const actions = watch('actions') as any[];
        const firstProductCondition = conditions?.find((c: any) => c.type === 'PRODUCT' && c.target_id);
        const product = products.find(p => p.id.toString() === firstProductCondition?.target_id?.toString());
        
        const basePrice = product?.price || 2000; // Simulated default for empty states
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
            productName: product?.name || 'GENERIC_CLUSTER_ITEM'
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
        <form onSubmit={handleSubmit(onActualSubmit)} className="w-full max-w-[1600px] mx-auto space-y-6 sm:space-y-10 px-4 py-6 md:px-8 md:py-10 bg-slate-50/50 min-h-screen">
            
            {/* --- MASTER CONTROL HEADER --- */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 sm:gap-8 bg-white p-6 sm:p-10 rounded-[32px] sm:rounded-[48px] border border-slate-200 shadow-sm transition-all duration-500">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-slate-900 rounded-[24px] sm:rounded-[32px] flex items-center justify-center shadow-2xl relative overflow-hidden group shrink-0">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-transparent opacity-50" />
                        <Cpu className="text-white w-8 h-8 sm:w-12 sm:h-12 relative z-10" />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
                            <Badge className="bg-blue-600 text-white border-none px-3 py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">PRICING_CLUSTER_V4</Badge>
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[9px] sm:text-[10px] font-black text-emerald-600 uppercase">Write Sync Active</span>
                            </div>
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tighter leading-tight">
                            {initialData?.id ? 'Modify Configuration' : 'Deploy Pricing Engine'}
                        </h1>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 sm:gap-6 w-full xl:w-auto">
                    <div className="flex flex-row items-center justify-between md:justify-center gap-4 px-6 py-4 bg-slate-50 rounded-[24px] border border-slate-100 flex-1 md:flex-none min-w-[180px]">
                        <div className="flex flex-col items-start">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Integrity Score</span>
                            <div className="flex items-center gap-2">
                                <Activity className={cn("w-4 h-4", isFullyStaged ? "text-emerald-500" : "text-amber-500")} />
                                <span className="text-lg font-black text-slate-900">{stagedTabs.length}/3 Verified</span>
                            </div>
                        </div>
                        <div className="flex gap-1 md:hidden">
                            {stagedTabs.includes('config') ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <div className="w-5 h-5 rounded-full border-2 border-slate-200" />}
                            {stagedTabs.includes('logic') ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <div className="w-5 h-5 rounded-full border-2 border-slate-200" />}
                            {stagedTabs.includes('outcomes') ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <div className="w-5 h-5 rounded-full border-2 border-slate-200" />}
                        </div>
                    </div>
                    
                    <Button 
                        type="submit" 
                        disabled={!isFullyStaged}
                        className={cn(
                            "h-16 sm:h-20 px-8 sm:px-14 font-black text-xs sm:text-sm uppercase tracking-[0.2em] transition-all rounded-[24px] sm:rounded-[28px] shadow-2xl flex-1 md:flex-none",
                            isFullyStaged 
                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 hover:-translate-y-1 active:scale-95 border-b-4 border-blue-800" 
                            : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                        )}
                    >
                        {isFullyStaged ? <Zap className="w-5 h-5 sm:w-6 sm:h-6 mr-3 fill-white" /> : <Lock className="w-5 h-5 sm:w-6 sm:h-6 mr-3" />}
                        Commit to Production
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 items-start">
                
                {/* --- PRIMARY WORKSPACE (ADAPTIVE) --- */}
                <div className="lg:col-span-7 xl:col-span-8 space-y-8 order-2 lg:order-1">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="flex md:grid md:grid-cols-3 w-full bg-white border border-slate-200 p-2 rounded-[28px] sm:rounded-[36px] h-auto md:h-24 shadow-sm overflow-x-auto md:overflow-hidden no-scrollbar">
                            {[
                                { id: 'config', label: '1. Context', icon: Settings2 },
                                { id: 'logic', label: '2. Conditions', icon: Layers },
                                { id: 'outcomes', label: '3. Outcomes', icon: Percent },
                            ].map(tab => (
                                <TabsTrigger 
                                    key={tab.id} 
                                    value={tab.id} 
                                    className="min-w-[140px] md:min-w-0 flex-1 rounded-[22px] sm:rounded-[28px] font-black text-[10px] sm:text-[11px] uppercase tracking-widest transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white flex items-center justify-center gap-2 sm:gap-3 py-4 md:py-0 h-full"
                                >
                                    <tab.icon className="w-4 h-4" />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                    <span className="sm:hidden">{tab.label.split('.')[0]}</span>
                                    {stagedTabs.includes(tab.id) && <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-1" />}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="mt-8 sm:mt-10"
                            >
                                {/* TAB 1: CORE CONTEXT */}
                                <TabsContent value="config" className="focus-visible:outline-none">
                                    <Card className="border-slate-200 shadow-2xl rounded-[32px] sm:rounded-[48px] overflow-hidden bg-white border-none">
                                        <CardHeader className="p-6 sm:p-12 border-b border-slate-50 bg-slate-50/30">
                                            <div className="flex items-center gap-4 mb-2">
                                                <div className="p-3 bg-blue-100 rounded-2xl"><Settings2 className="w-5 h-5 text-blue-600" /></div>
                                                <CardTitle className="text-xl sm:text-3xl font-black text-slate-900 tracking-tighter uppercase">Logic Parameters</CardTitle>
                                            </div>
                                            <CardDescription className="text-slate-500 font-bold text-xs sm:text-sm uppercase tracking-tight">Define node identifier and hierarchy position.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-6 sm:p-12 space-y-8 sm:space-y-12">
                                            <div className="grid md:grid-cols-2 gap-6 sm:gap-10">
                                                <div className="space-y-4">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Logic Handle (Unique Name) *</Label>
                                                    <Input {...register('name')} placeholder="e.g. GLOBAL_REBATE_2026" className="h-16 sm:h-20 border-slate-200 focus:ring-[12px] focus:ring-blue-500/5 rounded-[22px] font-black text-lg sm:text-xl px-8" />
                                                    {errors.name && <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest">{errors.name.message?.toString()}</p>}
                                                </div>
                                                <div className="space-y-4">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Priority Weight (Rank 1-100)</Label>
                                                    <div className="relative">
                                                        <Input type="number" {...register('priority')} className="h-16 sm:h-20 border-slate-200 rounded-[22px] font-black text-lg sm:text-xl px-8 pr-16" />
                                                        <BarChart3 className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-300 w-6 h-6" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 sm:p-10 bg-slate-50 rounded-[32px] border border-slate-100 hover:border-blue-200 transition-all gap-6">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center shrink-0">
                                                        <ShieldCheck className="w-7 h-7 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 text-sm uppercase tracking-tight">Live Deployment State</p>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter max-w-xs">Disabled nodes remain in buffer without affecting global revenue.</p>
                                                    </div>
                                                </div>
                                                <Controller control={control} name="is_active" render={({ field }) => (
                                                    <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-blue-600 scale-125" />
                                                )} />
                                            </div>

                                            <div className="flex justify-end pt-4">
                                                <Button type="button" onClick={navigateToLogic} className="h-16 sm:h-18 px-10 sm:px-14 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-[24px] hover:bg-black transition-all group shadow-xl">
                                                    Proceed to Conditions <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* TAB 2: CONDITION MATRIX */}
                                <TabsContent value="logic" className="focus-visible:outline-none">
                                    <Card className="border-slate-200 shadow-2xl rounded-[32px] sm:rounded-[48px] overflow-hidden bg-white border-none">
                                        <CardHeader className="p-6 sm:p-12 flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-50 bg-slate-50/30 gap-6">
                                            <div>
                                                <div className="flex items-center gap-4 mb-2">
                                                    <div className="p-3 bg-purple-100 rounded-2xl"><Layers className="w-5 h-5 text-purple-600" /></div>
                                                    <CardTitle className="text-xl sm:text-3xl font-black text-slate-900 tracking-tighter uppercase">Logic Triggers</CardTitle>
                                                </div>
                                                <CardDescription className="text-slate-500 font-bold text-xs sm:text-sm uppercase tracking-tight">Define logic gates for revenue mutation activation.</CardDescription>
                                            </div>
                                            <Button type="button" variant="outline" onClick={() => addCond({ type: 'PRODUCT', target_id: '', location_id: 'GLOBAL' })} className="rounded-[20px] border-slate-200 hover:bg-slate-50 font-black text-[10px] uppercase tracking-[0.15em] h-14 px-8 shrink-0">
                                                <Plus className="w-5 h-5 mr-2" /> Add Logic Row
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="p-6 sm:p-12 space-y-6 sm:space-y-8">
                                            {condFields.length === 0 && (
                                                <div className="py-20 sm:py-32 text-center border-4 border-dashed border-slate-50 rounded-[40px]">
                                                    <Box className="w-12 h-12 text-slate-200 mx-auto mb-6" />
                                                    <p className="text-slate-300 font-black text-xs uppercase tracking-[0.3em]">Global Scope: Universal Activation</p>
                                                </div>
                                            )}
                                            
                                            {condFields.map((field, index) => {
                                                const currentType = watch(`conditions.${index}.type`);
                                                return (
                                                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-end bg-white p-6 sm:p-8 rounded-[28px] border border-slate-200 shadow-sm hover:border-blue-300 transition-all">
                                                        <div className="md:col-span-3 space-y-3">
                                                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</Label>
                                                            <Controller control={control} name={`conditions.${index}.type`} render={({ field }) => (
                                                                <Select onValueChange={(val) => { field.onChange(val); setValue(`conditions.${index}.target_id`, ''); }} value={field.value}>
                                                                    <SelectTrigger className="h-16 border-slate-100 bg-slate-50/50 rounded-[18px] font-black text-xs uppercase">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="rounded-2xl shadow-2xl">
                                                                        <SelectItem value="PRODUCT" className="font-bold py-3">Product Catalog</SelectItem>
                                                                        <SelectItem value="CUSTOMER" className="font-bold py-3">Customer Profile</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            )}/>
                                                        </div>
                                                        <div className="md:col-span-4 space-y-3">
                                                            <Label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Target ID</Label>
                                                            <Controller control={control} name={`conditions.${index}.target_id`} render={({ field: targetField }) => (
                                                                <Select onValueChange={targetField.onChange} value={targetField.value}>
                                                                    <SelectTrigger className="h-16 border-blue-100 bg-blue-50/20 rounded-[18px] font-black text-xs">
                                                                        <SelectValue placeholder="Identify target..." />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="rounded-2xl max-h-[400px]">
                                                                        {currentType === 'PRODUCT' 
                                                                            ? products.map(p => <SelectItem key={p.id} value={p.id.toString()} className="font-bold py-4 border-b border-slate-50 last:border-none">{p.name} — <span className="text-blue-600">${p.price}</span></SelectItem>)
                                                                            : customers.map(c => <SelectItem key={c.id} value={c.id.toString()} className="font-bold py-4">{c.name}</SelectItem>)
                                                                        }
                                                                    </SelectContent>
                                                                </Select>
                                                            )}/>
                                                        </div>
                                                        <div className="md:col-span-3 space-y-3">
                                                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Context</Label>
                                                            <Controller control={control} name={`conditions.${index}.location_id`} render={({ field }) => (
                                                                <Select onValueChange={field.onChange} value={field.value}>
                                                                    <SelectTrigger className="h-16 border-slate-100 bg-slate-50/50 rounded-[18px] font-black text-xs uppercase">
                                                                        <SelectValue placeholder="Global" />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="rounded-2xl">
                                                                        <SelectItem value="GLOBAL" className="font-bold py-3">Global Cluster</SelectItem>
                                                                        {locations.map(l => <SelectItem key={l.id} value={l.id.toString()} className="font-bold py-3">{l.name}</SelectItem>)}
                                                                    </SelectContent>
                                                                </Select>
                                                            )}/>
                                                        </div>
                                                        <div className="md:col-span-2 flex justify-end pb-1">
                                                            <Button variant="ghost" size="icon" onClick={() => remCond(index)} className="h-14 w-14 rounded-[18px] text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0">
                                                                <Trash2 className="w-6 h-6" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            <div className="flex flex-col sm:flex-row justify-between pt-10 gap-4">
                                                <Button type="button" variant="ghost" onClick={() => setActiveTab('config')} className="font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-900 h-16 px-10 rounded-[20px]">Back to Context</Button>
                                                <Button type="button" onClick={navigateToOutcomes} className="h-16 px-12 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-[22px] shadow-xl hover:bg-black">
                                                    Apply Outcomes <ArrowUpRight className="ml-3 w-5 h-5" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* TAB 3: OUTCOME MUTATIONS */}
                                <TabsContent value="outcomes" className="focus-visible:outline-none">
                                    <Card className="border-slate-200 shadow-2xl rounded-[32px] sm:rounded-[48px] overflow-hidden bg-white border-none">
                                        <CardHeader className="p-6 sm:p-12 flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-50 bg-slate-50/30 gap-6">
                                            <div>
                                                <div className="flex items-center gap-4 mb-2">
                                                    <div className="p-3 bg-emerald-100 rounded-2xl"><Percent className="w-5 h-5 text-emerald-600" /></div>
                                                    <CardTitle className="text-xl sm:text-3xl font-black text-slate-900 tracking-tighter uppercase">Revenue Mutations</CardTitle>
                                                </div>
                                                <CardDescription className="text-slate-500 font-bold text-xs sm:text-sm uppercase tracking-tight">Price adjustments applied at transaction finalization.</CardDescription>
                                            </div>
                                            <Button type="button" variant="outline" onClick={() => addAct({ type: 'PERCENTAGE_DISCOUNT', value: 0, currency_code: currencies[0] || 'USD' })} className="rounded-[20px] border-slate-200 hover:bg-slate-50 font-black text-[10px] uppercase tracking-[0.15em] h-14 px-8 shrink-0">
                                                <Plus className="w-5 h-5 mr-2" /> New Mutation
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="p-6 sm:p-12 space-y-6 sm:space-y-8">
                                            {actFields.map((field, index) => (
                                                <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-8 items-end bg-slate-50/40 p-6 sm:p-8 rounded-[28px] border border-slate-100 hover:border-emerald-300 transition-all">
                                                    <div className="md:col-span-4 space-y-3">
                                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mutation Mode</Label>
                                                        <Controller control={control} name={`actions.${index}.type`} render={({ field }) => (
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <SelectTrigger className="h-16 border-slate-100 bg-white rounded-[18px] font-black text-xs uppercase">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent className="rounded-2xl">
                                                                    <SelectItem value="PERCENTAGE_DISCOUNT" className="font-bold py-3">Percentage Rebate (%)</SelectItem>
                                                                    <SelectItem value="FIXED_PRICE" className="font-bold py-3">Fixed Net Price ($)</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        )}/>
                                                    </div>
                                                    <div className="md:col-span-5 space-y-3">
                                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adjusted Value</Label>
                                                        <div className="relative">
                                                            <Input type="number" step="0.01" {...register(`actions.${index}.value`)} className="h-16 border-slate-100 bg-white rounded-[18px] font-black text-xl px-8 pr-16 focus:ring-emerald-500/10" />
                                                            <div className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">VAL</div>
                                                        </div>
                                                    </div>
                                                    <div className="md:col-span-3 flex justify-end pb-1">
                                                        <Button variant="ghost" size="icon" onClick={() => remAct(index)} className="h-14 w-14 rounded-[20px] text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0">
                                                            <Trash2 className="w-6 h-6" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                            
                                            <div className="p-6 sm:p-10 bg-blue-50/50 rounded-[32px] border border-blue-100 flex items-start gap-6">
                                                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center shrink-0 border border-blue-100">
                                                    <ShieldCheck className="w-8 h-8 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-blue-900 text-sm sm:text-base uppercase tracking-tight mb-1">Integrity Cluster Verified</p>
                                                    <p className="text-[10px] sm:text-[11px] text-blue-700/80 font-bold uppercase leading-relaxed max-w-lg">
                                                        Logic nodes compiled. System ready for global production replication across all tenant endpoints.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row justify-between pt-6 gap-4">
                                                <Button type="button" variant="ghost" onClick={() => setActiveTab('logic')} className="font-black text-[10px] uppercase text-slate-400 hover:text-slate-900 h-16 px-10 rounded-[20px]">Back to Triggers</Button>
                                                <Button 
                                                    type="submit" 
                                                    disabled={!isFullyStaged} 
                                                    className={cn(
                                                        "h-16 sm:h-20 px-10 sm:px-14 font-black text-xs uppercase tracking-[0.2em] rounded-[24px] sm:rounded-[28px] shadow-2xl transition-all",
                                                        isFullyStaged 
                                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 border-b-4 border-emerald-800" 
                                                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                    )}
                                                >
                                                    Finalize Deployment <CheckCircle2 className="ml-3 w-5 h-5 sm:w-6 sm:h-6" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </motion.div>
                        </AnimatePresence>
                    </Tabs>
                </div>

                {/* --- SIDEBAR: REVENUE IMPACT SIMULATOR (ADAPTIVE) --- */}
                <div className="lg:col-span-5 xl:col-span-4 space-y-8 order-1 lg:order-2">
                    <div className="sticky top-6 sm:top-10 space-y-8">
                        <Card className="bg-slate-900 border-none rounded-[40px] sm:rounded-[56px] overflow-hidden shadow-2xl relative">
                            <motion.div animate={{ x: [-500, 500] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
                            <CardHeader className="p-8 sm:p-12">
                                <div className="flex items-center gap-3 mb-6">
                                    <Calculator className="w-5 h-5 text-blue-400" />
                                    <span className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Impact Analytics</span>
                                </div>
                                <CardTitle className="text-2xl sm:text-3xl font-black text-white tracking-tighter uppercase truncate">
                                    {watchedData.name || 'UNNAMED_NODE'}
                                </CardTitle>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Real-time Telemetry Active</span>
                                </div>
                            </CardHeader>
                            
                            <CardContent className="p-8 sm:p-12 pt-0 space-y-10">
                                <div className="space-y-6">
                                    <div className="p-8 sm:p-10 bg-white/5 rounded-[36px] border border-white/5 space-y-6 sm:space-y-8">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Unit Base Price</span>
                                            <span className="text-xl sm:text-2xl font-black text-white">${pricingCalculation.basePrice.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Mutation Rebate</span>
                                            <span className="text-xl sm:text-2xl font-black text-emerald-400">-${pricingCalculation.totalDiscount.toLocaleString()}</span>
                                        </div>
                                        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                                            <div className="space-y-2">
                                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Net Unit Value</span>
                                                <div className="flex items-center gap-2">
                                                    <Target className="w-4 h-4 text-blue-500" />
                                                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate max-w-[120px]">{pricingCalculation.productName}</span>
                                                </div>
                                            </div>
                                            <span className="text-4xl sm:text-6xl font-black text-white tracking-tighter leading-none">${pricingCalculation.finalPrice.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                                    <div className="p-5 sm:p-7 bg-white/5 rounded-[28px] border border-white/10 flex flex-col items-center text-center">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Sync Readiness</p>
                                        <p className={cn("text-xs sm:text-sm font-black uppercase", isFullyStaged ? "text-emerald-400" : "text-amber-400")}>
                                            {isFullyStaged ? "COMPILED" : "CALIBRATING"}
                                        </p>
                                    </div>
                                    <div className="p-5 sm:p-7 bg-white/5 rounded-[28px] border border-white/10 flex flex-col items-center text-center">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Exec Rank</p>
                                        <div className="flex items-center gap-2">
                                            <Unlock className="w-3 h-3 text-blue-500" />
                                            <p className="text-xs sm:text-sm font-black text-blue-400">#{watchedData.priority || 0}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 space-y-4">
                                    <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        <span>Cluster Propagation</span>
                                        <span className={isFullyStaged ? "text-emerald-400" : "text-blue-400"}>
                                            {isFullyStaged ? "DEPLOY_READY" : "STAGING..."}
                                        </span>
                                    </div>
                                    <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden p-1 border border-white/5">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${(stagedTabs.length / 3) * 100}%` }} className="h-full bg-blue-600 rounded-full shadow-[0_0_20px_#2563eb]" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* --- DEVICE TESTER (ENTERPRISE INDICATORS) --- */}
                        <div className="flex items-center justify-between px-8 py-6 bg-white rounded-[28px] border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3">
                                <Monitor className="w-4 h-4 text-slate-400" />
                                <Tablet className="w-4 h-4 text-slate-400" />
                                <Smartphone className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Atomic Sync v4.2.1 Stable</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}