'use client';

import React, { useEffect, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useRouter, useParams } from 'next/navigation'; // Added useParams for locale safety
import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';

// --- UI Components ---
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

// --- Icons ---
import { 
    Trash, PlusCircle, Zap, ArrowLeft, AlertCircle, 
    ShieldCheck, Layers, Calendar, Globe, 
    UserCheck, Package, Percent, Calculator, Info
} from 'lucide-react';

// --- Server Action ---
import { createOrUpdatePricingRule } from '@/app/actions/pricing';

// --- Interfaces (Enterprise Typed) ---
export interface PricingRuleCondition {
    id?: string;
    type: 'CUSTOMER' | 'PRODUCT' | 'LOCATION' | 'CURRENCY' | 'MIN_ORDER_VALUE' | 'LOYALTY_TIER';
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
    initialData?: PricingRule | null; // Removed 'any'
    customers: { id: string; name: string }[];
    products: { id: string; name: string }[];
    locations: { id: string; name: string }[];
}

function SubmitButton({ isNew }: { isNew: boolean }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="min-w-[180px] shadow-xl shadow-primary/25 bg-primary hover:bg-primary/90 transition-all">
            {pending ? (
                <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Deploying Logic...
                </div>
            ) : (
                <>
                    <Zap className="mr-2 h-4 w-4 fill-current text-yellow-400" />
                    {isNew ? 'Deploy To Engine' : 'Push Updates'}
                </>
            )}
        </Button>
    );
}

