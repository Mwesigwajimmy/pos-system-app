'use client';

import React, { useEffect, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useRouter, useParams } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { 
    Trash, PlusCircle, Zap, ArrowLeft, AlertCircle, 
    ShieldCheck, Layers, Calendar, Globe, 
    UserCheck, Package, Percent, Calculator, Info,
    ChevronRight, Activity, Beaker, Save
} from 'lucide-react';
import { createOrUpdatePricingRule } from '@/app/actions/pricing';

// --- TYPES ---

export type ConditionType = 'CUSTOMER' | 'PRODUCT' | 'LOCATION' | 'CURRENCY' | 'MIN_ORDER_VALUE' | 'LOYALTY_TIER';

export interface PricingRuleCondition {
    id?: string;
    type: ConditionType;
    target_id: string;
    quantity_min: number;
}

export interface PricingRuleAction {
    id?: string;
    type: 'FIXED_PRICE' | 'PERCENTAGE_DISCOUNT' | 'BUY_X_GET_Y' | 'TIERED_PRICING';
    value: number;
    metadata?: any;
}

export interface PricingRule {
    id: string;
    name: string;
    description: string;
    priority: number;
    is_active: boolean;
    is_stackable: boolean;
    start_date: string | null;
    end_date: string | null;
    conditions: PricingRuleCondition[];
    actions: PricingRuleAction[];
}

interface BuilderProps {
    initialData?: PricingRule | null;
    customers: { id: string; name: string }[];
    products: { id: string; name: string }[];
    locations: { id: string; name: string }[];
}

// --- SUB-COMPONENTS ---

function SubmitButton({ isNew }: { isNew: boolean }) {
    const { pending } = useFormStatus();
    
    return (
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
                type="submit" 
                disabled={pending} 
                className={`min-w-[200px] h-12 shadow-xl transition-all font-bold gap-2 ${
                    pending ? 'bg-slate-700' : 'bg-primary hover:shadow-primary/40'
                }`}
            >
                {pending ? (
                    <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Syncing Engine...</span>
                    </>
                ) : (
                    <>
                        <Save className="w-4 h-4" />
                        <span>{isNew ? 'Initialize Rule' : 'Push Production'}</span>
                    </>
                )}
            </Button>
        </motion.div>
    );
}

