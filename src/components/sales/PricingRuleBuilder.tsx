'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useRouter, useParams } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CheckCircle2, Zap, ShieldCheck, Layers, Percent, 
    Save, ArrowRight, Database, Globe, AlertCircle,
    Info, Calculator, Trash2, Plus, Server, Activity
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
import { createOrUpdatePricingRule } from '@/app/actions/pricing';

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
        branch_id?: string; // Multi-location support
    }[];
    actions: {
        type: string;
        value: number;
        currency_code: string; // Multi-currency support
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

export function PricingRuleBuilder({ initialData, customers, products, locations, currencies, tenantId }: BuilderProps) {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("config");
    const [stagedTabs, setStagedTabs] = useState<string[]>([]);
    
    const { control, handleSubmit, register, watch, trigger, formState: { errors } } = useForm<PricingRule>({
        defaultValues: {
            tenant_id: tenantId,
            name: initialData?.name || '',
            description: initialData?.description || '',
            priority: initialData?.priority || 0,
            is_active: initialData?.is_active ?? true,
            is_stackable: initialData?.is_stackable ?? false,
            conditions: initialData?.conditions || [],
            actions: initialData?.actions || [],
        },
    });

    const { fields: condFields, append: addCond, remove: remCond } = useFieldArray({ control, name: "conditions" });
    const { fields: actFields, append: addAct, remove: remAct } = useFieldArray({ control, name: "actions" });

    const [state, formAction] = useFormState(createOrUpdatePricingRule, { success: false, message: '' });

    // --- STAGING LOGIC ---
    const stageSection = async (tab: string, nextTab?: string) => {
        // Validate only the fields in the current section
        const fieldsToValidate: any = tab === 'config' ? ['name', 'priority'] : tab === 'logic' ? ['conditions'] : ['actions'];
        const isValid = await trigger(fieldsToValidate);

        if (isValid) {
            setStagedTabs(prev => Array.from(new Set([...prev, tab])));
            toast({
                title: "Node Staged",
                description: `Logic for ${tab.toUpperCase()} has been verified and staged in memory.`,
            });
            if (nextTab) setActiveTab(nextTab);
        } else {
            toast({
                title: "Verification Failed",
                description: "Please correct errors in this section before staging.",
                variant: "destructive"
            });
        }
    };

    const isFullyStaged = stagedTabs.length >= 3;

    const processSubmit = (data: PricingRule) => {
        if (!isFullyStaged) {
            toast({ title: "Incomplete Pipeline", description: "You must stage all 3 logic nodes before deployment.", variant: "destructive" });
            return;
        }
        const formData = new FormData();
        formData.append('ruleData', JSON.stringify(data));
        formAction(formData);
    };

    return (
        <form onSubmit={handleSubmit(processSubmit)} className="space-y-8 max-w-7xl mx-auto pb-32 relative">
            
            {/* --- GLOBAL PRODUCTION CONTROL --- */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-6 py-6 bg-slate-900 text-white rounded-3xl shadow-2xl sticky top-4 z-50 border border-slate-700">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/20 rounded-2xl border border-primary/50">
                        <Server className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter uppercase italic">Rule Deployment Engine</h1>
                        <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Multi-Tenant Node: {tenantId.split('-')[0]}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:flex flex-col items-end mr-4">
                        <span className="text-[10px] font-black text-slate-500 uppercase">Integrity Score</span>
                        <div className="flex gap-1">
                            {[1, 2, 3].map(i => (
                                <div key={i} className={`h-1.5 w-8 rounded-full ${stagedTabs.length >= i ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                            ))}
                        </div>
                    </div>
                    <Button 
                        type="submit" 
                        disabled={!isFullyStaged}
                        className={`min-w-[200px] h-14 font-black text-xs uppercase tracking-widest transition-all ${isFullyStaged ? 'bg-primary hover:scale-105 shadow-[0_0_20px_rgba(var(--primary),0.4)]' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                    >
                        {isFullyStaged ? <Zap className="w-4 h-4 mr-2 fill-current" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                        Initialize Production Rule
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4">
                <div className="lg:col-span-8 space-y-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 h-20 p-2 bg-slate-100/50 rounded-3xl mb-8 border border-slate-200">
                            {[
                                { id: 'config', label: '01. Context', icon: ShieldCheck },
                                { id: 'logic', label: '02. Conditions', icon: Layers },
                                { id: 'outcomes', label: '03. Outcomes', icon: Percent },
                            ].map(tab => (
                                <TabsTrigger 
                                    key={tab.id} 
                                    value={tab.id} 
                                    className="rounded-2xl font-black uppercase text-[11px] tracking-tighter transition-all data-[state=active]:bg-white data-[state=active]:shadow-xl relative"
                                >
                                    <tab.icon className={`w-4 h-4 mr-2 ${stagedTabs.includes(tab.id) ? 'text-emerald-500' : ''}`} />
                                    {tab.label}
                                    {stagedTabs.includes(tab.id) && (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute -top-1 -right-1 fill-white" />
                                    )}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {/* --- TAB 1: CONTEXT --- */}
                        <TabsContent value="config" className="focus-visible:outline-none">
                            <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white ring-1 ring-slate-200">
                                <div className="h-2 bg-primary" />
                                <CardHeader>
                                    <CardTitle className="text-2xl font-black uppercase italic">Node Parameters</CardTitle>
                                    <CardDescription>Define the rule namespace and execution priority.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-8">
                                    <div className="grid md:grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-500">Namespace Identifier</Label>
                                            <Input {...register('name', { required: true })} placeholder="e.g. VIP_HOLIDAY_REBATE" className="h-14 font-bold text-lg bg-slate-50 border-none rounded-xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-500">Execution Priority (Weight)</Label>
                                            <Input type="number" {...register('priority', { valueAsNumber: true })} className="h-14 font-mono font-black text-xl bg-slate-50 border-none rounded-xl" />
                                        </div>
                                    </div>
                                    <div className="p-6 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                                        <div>
                                            <p className="font-black uppercase text-xs">Live Engine Toggle</p>
                                            <p className="text-[10px] text-slate-500">Immediately push this logic to active transaction nodes.</p>
                                        </div>
                                        <Controller control={control} name="is_active" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                                    </div>
                                    
                                    <div className="flex justify-end pt-4">
                                        <Button type="button" onClick={() => stageSection('config', 'logic')} className="h-14 px-8 bg-slate-900 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all">
                                            Stage Context & Next <ArrowRight className="ml-2 w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* --- TAB 2: CONDITIONS (IF) --- */}
                        <TabsContent value="logic" className="focus-visible:outline-none">
                            <Card className="border-none shadow-2xl rounded-3xl bg-white ring-1 ring-slate-200">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-2xl font-black uppercase italic">Trigger Matrix (IF)</CardTitle>
                                        <CardDescription>Rules activate when these specific predicates return true.</CardDescription>
                                    </div>
                                    <Button type="button" onClick={() => addCond({ type: 'PRODUCT', target_id: '', quantity_min: 1 })} className="bg-primary text-white font-black uppercase text-[10px] rounded-full px-6">
                                        <Plus className="w-3 h-3 mr-2" /> Add Trigger
                                    </Button>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <AnimatePresence mode="popLayout">
                                        {condFields.map((field, index) => (
                                            <motion.div key={field.id} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col md:flex-row gap-6 items-end group relative">
                                                <div className="flex-1 space-y-2">
                                                    <Label className="text-[9px] font-black uppercase text-slate-400">Target Location</Label>
                                                    <Controller control={control} name={`conditions.${index}.branch_id`} render={({ field }) => (
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <SelectTrigger className="h-12 border-none bg-white font-bold rounded-xl shadow-sm"><SelectValue placeholder="Global" /></SelectTrigger>
                                                            <SelectContent>{locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    )}/>
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <Label className="text-[9px] font-black uppercase text-slate-400">Condition Scope</Label>
                                                    <Controller control={control} name={`conditions.${index}.type`} render={({ field }) => (
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <SelectTrigger className="h-12 border-none bg-white font-bold rounded-xl shadow-sm"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="PRODUCT">Product Group</SelectItem>
                                                                <SelectItem value="CUSTOMER">Customer Segment</SelectItem>
                                                                <SelectItem value="MIN_ORDER_VALUE">Cart Threshold</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )}/>
                                                </div>
                                                <div className="w-24 space-y-2">
                                                    <Label className="text-[9px] font-black uppercase text-slate-400">Min. Value</Label>
                                                    <Input type="number" {...register(`conditions.${index}.quantity_min`)} className="h-12 border-none bg-white font-mono font-bold rounded-xl shadow-sm text-center" />
                                                </div>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => remCond(index)} className="text-slate-300 hover:text-red-500 mb-1"><Trash2 className="w-4 h-4" /></Button>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                    <div className="flex justify-between pt-4">
                                        <Button type="button" variant="outline" onClick={() => setActiveTab('config')} className="h-14 px-8 rounded-2xl font-black uppercase">Back</Button>
                                        <Button type="button" onClick={() => stageSection('logic', 'outcomes')} className="h-14 px-8 bg-slate-900 text-white font-black uppercase rounded-2xl">
                                            Stage Triggers & Next <ArrowRight className="ml-2 w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* --- TAB 3: OUTCOMES (THEN) --- */}
                        <TabsContent value="outcomes" className="focus-visible:outline-none">
                            <Card className="border-none shadow-2xl rounded-3xl bg-white ring-1 ring-slate-200 border-l-8 border-l-emerald-500">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-2xl font-black uppercase italic text-emerald-900">Revenue Mutations (THEN)</CardTitle>
                                        <CardDescription>Configure the actual pricing adjustment applied to the transaction.</CardDescription>
                                    </div>
                                    <Button type="button" onClick={() => addAct({ type: 'PERCENTAGE_DISCOUNT', value: 0, currency_code: currencies[0] })} className="bg-emerald-600 text-white font-black uppercase text-[10px] rounded-full px-6">
                                        <Plus className="w-3 h-3 mr-2" /> Add Mutation
                                    </Button>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {actFields.map((field, index) => (
                                        <div key={field.id} className="p-8 rounded-[2rem] bg-emerald-50/30 border border-emerald-100 flex flex-col md:flex-row gap-8 items-center">
                                            <div className="flex-1 space-y-2 w-full">
                                                <Label className="text-[9px] font-black uppercase text-emerald-600">Adjustment Matrix</Label>
                                                <Controller control={control} name={`actions.${index}.type`} render={({ field }) => (
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <SelectTrigger className="h-14 border-none bg-white font-black rounded-2xl shadow-sm text-emerald-900"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="FIXED_PRICE">Fixed Price Override</SelectItem>
                                                            <SelectItem value="PERCENTAGE_DISCOUNT">Percentage Rebate</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}/>
                                            </div>
                                            <div className="w-full md:w-32 space-y-2">
                                                <Label className="text-[9px] font-black uppercase text-emerald-600">Currency</Label>
                                                <Controller control={control} name={`actions.${index}.currency_code`} render={({ field }) => (
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <SelectTrigger className="h-14 border-none bg-white font-mono font-bold rounded-2xl shadow-sm text-center"><SelectValue /></SelectTrigger>
                                                        <SelectContent>{currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                )}/>
                                            </div>
                                            <div className="w-full md:w-40 space-y-2">
                                                <Label className="text-[9px] font-black uppercase text-emerald-600">Mutation Value</Label>
                                                <Input type="number" step="0.01" {...register(`actions.${index}.value`)} className="h-14 border-none bg-white font-black text-2xl text-center rounded-2xl shadow-sm text-emerald-700" />
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => remAct(index)} className="text-emerald-200 hover:text-red-500 mt-6"><Trash2 className="w-5 h-5" /></Button>
                                        </div>
                                    ))}
                                    <div className="flex justify-between pt-4">
                                        <Button type="button" variant="outline" onClick={() => setActiveTab('logic')} className="h-14 px-8 rounded-2xl font-black uppercase">Back</Button>
                                        <Button type="button" onClick={() => stageSection('outcomes')} className="h-14 px-8 bg-emerald-600 text-white font-black uppercase rounded-2xl shadow-lg shadow-emerald-200 hover:bg-emerald-700">
                                            Stage Final Mutation <CheckCircle2 className="ml-2 w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* --- SIDEBAR LOGIC PREVIEW --- */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="border-none shadow-2xl bg-slate-900 text-white rounded-[2rem] overflow-hidden sticky top-32">
                        <div className="p-8 space-y-8">
                            <div className="flex items-center gap-3">
                                <Activity className="w-5 h-5 text-primary animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Logic Simulation</span>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-end border-b border-slate-800 pb-4">
                                    <p className="text-[10px] font-black text-slate-500 uppercase">Namespace</p>
                                    <p className="font-bold truncate max-w-[150px]">{watch('name') || 'UNDEFINED'}</p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 italic text-sm text-slate-300 leading-relaxed">
                                    {condFields.length > 0 ? (
                                        <span>IF <span className="text-primary font-bold">({condFields.map(c => c.type).join(' AND ')})</span></span>
                                    ) : "Global Context Active"}
                                    <br />
                                    {actFields.length > 0 ? (
                                        <span>THEN APPLY <span className="text-emerald-400 font-bold">{actFields.length} MUTATION(S)</span></span>
                                    ) : <span className="text-red-400">NULL OPERATION</span>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                                    <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Staged Nodes</p>
                                    <p className="text-xl font-black text-primary">{stagedTabs.length}/3</p>
                                </div>
                                <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                                    <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Priority Index</p>
                                    <p className="text-xl font-black text-blue-400">{watch('priority')}</p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-800">
                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">
                                    <span>Engine Status</span>
                                    <span className={isFullyStaged ? 'text-emerald-400' : 'text-amber-400'}>{isFullyStaged ? 'READY TO PUSH' : 'VERIFYING NODES'}</span>
                                </div>
                                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${(stagedTabs.length / 3) * 100}%` }} className="h-full bg-primary" />
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </form>
    );
}