export function PricingRuleBuilder({ initialData, customers, products, locations }: BuilderProps) {
    const router = useRouter();
    const params = useParams(); // Get locale for safe routing
    const { toast } = useToast();
    const locale = params.locale as string;

    const { control, handleSubmit, register, watch, trigger, formState: { errors } } = useForm<PricingRule>({
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

    useEffect(() => {
        if (state.success) {
            toast({ title: "Rule Optimized", description: state.message });
            router.push(`/${locale}/sales/pricing-rules`); // FIXED: Locale-safe routing
            router.refresh();
        } else if (state.message) {
            toast({ title: "Deployment Error", description: state.message, variant: "destructive" });
        }
    }, [state, toast, router, locale]);

    const processSubmit = (data: PricingRule) => {
        const formData = new FormData();
        formData.append('ruleData', JSON.stringify({ ...data, id: initialData?.id }));
        formData.append('conditions', JSON.stringify(data.conditions));
        formData.append('actions', JSON.stringify(data.actions));
        formAction(formData);
    };

    const watchedConditions = watch('conditions');

    return (
        <form onSubmit={handleSubmit(processSubmit)} className="space-y-10 max-w-7xl mx-auto pb-24">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 px-1">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Layers className="w-6 h-6" />
                        </div>
                        <h2 className="text-4xl font-black tracking-tight text-slate-900 italic uppercase">
                            {initialData ? 'Rule Optimization' : 'Rule Engineering'}
                        </h2>
                    </div>
                    <p className="text-slate-500 font-medium">Fully autonomous pricing logic with multi-tenant inventory synchronization.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" asChild className="border-slate-300">
                        <Link href={`/${locale}/sales/pricing-rules`}><ArrowLeft className="mr-2 h-4 w-4" /> Discard Changes</Link>
                    </Button>
                    <SubmitButton isNew={!initialData} />
                </div>
            </div>

            <Tabs defaultValue="config" className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-14 p-1 bg-slate-100 rounded-xl mb-6">
                    <TabsTrigger value="config" className="rounded-lg font-bold uppercase text-xs tracking-widest"><ShieldCheck className="w-4 h-4 mr-2" /> Parameters</TabsTrigger>
                    <TabsTrigger value="logic" className="rounded-lg font-bold uppercase text-xs tracking-widest"><Zap className="w-4 h-4 mr-2 text-yellow-500" /> Trigger Logic</TabsTrigger>
                    <TabsTrigger value="outcomes" className="rounded-lg font-bold uppercase text-xs tracking-widest"><Percent className="w-4 h-4 mr-2 text-emerald-500" /> Revenue Action</TabsTrigger>
                </TabsList>

                <TabsContent value="config">
                    <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white ring-1 ring-slate-100">
                        <CardHeader>
                            <CardTitle className="text-xl font-black flex items-center gap-2"><Info className="w-5 h-5 text-primary" /> Rule Metadata</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                            <div className="md:col-span-2 space-y-3">
                                <Label htmlFor="name" className="text-xs font-black uppercase tracking-tighter text-slate-500">Master Rule Name</Label>
                                <Input id="name" {...register('name', { required: "Master identifier required" })} className="h-12 text-lg font-bold border-slate-200 focus:ring-primary" />
                                {errors.name && <p className="text-xs font-bold text-red-500 italic uppercase">Alert: {errors.name.message}</p>}
                            </div>

                            <div className="space-y-3">
                                <Label className="text-xs font-black uppercase tracking-tighter text-slate-500">Execution Priority</Label>
                                <Input type="number" {...register('priority')} className="h-12 font-mono text-lg border-slate-200" />
                            </div>

                            <div className="flex flex-col gap-4 justify-end pb-1">
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <Label className="text-xs font-black uppercase">Live Engine</Label>
                                    <Controller control={control} name="is_active" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                                </div>
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <Label className="text-xs font-black uppercase flex items-center gap-1">Stackable <TooltipProvider><Tooltip><TooltipTrigger><Info className="w-3 h-3" /></TooltipTrigger><TooltipContent>Can multiple rules apply to one checkout?</TooltipContent></Tooltip></TooltipProvider></Label>
                                    <Controller control={control} name="is_stackable" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                                </div>
                            </div>

                            <div className="md:col-span-4 space-y-3">
                                <Label className="text-xs font-black uppercase tracking-tighter text-slate-500">Audit Description</Label>
                                <Input {...register('description')} placeholder="Detail the business logic purpose..." className="h-12 border-slate-200" />
                            </div>

                            <div className="space-y-3">
                                <Label className="text-xs font-black uppercase text-slate-500"><Calendar className="w-3 h-3 inline mr-1" /> Valid From</Label>
                                <Input type="date" {...register('start_date')} className="h-11 border-slate-200" />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-xs font-black uppercase text-slate-500"><Calendar className="w-3 h-3 inline mr-1" /> Expiration</Label>
                                <Input type="date" {...register('end_date')} className="h-11 border-slate-200" />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="logic">
                    <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white ring-1 ring-slate-100">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-xl font-black">Dynamic Triggers (IF)</CardTitle>
                            <Button type="button" onClick={() => addCond({ type: 'PRODUCT', target_id: '', quantity_min: 1 })} className="bg-slate-900 text-white hover:bg-black font-black uppercase text-xs tracking-widest"><PlusCircle className="w-4 h-4 mr-2" /> Add Logic Block</Button>
                        </CardHeader>
                        <CardContent className="space-y-6 min-h-[300px]">
                            {condFields.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-20 border-4 border-dotted rounded-2xl bg-slate-50 opacity-40">
                                    <Globe className="w-16 h-16 mb-4" />
                                    <p className="font-black uppercase tracking-tighter text-slate-500 text-center">Global Logic: Rule applies to all system nodes</p>
                                </div>
                            ) : (
                                condFields.map((field, index) => (
                                    <div key={field.id} className="group flex flex-col md:flex-row gap-4 p-6 border-2 border-slate-100 rounded-2xl items-center bg-slate-50/50 hover:bg-white hover:border-primary/30 hover:shadow-xl transition-all relative">
                                        <div className="absolute -left-3 -top-3 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black shadow-lg">0{index + 1}</div>
                                        
                                        <div className="w-full md:w-1/4 space-y-2">
                                            <Label className="text-[10px] font-black uppercase opacity-60">Scope</Label>
                                            <Controller control={control} name={`conditions.${index}.type`} render={({ field }) => (
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <SelectTrigger className="h-11 font-bold border-slate-300"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="PRODUCT">Product Group</SelectItem>
                                                        <SelectItem value="CUSTOMER">Customer Segment</SelectItem>
                                                        <SelectItem value="LOCATION">Branch/Location</SelectItem>
                                                        <SelectItem value="MIN_ORDER_VALUE">Min Spend Threshold</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}/>
                                        </div>

                                        {/* FIXED: Conditional UI Rendering - Only show target list if scope requires it */}
                                        {watchedConditions[index]?.type !== 'MIN_ORDER_VALUE' && (
                                            <div className="w-full md:flex-1 space-y-2">
                                                <Label className="text-[10px] font-black uppercase opacity-60 italic">Context Target</Label>
                                                <Controller control={control} name={`conditions.${index}.target_id`} render={({ field }) => (
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <SelectTrigger className="h-11 font-bold border-slate-300"><SelectValue placeholder="System Lookup..." /></SelectTrigger>
                                                        <SelectContent>
                                                            {watchedConditions[index]?.type === 'CUSTOMER' ? customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>) :
                                                            watchedConditions[index]?.type === 'LOCATION' ? locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>) :
                                                            products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                )}/>
                                            </div>
                                        )}

                                        <div className="w-full md:w-32 space-y-2">
                                            <Label className="text-[10px] font-black uppercase opacity-60">Value Min</Label>
                                            <Input type="number" {...register(`conditions.${index}.quantity_min`)} className="h-11 font-mono text-center border-slate-300" />
                                        </div>

                                        <Button type="button" variant="ghost" size="icon" onClick={() => remCond(index)} className="mt-6 text-slate-300 hover:text-red-500 hover:bg-red-50"><Trash className="w-5 h-5" /></Button>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="outcomes">
                    <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white ring-1 ring-slate-100 border-l-8 border-l-emerald-500">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-xl font-black text-emerald-900">Revenue Action (THEN)</CardTitle>
                            <Button type="button" onClick={() => addAct({ type: 'PERCENTAGE_DISCOUNT', value: 0 })} className="bg-emerald-600 text-white hover:bg-emerald-700 font-black uppercase text-xs tracking-widest"><PlusCircle className="w-4 h-4 mr-2" /> Add Logic Action</Button>
                        </CardHeader>
                        <CardContent className="space-y-6 min-h-[300px]">
                            {actFields.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-20 border-4 border-dotted rounded-2xl bg-red-50 border-red-100">
                                    <AlertCircle className="w-16 h-16 mb-4 text-red-300" />
                                    <p className="font-black uppercase tracking-tighter text-red-400">Alert: Zero-Outcome Logic</p>
                                </div>
                            ) : (
                                actFields.map((field, index) => (
                                    <div key={field.id} className="group flex flex-col md:flex-row gap-6 p-8 border-2 border-emerald-50 rounded-3xl items-center bg-emerald-50/10 hover:bg-white transition-all relative">
                                        <div className="absolute -left-3 -top-3 w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-sm font-black shadow-lg transform -rotate-12">RESULT</div>
                                        
                                        <div className="w-full md:flex-1 space-y-2">
                                            <Label className="text-[11px] font-black uppercase text-emerald-600 tracking-wider">Adjustment Vector</Label>
                                            <Controller control={control} name={`actions.${index}.type`} render={({ field }) => (
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <SelectTrigger className="h-12 font-black border-emerald-100 text-emerald-900 bg-white"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="FIXED_PRICE"><Calculator className="w-3 h-3 inline mr-2 text-emerald-500" /> Override Price</SelectItem>
                                                        <SelectItem value="PERCENTAGE_DISCOUNT"><Percent className="w-3 h-3 inline mr-2 text-emerald-500" /> Percentage Rebate</SelectItem>
                                                        <SelectItem value="BUY_X_GET_Y">Bulk Promotion (X+Y)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}/>
                                        </div>

                                        <div className="w-full md:w-48 space-y-2">
                                            <Label className="text-[11px] font-black uppercase text-emerald-600 tracking-wider text-center block">Calculated Value</Label>
                                            <Input type="number" step="0.01" {...register(`actions.${index}.value`)} className="h-14 font-black text-2xl text-center border-emerald-100 text-emerald-700 bg-white rounded-xl shadow-inner focus:ring-emerald-500" />
                                        </div>

                                        <Button type="button" variant="ghost" size="icon" onClick={() => remAct(index)} className="mt-6 text-slate-300 hover:text-red-500 hover:bg-red-50"><Trash className="w-5 h-5" /></Button>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            
            <div className="fixed bottom-0 left-0 right-0 p-3 bg-slate-900 text-white border-t border-slate-800 flex justify-between items-center z-50">
                <div className="flex items-center gap-6 px-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Pricing Engine Connected</span>
                    </div>
                    <Separator orientation="vertical" className="h-4 bg-slate-700" />
                    <span className="text-[10px] font-mono opacity-50 uppercase">Tenant Security Active</span>
                </div>
                <div className="flex items-center gap-2 px-4 opacity-30 italic text-[10px] uppercase font-black">
                    Logic Matrix v4.2.1
                </div>
            </div>
        </form>
    );
}