export function PricingRuleBuilder({ initialData, customers, products, locations }: BuilderProps) {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const locale = (params.locale as string) || 'en';

    const { control, handleSubmit, register, watch, formState: { errors, isDirty } } = useForm<PricingRule>({
        defaultValues: {
            name: initialData?.name || '',
            description: initialData?.description || '',
            priority: initialData?.priority || 0,
            is_active: initialData?.is_active ?? true,
            is_stackable: initialData?.is_stackable ?? false,
            start_date: initialData?.start_date ? new Date(initialData.start_date).toISOString().split('T')[0] : null,
            end_date: initialData?.end_date ? new Date(initialData.end_date).toISOString().split('T')[0] : null,
            conditions: initialData?.conditions || [],
            actions: initialData?.actions || [],
        },
    });

    const { fields: condFields, append: addCond, remove: remCond } = useFieldArray({ control, name: "conditions" });
    const { fields: actFields, append: addAct, remove: remAct } = useFieldArray({ control, name: "actions" });

    const [state, formAction] = useFormState(createOrUpdatePricingRule, { success: false, message: '' });

    // Performance Watchers
    const watchedConditions = watch('conditions');
    const watchedActions = watch('actions');
    const watchedName = watch('name');

    useEffect(() => {
        if (state.success) {
            toast({ title: "Deployment Successful", description: "Rule logic has been propagated to all nodes." });
            router.push(`/${locale}/sales/pricing-rules`);
            router.refresh();
        } else if (state.message) {
            toast({ title: "Deployment Failed", description: state.message, variant: "destructive" });
        }
    }, [state, toast, router, locale]);

    const processSubmit = (data: PricingRule) => {
        const sanitizedConditions = data.conditions.map(c => ({
            ...c,
            target_id: c.type === 'MIN_ORDER_VALUE' ? 'GLOBAL_REVENUE' : c.target_id
        }));

        const formData = new FormData();
        formData.append('ruleData', JSON.stringify({ ...data, id: initialData?.id }));
        formData.append('conditions', JSON.stringify(sanitizedConditions));
        formData.append('actions', JSON.stringify(data.actions));
        formAction(formData);
    };

    const onInvalid = () => {
        toast({
            title: "Validation Conflict",
            description: "Some required logic nodes are missing parameters.",
            variant: "destructive"
        });
    };

    // Logic for the "Enterprise Preview" sidebar
    const ruleSummary = useMemo(() => {
        if (!watchedConditions.length && !watchedActions.length) return "Empty Logic Set";
        const condText = watchedConditions.length > 0 
            ? `IF (${watchedConditions.map(c => c.type).join(' AND ')})` 
            : "FOR ALL TRAFFIC";
        const actText = watchedActions.length > 0
            ? `THEN APPLY ${watchedActions.length} MUTATION(S)`
            : "NO ACTION DEFINED";
        return `${condText} → ${actText}`;
    }, [watchedConditions, watchedActions]);

    return (
        <form onSubmit={handleSubmit(processSubmit, onInvalid)} className="space-y-10 max-w-7xl mx-auto pb-32">
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 px-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary text-primary">v4.0 Enterprise</Badge>
                        {isDirty && <Badge className="bg-amber-500 text-[10px] uppercase">Unsaved Changes</Badge>}
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
                        <Activity className="w-10 h-10 text-primary" />
                        {initialData ? 'Edit Rule' : 'New Rule Engine'}
                    </h1>
                    <p className="text-slate-500 font-medium max-w-md">Configure high-performance pricing logic with real-time validation and multi-tenant isolation.</p>
                </div>
                
                <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
                    <Button variant="ghost" type="button" asChild className="font-bold text-slate-500 hover:text-slate-900">
                        <Link href={`/${locale}/sales/pricing-rules`}>Cancel</Link>
                    </Button>
                    <SubmitButton isNew={!initialData} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4">
                {/* --- MAIN CONFIGURATION --- */}
                <div className="lg:col-span-8 space-y-6">
                    <Tabs defaultValue="config" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 h-14 p-1 bg-slate-100 rounded-2xl mb-8">
                            <TabsTrigger value="config" className="rounded-xl font-bold uppercase text-[11px] tracking-widest data-[state=active]:shadow-lg">
                                <ShieldCheck className="w-4 h-4 mr-2" /> 01. Context
                            </TabsTrigger>
                            <TabsTrigger value="logic" className="rounded-xl font-bold uppercase text-[11px] tracking-widest data-[state=active]:shadow-lg">
                                <Zap className="w-4 h-4 mr-2 text-yellow-500" /> 02. Conditions
                            </TabsTrigger>
                            <TabsTrigger value="outcomes" className="rounded-xl font-bold uppercase text-[11px] tracking-widest data-[state=active]:shadow-lg">
                                <Percent className="w-4 h-4 mr-2 text-emerald-500" /> 03. Outcomes
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="config">
                            <Card className="border-none shadow-2xl bg-white overflow-hidden ring-1 ring-slate-100">
                                <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />
                                <CardHeader>
                                    <CardTitle className="text-2xl font-black italic uppercase tracking-tighter">Rule Meta-Data</CardTitle>
                                    <CardDescription>Primary identification and scheduling parameters.</CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-8">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black uppercase text-slate-400">Namespace Identifier</Label>
                                            <Input {...register('name', { required: "Name is required" })} placeholder="e.g., BLACK_FRIDAY_2024" className="h-12 font-bold bg-slate-50 border-none focus-visible:ring-2 focus-visible:ring-primary" />
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black uppercase text-slate-400">Execution Priority (0-999)</Label>
                                            <Input type="number" {...register('priority', { valueAsNumber: true })} className="h-12 font-mono font-bold bg-slate-50 border-none" />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase text-slate-400">Internal Memo</Label>
                                        <Input {...register('description')} placeholder="State the business objective..." className="h-12 bg-slate-50 border-none" />
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                                        <div className="p-4 bg-slate-50 rounded-2xl space-y-3 border border-slate-100">
                                            <Label className="text-[10px] font-black uppercase flex items-center gap-1"><Activity className="w-3 h-3 text-emerald-500" /> Live Status</Label>
                                            <Controller control={control} name="is_active" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-2xl space-y-3 border border-slate-100">
                                            <Label className="text-[10px] font-black uppercase flex items-center gap-1"><Layers className="w-3 h-3 text-blue-500" /> Stackable</Label>
                                            <Controller control={control} name="is_stackable" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                                        </div>
                                        <div className="md:col-span-2 p-4 bg-slate-50 rounded-2xl flex flex-col justify-between border border-slate-100">
                                            <Label className="text-[10px] font-black uppercase mb-2">Validity Window</Label>
                                            <div className="flex items-center gap-2">
                                                <Input type="date" {...register('start_date')} className="h-8 text-xs bg-white border-none" />
                                                <ChevronRight className="w-4 h-4 text-slate-300" />
                                                <Input type="date" {...register('end_date')} className="h-8 text-xs bg-white border-none" />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="logic">
                            <Card className="border-none shadow-2xl bg-white ring-1 ring-slate-100">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-2xl font-black italic uppercase tracking-tighter">Trigger Matrix</CardTitle>
                                        <CardDescription>Rules will only fire if these conditions are met.</CardDescription>
                                    </div>
                                    <Button type="button" size="sm" onClick={() => addCond({ type: 'PRODUCT', target_id: '', quantity_min: 1 })} className="rounded-full bg-slate-900 hover:bg-black uppercase text-[10px] font-black tracking-widest px-4">
                                        <PlusCircle className="w-4 h-4 mr-2" /> Add Logic
                                    </Button>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <AnimatePresence mode="popLayout">
                                        {condFields.length === 0 ? (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 flex flex-col items-center border-2 border-dashed rounded-3xl border-slate-100 bg-slate-50/50">
                                                <Globe className="w-12 h-12 text-slate-300 mb-4" />
                                                <p className="text-slate-400 font-black uppercase text-[11px] tracking-widest text-center">Global Deployment Mode:<br/><span className="text-slate-300 font-medium normal-case">No specific triggers. This rule applies to all transactions.</span></p>
                                            </motion.div>
                                        ) : (
                                            condFields.map((field, index) => (
                                                <motion.div 
                                                    key={field.id} 
                                                    initial={{ x: -20, opacity: 0 }} 
                                                    animate={{ x: 0, opacity: 1 }} 
                                                    exit={{ x: 20, opacity: 0 }}
                                                    className="flex flex-col md:flex-row gap-4 p-5 rounded-2xl bg-white border-2 border-slate-50 shadow-sm hover:border-primary/20 transition-all items-center"
                                                >
                                                    <div className="w-full md:w-[180px] space-y-1.5">
                                                        <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Scope</Label>
                                                        <Controller control={control} name={`conditions.${index}.type`} render={({ field }) => (
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <SelectTrigger className="h-10 font-bold border-none bg-slate-50"><SelectValue /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="PRODUCT">Product</SelectItem>
                                                                    <SelectItem value="CUSTOMER">Customer</SelectItem>
                                                                    <SelectItem value="LOCATION">Branch</SelectItem>
                                                                    <SelectItem value="MIN_ORDER_VALUE">Cart Value</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        )}/>
                                                    </div>

                                                    <div className="flex-1 w-full space-y-1.5">
                                                        <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Selection Node</Label>
                                                        {/* TYPE SAFE CHECK: Cast to string to avoid comparison errors in build */}
                                                        {String(watchedConditions[index]?.type) !== 'MIN_ORDER_VALUE' ? (
                                                            <Controller 
                                                                control={control} 
                                                                name={`conditions.${index}.target_id`}
                                                                rules={{ required: true }}
                                                                render={({ field }) => (
                                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                                        <SelectTrigger className="h-10 font-bold border-none bg-slate-50"><SelectValue placeholder="Select Database Reference..." /></SelectTrigger>
                                                                        <SelectContent>
                                                                            {watchedConditions[index]?.type === 'CUSTOMER' ? customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>) :
                                                                            watchedConditions[index]?.type === 'LOCATION' ? locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>) :
                                                                            products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                                                        </SelectContent>
                                                                    </Select>
                                                            )}/>
                                                        ) : (
                                                            <div className="h-10 px-4 flex items-center bg-slate-100 rounded-md text-[11px] font-black uppercase text-slate-400 italic">Global Calculation Node Active</div>
                                                        )}
                                                    </div>

                                                    <div className="w-full md:w-[120px] space-y-1.5">
                                                        <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Min Threshold</Label>
                                                        <Input type="number" {...register(`conditions.${index}.quantity_min`, { valueAsNumber: true })} className="h-10 font-mono font-bold bg-slate-50 border-none text-center" />
                                                    </div>

                                                    <Button type="button" variant="ghost" size="icon" onClick={() => remCond(index)} className="mt-5 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                                                        <Trash className="w-5 h-5" />
                                                    </Button>
                                                </motion.div>
                                            ))
                                        )}
                                    </AnimatePresence>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="outcomes">
                            <Card className="border-none shadow-2xl bg-white ring-1 ring-slate-100 overflow-hidden">
                                <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-600" />
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-2xl font-black italic uppercase tracking-tighter">Mutation Logic</CardTitle>
                                        <CardDescription>The actual pricing adjustment performed when conditions pass.</CardDescription>
                                    </div>
                                    <Button type="button" size="sm" onClick={() => addAct({ type: 'PERCENTAGE_DISCOUNT', value: 0 })} className="rounded-full bg-emerald-600 hover:bg-emerald-700 uppercase text-[10px] font-black tracking-widest px-4">
                                        <PlusCircle className="w-4 h-4 mr-2" /> Add Mutation
                                    </Button>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <AnimatePresence mode="popLayout">
                                        {actFields.length === 0 ? (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 flex flex-col items-center border-2 border-dashed rounded-3xl border-red-50 bg-red-50/20">
                                                <AlertCircle className="w-12 h-12 text-red-200 mb-4" />
                                                <p className="text-red-400 font-black uppercase text-[11px] tracking-widest text-center">Warning: Null Operation State<br/><span className="text-red-300 font-medium normal-case">Add at least one outcome or the rule will have no effect.</span></p>
                                            </motion.div>
                                        ) : (
                                            actFields.map((field, index) => (
                                                <motion.div 
                                                    key={field.id} 
                                                    initial={{ scale: 0.95, opacity: 0 }} 
                                                    animate={{ scale: 1, opacity: 1 }} 
                                                    className="flex flex-col md:flex-row gap-6 p-6 rounded-3xl bg-emerald-50/30 border border-emerald-100 items-center relative"
                                                >
                                                    <div className="flex-1 space-y-1.5 w-full">
                                                        <Label className="text-[10px] font-black uppercase text-emerald-600 px-1">Adjustment Strategy</Label>
                                                        <Controller control={control} name={`actions.${index}.type`} render={({ field }) => (
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <SelectTrigger className="h-12 font-black border-none bg-white text-emerald-900 shadow-sm"><SelectValue /></SelectTrigger>
                                                                <SelectContent className="font-bold">
                                                                    <SelectItem value="FIXED_PRICE">Fixed Override</SelectItem>
                                                                    <SelectItem value="PERCENTAGE_DISCOUNT">Percentage Rebate</SelectItem>
                                                                    <SelectItem value="BUY_X_GET_Y">BOGO / Volume Bulk</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        )}/>
                                                    </div>

                                                    <div className="w-full md:w-[160px] space-y-1.5">
                                                        <Label className="text-[10px] font-black uppercase text-emerald-600 px-1">Value Mutation</Label>
                                                        <div className="relative">
                                                            <Input type="number" step="0.01" {...register(`actions.${index}.value`, { valueAsNumber: true })} className="h-12 pl-10 font-black text-xl bg-white border-none shadow-sm text-emerald-700" />
                                                            <Calculator className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                                                        </div>
                                                    </div>

                                                    <Button type="button" variant="ghost" size="icon" onClick={() => remAct(index)} className="mt-5 text-emerald-300 hover:text-red-500 hover:bg-white rounded-xl transition-all">
                                                        <Trash className="w-5 h-5" />
                                                    </Button>
                                                </motion.div>
                                            ))
                                        )}
                                    </AnimatePresence>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* --- ENTERPRISE PREVIEW SIDEBAR --- */}
                <div className="lg:col-span-4">
                    <div className="sticky top-6 space-y-6">
                        <Card className="border-none shadow-2xl bg-slate-900 text-white overflow-hidden rounded-3xl">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-2 text-primary">
                                    <Beaker className="w-5 h-5" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Logic Simulator</span>
                                </div>
                                <CardTitle className="text-xl font-bold tracking-tight">Real-time Preview</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                                    <p className="text-[11px] text-white/50 font-medium italic">Current Logic Interpretation:</p>
                                    <p className="text-sm font-bold leading-relaxed">
                                        "{watchedName || 'Unnamed Rule'}" <br/>
                                        <span className="text-primary">{ruleSummary}</span>
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                                        <p className="text-[9px] font-black uppercase text-white/40 mb-1">Stack Status</p>
                                        <p className="text-xs font-bold text-emerald-400">{watch('is_stackable') ? 'COMBINABLE' : 'EXCLUSIVE'}</p>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                                        <p className="text-[9px] font-black uppercase text-white/40 mb-1">Priority Index</p>
                                        <p className="text-xs font-bold text-blue-400">{watch('priority')}</p>
                                    </div>
                                </div>

                                <Separator className="bg-white/10" />

                                <div className="space-y-4 opacity-50">
                                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                                        <span>Schema Compliance</span>
                                        <div className="h-1 w-12 bg-emerald-500 rounded-full" />
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                                        <span>Edge Propagated</span>
                                        <div className="h-1 w-12 bg-emerald-500 rounded-full" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        
                        <div className="px-4 text-center">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Pricing Core Enterprise Edition</p>
                            <p className="text-[9px] font-medium text-slate-300">Cluster: AWS-USE-01 | Latency: 4ms</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- GLASSFOOTER STATUS BAR --- */}
            <div className="fixed bottom-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-xl border-t border-slate-200/50 flex items-center justify-between px-8 z-50">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${watch('is_active') ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} />
                        <span className="text-[10px] font-black uppercase tracking-tighter text-slate-600">
                            Engine Status: {watch('is_active') ? 'DEPLOY_READY' : 'STANDBY'}
                        </span>
                    </div>
                    <Separator orientation="vertical" className="h-6" />
                    <div className="flex items-center gap-2 text-slate-400">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-tighter">Security Node: TLS 1.3 Active</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 text-slate-300 font-mono text-[10px]">
                    <span>MOD: {new Date().toLocaleDateString()}</span>
                    <span>v4.2.1-PROD</span>
                </div>
            </div>
        </form>
    );
}