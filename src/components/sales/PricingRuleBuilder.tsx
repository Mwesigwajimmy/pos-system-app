'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useFormState } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CheckCircle2, Zap, ShieldCheck, Layers, Percent, 
    ArrowRight, Globe, Trash2, Plus, Activity, ShieldAlert,
    Cpu, Box, Users, CreditCard, Target, ChevronRight,
    Search, LayoutGrid, Settings2
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
    products: { id: string; name: string }[];
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
    
    const { control, handleSubmit, register, watch, trigger, formState: { errors } } = useForm({
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

    const [state, formAction] = useFormState(createOrUpdatePricingRule, { success: false, message: '' });

    const stageSection = async (tab: string, nextTab?: string) => {
        const fieldsToValidate: any = tab === 'config' ? ['name', 'priority'] : tab === 'logic' ? ['conditions'] : ['actions'];
        const isValid = await trigger(fieldsToValidate);

        if (isValid) {
            setStagedTabs(prev => Array.from(new Set([...prev, tab])));
            if (nextTab) setActiveTab(nextTab);
        } else {
            toast({ title: "Validation Error", description: "Please complete required fields.", variant: "destructive" });
        }
    };

    const isFullyStaged = stagedTabs.length >= 3;
    const watchedData = watch();

    return (
        <form onSubmit={handleSubmit((data) => {
            const formData = new FormData();
            formData.append('ruleData', JSON.stringify({ ...data, id: initialData?.id }));
            formAction(formData);
        })} className="w-full max-w-[1600px] mx-auto p-4 md:p-8 lg:p-12 space-y-8 bg-[#f8fafc]">
            
            {/* TOP ENGINE STATUS BAR */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
                        <Cpu className="text-white w-7 h-7" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-blue-50 text-blue-600 border-blue-100 font-semibold px-2 py-0 text-[10px] uppercase tracking-wider">
                                System Node
                            </Badge>
                            <span className="text-xs text-slate-400 font-medium tracking-tight">V4.0.2 Deployment</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                            {initialData?.id ? 'Edit Configuration' : 'Deploy Pricing Engine'}
                        </h1>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                    <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg border border-slate-100">
                        <Activity className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-semibold text-slate-600">Integrity: {stagedTabs.length}/3 Verified</span>
                    </div>
                    <Button 
                        type="submit" 
                        disabled={!isFullyStaged}
                        className={cn(
                            "flex-1 lg:flex-none h-12 px-8 font-bold text-sm uppercase tracking-wide transition-all rounded-xl",
                            isFullyStaged 
                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 shadow-lg hover:-translate-y-0.5" 
                            : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                        )}
                    >
                        {isFullyStaged ? <Zap className="w-4 h-4 mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                        Push to Production
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* PRIMARY WORKSPACE */}
                <div className="lg:col-span-8 space-y-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid grid-cols-3 w-full bg-white border border-slate-200 p-1.5 rounded-2xl h-16 shadow-sm">
                            {[
                                { id: 'config', label: '1. Context', icon: Settings2 },
                                { id: 'logic', label: '2. Conditions', icon: Layers },
                                { id: 'outcomes', label: '3. Outcomes', icon: Percent },
                            ].map(tab => (
                                <TabsTrigger 
                                    key={tab.id} 
                                    value={tab.id} 
                                    className="rounded-xl font-semibold text-sm transition-all hover:bg-slate-50 data-[state=active]:bg-slate-900 data-[state=active]:text-white flex items-center justify-center gap-2"
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                    {stagedTabs.includes(tab.id) && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                                className="mt-8"
                            >
                                {/* TAB 1: CONFIG */}
                                <TabsContent value="config" className="focus-visible:outline-none">
                                    <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
                                        <CardHeader className="p-8 border-b border-slate-50">
                                            <CardTitle className="text-xl font-bold text-slate-900">Logic Parameters</CardTitle>
                                            <CardDescription className="text-slate-500 font-medium">Set the primary identifiers and execution order for this node.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-8 space-y-10">
                                            <div className="grid md:grid-cols-2 gap-8">
                                                <div className="space-y-3">
                                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Logic Identifier</Label>
                                                    <Input {...register('name')} placeholder="e.g. CORE_REVENUE_2025" className="h-14 border-slate-200 focus:ring-4 focus:ring-blue-500/10 rounded-xl font-medium" />
                                                </div>
                                                <div className="space-y-3">
                                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Priority Weight</Label>
                                                    <Input type="number" {...register('priority')} className="h-14 border-slate-200 rounded-xl font-medium" />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-white rounded-lg shadow-sm border border-slate-100">
                                                        <ShieldCheck className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 text-sm">Active Deployment State</p>
                                                        <p className="text-xs text-slate-500 font-medium">Allow this rule to influence live checkout calculations.</p>
                                                    </div>
                                                </div>
                                                <Controller control={control} name="is_active" render={({ field }) => (
                                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                )} />
                                            </div>
                                            <div className="flex justify-end pt-4">
                                                <Button type="button" onClick={() => stageSection('config', 'logic')} className="h-14 px-10 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition-all group">
                                                    Validate Context <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* TAB 2: CONDITIONS */}
                                <TabsContent value="logic" className="focus-visible:outline-none">
                                    <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
                                        <CardHeader className="p-8 flex flex-row items-center justify-between gap-4 border-b border-slate-50">
                                            <div>
                                                <CardTitle className="text-xl font-bold text-slate-900">Condition Matrix</CardTitle>
                                                <CardDescription className="text-slate-500 font-medium">Logic triggers required to activate pricing mutations.</CardDescription>
                                            </div>
                                            <Button type="button" variant="outline" onClick={() => addCond({ type: 'PRODUCT', target_id: '', quantity_min: 1 })} className="rounded-xl border-slate-200 hover:bg-slate-50 font-bold h-11 px-5">
                                                <Plus className="w-4 h-4 mr-2" /> New Trigger
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="p-8 space-y-6">
                                            {condFields.length === 0 && (
                                                <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                                                    <Layers className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                                    <p className="text-slate-400 font-bold text-sm tracking-wide">NO CONDITIONS DEFINED (GLOBAL SCOPE)</p>
                                                </div>
                                            )}
                                            {condFields.map((field, index) => (
                                                <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-200 transition-all">
                                                    <div className="md:col-span-5 space-y-2">
                                                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Logic Group</Label>
                                                        <Controller control={control} name={`conditions.${index}.type`} render={({ field }) => (
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <SelectTrigger className="h-11 border-slate-200 rounded-lg hover:bg-slate-50 font-semibold transition-colors">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent className="rounded-xl">
                                                                    <SelectItem value="PRODUCT" className="font-medium">Product Group</SelectItem>
                                                                    <SelectItem value="CUSTOMER" className="font-medium">Customer Profile</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        )}/>
                                                    </div>
                                                    <div className="md:col-span-5 space-y-2">
                                                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Location Filter</Label>
                                                        <Controller control={control} name={`conditions.${index}.branch_id`} render={({ field }) => (
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <SelectTrigger className="h-11 border-slate-200 rounded-lg font-semibold">
                                                                    <SelectValue placeholder="All Branches" />
                                                                </SelectTrigger>
                                                                <SelectContent className="rounded-xl">
                                                                    {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                        )}/>
                                                    </div>
                                                    <div className="md:col-span-2 flex justify-end">
                                                        <Button variant="ghost" size="icon" onClick={() => remCond(index)} className="h-11 w-11 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                                                            <Trash2 className="w-5 h-5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex justify-between pt-6">
                                                <Button type="button" variant="ghost" onClick={() => setActiveTab('config')} className="font-bold text-slate-500 hover:text-slate-900 h-12 rounded-xl">Back</Button>
                                                <Button type="button" onClick={() => stageSection('logic', 'outcomes')} className="h-12 px-8 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-200">
                                                    Stage Conditions <ChevronRight className="ml-2 w-4 h-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* TAB 3: OUTCOMES */}
                                <TabsContent value="outcomes" className="focus-visible:outline-none">
                                    <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
                                        <CardHeader className="p-8 flex flex-row items-center justify-between gap-4 border-b border-slate-50">
                                            <div>
                                                <CardTitle className="text-xl font-bold text-slate-900">Revenue Mutations</CardTitle>
                                                <CardDescription className="text-slate-500 font-medium">Resulting price adjustments for this logic node.</CardDescription>
                                            </div>
                                            <Button type="button" variant="outline" onClick={() => addAct({ type: 'PERCENTAGE_DISCOUNT', value: 0, currency_code: currencies[0] })} className="rounded-xl border-slate-200 hover:bg-slate-50 font-bold h-11 px-5">
                                                <Plus className="w-4 h-4 mr-2" /> New Mutation
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="p-8 space-y-6">
                                            {actFields.map((field, index) => (
                                                <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-all">
                                                    <div className="md:col-span-4 space-y-2">
                                                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Adjustment Mode</Label>
                                                        <Controller control={control} name={`actions.${index}.type`} render={({ field }) => (
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <SelectTrigger className="h-12 border-slate-200 bg-white rounded-xl font-bold">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent className="rounded-xl">
                                                                    <SelectItem value="FIXED_PRICE">Fixed Price</SelectItem>
                                                                    <SelectItem value="PERCENTAGE_DISCOUNT">Percentage Rebate</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        )}/>
                                                    </div>
                                                    <div className="md:col-span-5 space-y-2">
                                                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Mutation Value</Label>
                                                        <div className="relative">
                                                            <Input type="number" step="0.01" {...register(`actions.${index}.value`)} className="h-12 border-slate-200 bg-white rounded-xl font-bold pl-12" />
                                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">VAL</div>
                                                        </div>
                                                    </div>
                                                    <div className="md:col-span-3 flex justify-end">
                                                        <Button variant="ghost" size="icon" onClick={() => remAct(index)} className="h-12 w-12 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                                                            <Trash2 className="w-5 h-5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex justify-between pt-6">
                                                <Button type="button" variant="ghost" onClick={() => setActiveTab('logic')} className="font-bold text-slate-500 h-12 px-6 rounded-xl">Back</Button>
                                                <Button type="button" onClick={() => stageSection('outcomes')} className="h-14 px-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-100 transition-all">
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

                {/* SIDEBAR: TELEMETRY & PREVIEW */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="sticky top-12 space-y-6">
                        <Card className="bg-slate-900 border-none rounded-3xl overflow-hidden shadow-2xl">
                            <div className="h-2 w-full bg-blue-500" />
                            <CardHeader className="p-8">
                                <div className="flex items-center gap-2 mb-4">
                                    <Activity className="w-4 h-4 text-blue-400" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Simulation Node</span>
                                </div>
                                <CardTitle className="text-xl font-bold text-white tracking-tight">
                                    {watchedData.name || 'Unnamed_Logic'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 pt-0 space-y-8">
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <div className="w-1 bg-blue-500/20 rounded-full" />
                                        <div className="flex-1">
                                            <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">Trigger Path</p>
                                            <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                                {condFields.length > 0 ? `Evaluating ${condFields.length} active conditions.` : "Global scope initialization."}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-1 bg-emerald-500/20 rounded-full" />
                                        <div className="flex-1">
                                            <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">Impact Result</p>
                                            <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                                {actFields.length > 0 ? `${actFields.length} mutations detected.` : "Neutral pricing state."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Status</p>
                                        <p className="text-sm font-bold text-white">{stagedTabs.length}/3 Verified</p>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Priority</p>
                                        <p className="text-sm font-bold text-blue-400">Rank #{watchedData.priority}</p>
                                    </div>
                                </div>

                                <div className="pt-4 space-y-3">
                                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        <span>Staging Progress</span>
                                        <span className={isFullyStaged ? "text-emerald-400" : "text-blue-400"}>
                                            {isFullyStaged ? "Deployment Ready" : "In Progress"}
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }} 
                                            animate={{ width: `${(stagedTabs.length / 3) * 100}%` }} 
                                            className="h-full bg-blue-500 rounded-full" 
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <AnimatePresence>
                            {!isFullyStaged && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                    <Alert className="bg-blue-50 border-blue-100 rounded-2xl p-5">
                                        <ShieldAlert className="h-5 w-5 text-blue-600" />
                                        <AlertTitle className="text-xs font-bold text-blue-900 uppercase tracking-widest mb-1">Protocol Lock</AlertTitle>
                                        <AlertDescription className="text-xs text-blue-700/80 font-medium">
                                            Please verify all three logic nodes to unlock production deployment capabilities.
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