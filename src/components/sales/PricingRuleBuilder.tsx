'use client';

import React, { useState, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useFormState } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CheckCircle2, Zap, ShieldCheck, Layers, Percent, 
    ArrowRight, Database, Globe, AlertCircle,
    Trash2, Plus, Server, Activity, ShieldAlert,
    ChevronRight, Cpu, Box, Users, CreditCard,Target
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

// --- ENTERPRISE TYPES ---
export interface PricingRule {
    id?: string;
    tenant_id: string;
    name: string;
    description: string;
    priority: number;
    is_active: boolean;
    is_stackable: boolean;
    conditions: {
        type: string;
        target_id: string;
        quantity_min: number;
        branch_id?: string; 
    }[];
    actions: {
        type: string;
        value: number;
        currency_code: string; 
    }[];
}

interface BuilderProps {
    initialData?: any;
    customers: { id: string; name: string }[];
    products: { id: string; name: string }[];
    locations: { id: string; name: string }[];
    currencies: string[];
    tenantId: string;
}

/**
 * ENTERPRISE PRICING RULE BUILDER
 * A high-integrity interface for deploying complex revenue logic.
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
    
    // 1. FORM ORCHESTRATION
    const { control, handleSubmit, register, watch, trigger, formState: { errors } } = useForm<PricingRule>({
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

    // 2. SERVER ACTION STATE
    const [state, formAction] = useFormState(createOrUpdatePricingRule, { success: false, message: '' });

    // 3. LOGIC STAGING ENGINE
    const stageSection = async (tab: string, nextTab?: string) => {
        const fieldsToValidate: any = tab === 'config' ? ['name', 'priority'] : tab === 'logic' ? ['conditions'] : ['actions'];
        const isValid = await trigger(fieldsToValidate);

        if (isValid) {
            setStagedTabs(prev => Array.from(new Set([...prev, tab])));
            toast({
                title: "Section Verified",
                description: `Node ${tab.toUpperCase()} logic has been validated and staged.`,
                className: "bg-emerald-600 text-white border-none",
            });
            if (nextTab) setActiveTab(nextTab);
        } else {
            toast({
                title: "Logic Error",
                description: "Critical fields are missing in this section.",
                variant: "destructive"
            });
        }
    };

    const isFullyStaged = stagedTabs.length >= 3;
    const watchedData = watch();

    // 4. DEPLOYMENT PROTOCOL
    const processSubmit = (data: PricingRule) => {
        if (!isFullyStaged) {
            toast({ title: "Deployment Blocked", description: "You must verify all three logic nodes before production push.", variant: "destructive" });
            return;
        }
        const formData = new FormData();
        formData.append('ruleData', JSON.stringify({ ...data, id: initialData?.id }));
        formData.append('conditions', JSON.stringify(data.conditions));
        formData.append('actions', JSON.stringify(data.actions));
        
        formAction(formData);
    };

    return (
        <form onSubmit={handleSubmit(processSubmit)} className="space-y-10 max-w-full mx-auto pb-40 selection:bg-primary selection:text-white">
            
            {/* --- GLOBAL DEPLOYMENT STATUS BAR --- */}
            <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex flex-col md:flex-row items-center justify-between gap-6 px-8 py-6 bg-slate-900 text-white rounded-[2.5rem] shadow-2xl sticky top-6 z-[60] border border-slate-700/50 backdrop-blur-xl bg-slate-900/95"
            >
                <div className="flex items-center gap-5">
                    <div className="p-3.5 bg-primary shadow-xl shadow-primary/20 rounded-2xl border border-primary/30">
                        <Cpu className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[8px] font-black tracking-[0.2em] px-1.5 py-0 h-4">
                                LIVE_CLUSTER_V4
                            </Badge>
                            <span className="text-[10px] text-slate-500 font-mono tracking-widest font-bold">MULTI_TENANT_NODE</span>
                        </div>
                        <h1 className="text-2xl font-black tracking-tighter uppercase italic leading-none">
                            {initialData?.id ? 'Patching Logic Node' : 'Deploying New Logic'}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden xl:flex flex-col items-end mr-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Integrity Check</span>
                        <div className="flex gap-1.5">
                            {[1, 2, 3].map(i => (
                                <motion.div 
                                    key={i} 
                                    animate={{ scale: stagedTabs.length >= i ? 1.1 : 1 }}
                                    className={cn(
                                        "h-1.5 w-10 rounded-full transition-colors duration-500",
                                        stagedTabs.length >= i ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-700'
                                    )} 
                                />
                            ))}
                        </div>
                    </div>
                    <Button 
                        type="submit" 
                        disabled={!isFullyStaged}
                        className={cn(
                            "min-w-[240px] h-14 font-black text-xs uppercase tracking-[0.2em] transition-all rounded-2xl border-b-4",
                            isFullyStaged 
                                ? 'bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-95 shadow-2xl shadow-primary/30 border-primary-foreground/20' 
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed border-transparent'
                        )}
                    >
                        {isFullyStaged ? <Zap className="w-4 h-4 mr-3 fill-current animate-pulse" /> : <ShieldCheck className="w-4 h-4 mr-3" />}
                        Execute Production Push
                    </Button>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 px-2">
                
                {/* --- MAIN CONFIGURATION WORKSPACE --- */}
                <div className="lg:col-span-8 space-y-10">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 h-24 p-3 bg-white/50 backdrop-blur-md rounded-[2.5rem] mb-10 border border-slate-200/60 shadow-inner">
                            {[
                                { id: 'config', label: '01. Context', icon: ShieldCheck, color: 'text-blue-500' },
                                { id: 'logic', label: '02. Conditions', icon: Layers, color: 'text-indigo-500' },
                                { id: 'outcomes', label: '03. Outcomes', icon: Percent, color: 'text-emerald-500' },
                            ].map(tab => (
                                <TabsTrigger 
                                    key={tab.id} 
                                    value={tab.id} 
                                    className="rounded-3xl font-black uppercase text-[10px] tracking-widest transition-all data-[state=active]:bg-white data-[state=active]:shadow-2xl data-[state=active]:text-slate-900 relative group"
                                >
                                    <tab.icon className={cn("w-4 h-4 mr-2 transition-transform group-hover:scale-110", tab.color)} />
                                    {tab.label}
                                    {stagedTabs.includes(tab.id) && (
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500 absolute -top-1.5 -right-1.5 fill-white shadow-xl" />
                                        </motion.div>
                                    )}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {/* --- TAB 1: CONTEXT --- */}
                        <TabsContent value="config" className="focus-visible:outline-none outline-none ring-0">
                            <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white ring-1 ring-slate-100">
                                <div className="h-3 bg-gradient-to-r from-blue-500 to-indigo-600" />
                                <CardHeader className="p-10 pb-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Badge variant="outline" className="font-mono text-[9px] border-blue-200 text-blue-600 uppercase">Step_01</Badge>
                                        <div className="h-px flex-1 bg-slate-100" />
                                    </div>
                                    <CardTitle className="text-3xl font-black uppercase italic text-slate-800">Namespace Parameters</CardTitle>
                                    <CardDescription className="text-slate-400 font-medium italic">Define the logic cluster identity and execution priority weight.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-10 space-y-10">
                                    <div className="grid md:grid-cols-2 gap-10">
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Logic Identifier</Label>
                                            <Input 
                                                {...register('name', { required: true })} 
                                                placeholder="e.g. HIGH_LOAD_REBATE_2025" 
                                                className="h-16 px-6 font-black text-xl bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-300" 
                                            />
                                            {errors.name && <p className="text-[10px] font-bold text-red-500 ml-1 uppercase">Identifier is required for trace logs</p>}
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Priority Weight (0-100)</Label>
                                            <div className="relative">
                                                <Input 
                                                    type="number" 
                                                    {...register('priority', { valueAsNumber: true, min: 1, max: 100 })} 
                                                    className="h-16 px-6 font-mono font-black text-2xl bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all text-center" 
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">RANK</div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <Separator className="opacity-50" />

                                    <div className="p-8 bg-slate-50 rounded-[2rem] flex items-center justify-between border border-slate-100 group">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200">
                                                <Zap className={cn("w-5 h-5 transition-colors", watchedData.is_active ? "text-yellow-500 fill-yellow-500" : "text-slate-300")} />
                                            </div>
                                            <div>
                                                <p className="font-black uppercase text-xs tracking-tight text-slate-800">Production Injection</p>
                                                <p className="text-[10px] text-slate-400 font-medium">When enabled, logic will propagate to active transaction nodes immediately.</p>
                                            </div>
                                        </div>
                                        <Controller control={control} name="is_active" render={({ field }) => (
                                            <Switch 
                                                checked={field.value} 
                                                onCheckedChange={field.onChange} 
                                                className="data-[state=checked]:bg-emerald-500"
                                            />
                                        )} />
                                    </div>
                                    
                                    <div className="flex justify-end">
                                        <Button 
                                            type="button" 
                                            onClick={() => stageSection('config', 'logic')} 
                                            className="h-16 px-10 bg-slate-900 text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-900/10"
                                        >
                                            Verify Context <ArrowRight className="ml-3 w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* --- TAB 2: CONDITIONS (IF) --- */}
                        <TabsContent value="logic" className="focus-visible:outline-none">
                            <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white ring-1 ring-slate-100 overflow-hidden">
                                <div className="h-3 bg-gradient-to-r from-indigo-500 to-purple-600" />
                                <CardHeader className="p-10 flex flex-row items-center justify-between bg-white">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Badge variant="outline" className="font-mono text-[9px] border-indigo-200 text-indigo-600 uppercase">Step_02</Badge>
                                            <div className="h-px flex-1 bg-slate-100" />
                                        </div>
                                        <CardTitle className="text-3xl font-black uppercase italic text-slate-800">Predicate Matrix (IF)</CardTitle>
                                        <CardDescription className="text-slate-400 font-medium italic">Define the conditional triggers required for logic activation.</CardDescription>
                                    </div>
                                    <Button 
                                        type="button" 
                                        onClick={() => addCond({ type: 'PRODUCT', target_id: '', quantity_min: 1 })} 
                                        className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl px-6 shadow-lg shadow-indigo-600/20"
                                    >
                                        <Plus className="w-3 h-3 mr-2" /> New Predicate
                                    </Button>
                                </CardHeader>
                                <CardContent className="p-10 space-y-8">
                                    {condFields.length === 0 && (
                                        <div className="py-20 border-4 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center text-center">
                                            <Layers className="w-12 h-12 text-slate-200 mb-4" />
                                            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Global scope active: No specific triggers defined.</p>
                                        </div>
                                    )}
                                    <AnimatePresence mode="popLayout">
                                        {condFields.map((field, index) => (
                                            <motion.div 
                                                key={field.id} 
                                                initial={{ x: -20, opacity: 0 }} 
                                                animate={{ x: 0, opacity: 1 }} 
                                                className="p-8 rounded-[2rem] bg-slate-50 border border-slate-200/50 flex flex-col xl:flex-row gap-8 items-end relative shadow-sm hover:shadow-md transition-shadow group"
                                            >
                                                <div className="flex-1 space-y-3 w-full">
                                                    <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-2">
                                                        <Globe className="w-3 h-3" /> Regional Constraint
                                                    </Label>
                                                    <Controller control={control} name={`conditions.${index}.branch_id`} render={({ field }) => (
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <SelectTrigger className="h-14 border-none bg-white font-black rounded-xl shadow-sm text-slate-700">
                                                                <SelectValue placeholder="GLOBAL_NETWORK" />
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-xl border-slate-200 shadow-2xl">
                                                                <SelectItem value="global_all">ALL_LOCATIONS</SelectItem>
                                                                {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name.toUpperCase()}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    )}/>
                                                </div>
                                                <div className="flex-1 space-y-3 w-full">
                                                    <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-2">
                                                        <Target className="w-3 h-3" /> Logical Scope
                                                    </Label>
                                                    <Controller control={control} name={`conditions.${index}.type`} render={({ field }) => (
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <SelectTrigger className="h-14 border-none bg-white font-black rounded-xl shadow-sm text-slate-700">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-xl border-slate-200 shadow-2xl">
                                                                <SelectItem value="PRODUCT">
                                                                    <div className="flex items-center gap-2 font-bold"><Box className="w-3.5 h-3.5 text-blue-500"/> PRODUCT_GROUP</div>
                                                                </SelectItem>
                                                                <SelectItem value="CUSTOMER">
                                                                     <div className="flex items-center gap-2 font-bold"><Users className="w-3.5 h-3.5 text-purple-500"/> CUSTOMER_SEGMENT</div>
                                                                </SelectItem>
                                                                <SelectItem value="MIN_ORDER_VALUE">
                                                                    <div className="flex items-center gap-2 font-bold"><CreditCard className="w-3.5 h-3.5 text-emerald-500"/> CART_THRESHOLD</div>
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )}/>
                                                </div>
                                                <div className="w-full xl:w-32 space-y-3">
                                                    <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Threshold</Label>
                                                    <Input type="number" {...register(`conditions.${index}.quantity_min`)} className="h-14 border-none bg-white font-mono font-black text-xl rounded-xl shadow-sm text-center" />
                                                </div>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => remCond(index)} className="h-14 w-14 rounded-xl text-slate-200 hover:text-red-600 hover:bg-red-50 transition-all border border-transparent hover:border-red-100">
                                                    <Trash2 className="w-5 h-5" />
                                                </Button>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                    
                                    <Separator className="opacity-50" />

                                    <div className="flex justify-between pt-4">
                                        <Button type="button" variant="ghost" onClick={() => setActiveTab('config')} className="h-14 px-8 rounded-xl font-black uppercase text-slate-400 hover:text-slate-900 transition-all">Back</Button>
                                        <Button type="button" onClick={() => stageSection('logic', 'outcomes')} className="h-14 px-10 bg-slate-900 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl">
                                            Verify Triggers <ArrowRight className="ml-3 w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* --- TAB 3: OUTCOMES (THEN) --- */}
                        <TabsContent value="outcomes" className="focus-visible:outline-none">
                            <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white ring-1 ring-slate-100 overflow-hidden">
                                <div className="h-3 bg-gradient-to-r from-emerald-500 to-teal-600" />
                                <CardHeader className="p-10 flex flex-row items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Badge variant="outline" className="font-mono text-[9px] border-emerald-200 text-emerald-600 uppercase">Step_03</Badge>
                                            <div className="h-px flex-1 bg-slate-100" />
                                        </div>
                                        <CardTitle className="text-3xl font-black uppercase italic text-emerald-900">Revenue Mutations (THEN)</CardTitle>
                                        <CardDescription className="text-slate-400 font-medium italic">Define the resulting price adjustments applied to the transaction cluster.</CardDescription>
                                    </div>
                                    <Button 
                                        type="button" 
                                        onClick={() => addAct({ type: 'PERCENTAGE_DISCOUNT', value: 0, currency_code: currencies[0] })} 
                                        className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl px-6 shadow-lg shadow-emerald-600/20"
                                    >
                                        <Plus className="w-3 h-3 mr-2" /> New Mutation
                                    </Button>
                                </CardHeader>
                                <CardContent className="p-10 space-y-8">
                                    {actFields.map((field, index) => (
                                        <motion.div 
                                            key={field.id} 
                                            initial={{ scale: 0.98, opacity: 0 }} 
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="p-10 rounded-[2.5rem] bg-emerald-50/20 border border-emerald-100 flex flex-col xl:flex-row gap-10 items-center shadow-sm relative group"
                                        >
                                            <div className="flex-1 space-y-3 w-full">
                                                <Label className="text-[9px] font-black uppercase text-emerald-600 tracking-[0.2em] ml-1">Adjustment Logic</Label>
                                                <Controller control={control} name={`actions.${index}.type`} render={({ field }) => (
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <SelectTrigger className="h-16 border-none bg-white font-black rounded-2xl shadow-sm text-emerald-900 text-lg">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-2xl border-emerald-100 shadow-2xl">
                                                            <SelectItem value="FIXED_PRICE" className="font-bold">PRICE_OVERRIDE</SelectItem>
                                                            <SelectItem value="PERCENTAGE_DISCOUNT" className="font-bold">PERCENTAGE_REBATE</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}/>
                                            </div>
                                            <div className="w-full xl:w-40 space-y-3">
                                                <Label className="text-[9px] font-black uppercase text-emerald-600 tracking-[0.2em] ml-1 text-center block">Currency Node</Label>
                                                <Controller control={control} name={`actions.${index}.currency_code`} render={({ field }) => (
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <SelectTrigger className="h-16 border-none bg-white font-mono font-black text-xl rounded-2xl shadow-sm text-center">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl">{currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                )}/>
                                            </div>
                                            <div className="w-full xl:w-52 space-y-3">
                                                <Label className="text-[9px] font-black uppercase text-emerald-600 tracking-[0.2em] ml-1 text-center block">Mutation Intensity</Label>
                                                <Input 
                                                    type="number" 
                                                    step="0.01" 
                                                    {...register(`actions.${index}.value`)} 
                                                    className="h-16 border-none bg-white font-black text-3xl text-center rounded-2xl shadow-sm text-emerald-600 focus:ring-emerald-500/20" 
                                                />
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => remAct(index)} className="h-16 w-16 text-emerald-200 hover:text-red-500 hover:bg-red-50 transition-all rounded-2xl mt-6">
                                                <Trash2 className="w-6 h-6" />
                                            </Button>
                                        </motion.div>
                                    ))}
                                    
                                    <Separator className="opacity-50" />

                                    <div className="flex justify-between pt-4">
                                        <Button type="button" variant="ghost" onClick={() => setActiveTab('logic')} className="h-14 px-8 rounded-xl font-black uppercase text-slate-400 hover:text-slate-900 transition-all">Back</Button>
                                        <Button type="button" onClick={() => stageSection('outcomes')} className="h-16 px-12 bg-emerald-600 text-white font-black uppercase tracking-[0.2em] rounded-[1.25rem] shadow-2xl shadow-emerald-500/30 hover:bg-emerald-700 transition-all">
                                            Stage Final Mutation <CheckCircle2 className="ml-3 w-5 h-5" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* --- SIDEBAR TELEMETRY & PREVIEW --- */}
                <div className="lg:col-span-4 space-y-8">
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="sticky top-40 space-y-8"
                    >
                        {/* 1. LOGIC SIMULATION PREVIEW */}
                        <Card className="border-none shadow-2xl bg-slate-900 text-white rounded-[2.5rem] overflow-hidden border-t-4 border-primary">
                            <CardHeader className="p-8 pb-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <Activity className="w-5 h-5 text-primary animate-pulse" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Logic Simulation</span>
                                    </div>
                                    <Badge className="bg-white/10 text-white border-none font-mono text-[9px] h-5">{tenantId.split('-')[0]}</Badge>
                                </div>
                                <h3 className="text-xl font-black italic uppercase tracking-tight truncate leading-none">
                                    {watchedData.name || 'UNNAMED_NODE'}
                                </h3>
                            </CardHeader>
                            <CardContent className="p-8 pt-0 space-y-8">
                                <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10 space-y-4">
                                    <div className="flex gap-3">
                                        <span className="text-[10px] font-black text-primary uppercase">Trigger</span>
                                        <div className="h-px flex-1 bg-white/10 mt-1.5" />
                                    </div>
                                    <p className="text-xs font-medium text-slate-400 leading-relaxed italic">
                                        {condFields.length > 0 ? (
                                            <>Apply logic IF <span className="text-white font-bold tracking-tight">({condFields.map(c => c.type).join(' ∩ ')})</span> requirements are met.</>
                                        ) : "Standard global priority override active."}
                                    </p>
                                    
                                    <div className="flex gap-3 pt-2">
                                        <span className="text-[10px] font-black text-emerald-400 uppercase">Mutation</span>
                                        <div className="h-px flex-1 bg-white/10 mt-1.5" />
                                    </div>
                                    <p className="text-xs font-medium text-slate-400 italic">
                                        {actFields.length > 0 ? (
                                            <>Execute <span className="text-emerald-400 font-black">{actFields.length} distinct mutation(s)</span> on the pricing cluster.</>
                                        ) : <span className="text-red-400 font-black">WARNING: NULL_OPERATION_DETECTED</span>}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-5 bg-white/5 rounded-2xl border border-white/10 group hover:bg-white/10 transition-colors">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Nodes Staged</p>
                                        <p className="text-2xl font-black text-primary">{stagedTabs.length}<span className="text-xs opacity-30">/3</span></p>
                                    </div>
                                    <div className="p-5 bg-white/5 rounded-2xl border border-white/10 group hover:bg-white/10 transition-colors">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Priority Rank</p>
                                        <p className="text-2xl font-black text-blue-400 italic">{watchedData.priority}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-slate-500">Deployment Pipeline</span>
                                        <span className={cn(isFullyStaged ? 'text-emerald-400' : 'text-amber-500 animate-pulse')}>
                                            {isFullyStaged ? 'CLUSTER_READY' : 'VERIFYING_NODES...'}
                                        </span>
                                    </div>
                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                                        <motion.div 
                                            initial={{ width: 0 }} 
                                            animate={{ width: `${(stagedTabs.length / 3) * 100}%` }} 
                                            className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" 
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 2. SECURITY ADVISORY */}
                        {!isFullyStaged && (
                            <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-700 rounded-[1.5rem] p-6">
                                <ShieldAlert className="h-5 w-5 text-amber-600" />
                                <AlertTitle className="font-black uppercase text-[10px] tracking-widest mb-2">Security Protocol</AlertTitle>
                                <AlertDescription className="text-xs font-medium leading-relaxed opacity-80 italic">
                                    All logic nodes must be individually verified and staged before the production cluster allows a global push.
                                </AlertDescription>
                            </Alert>
                        )}
                    </motion.div>
                </div>
            </div>
        </form>
    );
}