'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useFormState } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Save, ShieldCheck, Layers, Calculator,
  ArrowRight, Trash2, Plus, Activity, Cpu, Target,
  Settings2, BarChart3, ArrowUpRight, Scale,
  History, Globe, Landmark, FileCode, BadgeCheck,
  ShieldAlert, Database, BoxSelect, RefreshCw, Search, ChevronRight, Info
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

// --- ENTERPRISE BUSINESS INTERFACES (RESTORED) ---
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
  locale: string;
}

/**
 * HIGH-SECURITY FINANCIAL CALCULATION ENGINE (RESTORED)
 * Uses a strict white-list character parser to prevent Code Injection.
 */
const evaluateEnterpriseFormula = (formula: string, base: number, qty: number): number => {
  try {
    if (!formula) return base;
    const sanitized = formula
      .replace(/BASE/g, base.toString())
      .replace(/QTY/g, qty.toString())
      .replace(/[^-?\d+/*().\s]/g, ''); // High-security filter
    
    // Execute only sanitized arithmetic strings
    const compute = new Function(`return (${sanitized})`);
    return Number(compute()) || 0;
  } catch (e) {
    console.error("Financial Engine Error: Illegal formula syntax detected.");
    return base;
  }
};

export function PricingRuleBuilder({
  initialData,
  customers,
  products,
  locations,
  currencies,
  tenantId,
  locale
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

  // --- ERP INTEGRITY MONITOR (RESTORED) ---
  const systemReadiness = useMemo(() => {
    const steps = [];
    if (watchedData.name?.length >= 3) steps.push('config');
    if (watchedData.conditions?.every(c => !!c.target_id)) steps.push('logic');
    
    const actionsValid = watchedData.actions?.every(a => {
        if (a.type === 'FORMULA') return !!a.formula_string && a.formula_string.includes('BASE');
        if (a.type === 'VOLUME_TIER') return (a.tiers?.length ?? 0) > 0;
        return !isNaN(Number(a.value)) && a.value !== null;
    });
    if (actionsValid) steps.push('outcomes');
    
    return steps;
  }, [watchedData]);

  const isAuthorizedForCommit = systemReadiness.length >= 3;

  // --- REAL-TIME YIELD IMPACT ANALYTICS (RESTORED) ---
  const yieldAnalytics = useMemo(() => {
    const productMapping = watchedData.conditions?.find(c => c.type === 'PRODUCT');
    const resolvedProduct = products.find(p => p.id.toString() === productMapping?.target_id);
    
    const baseUnitCost = resolvedProduct?.price || 0;
    let adjustedPrice = baseUnitCost;
    let cumulativeSavings = 0;

    watchedData.actions?.forEach(action => {
        if (action.type === 'PERCENTAGE_DISCOUNT') {
            const impact = (baseUnitCost * (Number(action.value) || 0)) / 100;
            cumulativeSavings += impact;
            adjustedPrice -= impact;
        } else if (action.type === 'FIXED_PRICE') {
            const val = Number(action.value) || 0;
            cumulativeSavings = baseUnitCost - val;
            adjustedPrice = val;
        } else if (action.type === 'VOLUME_TIER') {
            const activeTier = action.tiers?.find(t => 
                simulatedQty >= t.min_qty && (!t.max_qty || simulatedQty <= t.max_qty)
            );
            if (activeTier) {
                const impact = (baseUnitCost * (activeTier.value || 0)) / 100;
                cumulativeSavings += impact;
                adjustedPrice -= impact;
            }
        } else if (action.type === 'FORMULA' && action.formula_string) {
            const calc = evaluateEnterpriseFormula(action.formula_string, baseUnitCost, simulatedQty);
            adjustedPrice = calc;
            cumulativeSavings = baseUnitCost - calc;
        }
    });

    return {
        basePrice: Number(baseUnitCost.toFixed(4)),
        finalPrice: Number(Math.max(0, adjustedPrice).toFixed(4)),
        deltaSavings: Number(Math.max(0, cumulativeSavings).toFixed(4)),
        efficiencyScore: baseUnitCost > 0 ? (cumulativeSavings / baseUnitCost) * 100 : 0,
        targetDescriptor: resolvedProduct?.name || 'DIMENSIONAL_REFERENCE_PENDING'
    };
  }, [watchedData, products, simulatedQty]);

  const onExecuteCommit = async (data: PricingRuleFormValues) => {
    const isValid = await trigger();
    if (!isValid) return;

    const formData = new FormData();
    formData.append('ruleData', JSON.stringify({ ...data, id: initialData?.id }));
    formData.append('locale', locale);
    
    toast({ title: "ERP Master Synchronizing", description: "Committing logical parameters to Master Pricing Database." });
    formAction(formData);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] antialiased">
      <form onSubmit={handleSubmit(onExecuteCommit)} className="w-full max-w-[1440px] mx-auto space-y-8 px-4 py-8 md:px-10 md:py-12">
          
          {/* --- CLEAN PROFESSIONAL HEADER (MATCHING REF 3) --- */}
          <header className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <ChevronRight className="w-3 h-3 rotate-180" /> Back to Pricing Logic Inventory
            </div>
            
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-slate-200">
                    <Database className="text-slate-900 w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                        Pricing Logic Controller
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <BadgeCheck className="w-4 h-4 text-blue-500" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Master Tenant ID: {tenantId}</p>
                    </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                  <div className="hidden md:flex flex-col justify-center px-6 py-2 bg-white rounded-lg border border-slate-200 min-w-[180px]">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                          <Activity className="w-3 h-3" /> System Integrity
                      </span>
                      <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", isAuthorizedForCommit ? "bg-emerald-500" : "bg-amber-500")} />
                          <span className="text-xs font-bold text-slate-700">{systemReadiness.length}/3 Modules Validated</span>
                      </div>
                  </div>
                  
                  <Button 
                      type="submit" 
                      disabled={!isAuthorizedForCommit || isSubmitting}
                      className={cn(
                          "h-12 px-10 font-bold text-xs uppercase tracking-widest transition-all rounded-lg shadow-sm border",
                          isAuthorizedForCommit 
                          ? "bg-[#0F172A] hover:bg-slate-800 text-white border-[#0F172A]" 
                          : "bg-white text-slate-300 border-slate-200 cursor-not-allowed"
                      )}
                  >
                      {isAuthorizedForCommit ? <Save className="w-4 h-4 mr-3" /> : <ShieldAlert className="w-4 h-4 mr-3" />}
                      Execute Deployment
                  </Button>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
              
              {/* --- MAIN WORKSPACE --- */}
              <div className="xl:col-span-8 space-y-6">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="flex w-full bg-transparent border-b border-slate-200 rounded-none h-14 p-0 gap-8 mb-8 overflow-x-auto">
                          {[
                              { id: 'config', label: '1. Strategy Setup', icon: Settings2 },
                              { id: 'logic', label: '2. Targeting Criteria', icon: Layers },
                              { id: 'outcomes', label: '3. Logic Engine', icon: Calculator },
                          ].map(tab => (
                              <TabsTrigger 
                                  key={tab.id} 
                                  value={tab.id} 
                                  className="rounded-none border-b-2 border-transparent bg-transparent px-1 pb-4 pt-2 font-bold text-[11px] uppercase tracking-wider transition-all data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 data-[state=active]:shadow-none text-slate-400 shrink-0"
                              >
                                  <tab.icon className="w-4 h-4 mr-2" />
                                  {tab.label}
                                  {systemReadiness.includes(tab.id) && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-2" />}
                              </TabsTrigger>
                          ))}
                      </TabsList>

                      <AnimatePresence mode="wait">
                          <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                              
                              {/* SECTION 1: SYSTEM PARAMETERS */}
                              <TabsContent value="config" className="m-0">
                                  <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                                      <CardHeader className="p-8 border-b border-slate-50 bg-[#F9FAFB]">
                                          <div className="flex items-center gap-3">
                                              <ShieldCheck className="w-5 h-5 text-slate-700" />
                                              <CardTitle className="text-base font-bold text-slate-800 uppercase tracking-tight">Logic Context</CardTitle>
                                          </div>
                                          <CardDescription className="text-slate-500 font-semibold text-[10px] uppercase tracking-widest">Master record metadata and precedence parameters.</CardDescription>
                                      </CardHeader>
                                      <CardContent className="p-8 space-y-8">
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                              <div className="space-y-2">
                                                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Strategy Identifier</Label>
                                                  <Input {...register('name', { required: true })} placeholder="STRATEGY_REF_001" className="h-11 border-slate-200 rounded-lg font-semibold bg-white focus:ring-1 focus:ring-slate-900" />
                                              </div>
                                              <div className="space-y-2">
                                                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Precedence Rank</Label>
                                                  <Input type="number" {...register('priority', { valueAsNumber: true })} className="h-11 border-slate-200 rounded-lg font-semibold bg-white focus:ring-1 focus:ring-slate-900" />
                                              </div>
                                          </div>

                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                              <div className="flex items-center justify-between p-6 bg-[#F9FAFB] rounded-xl border border-slate-200">
                                                  <div className="space-y-1">
                                                      <p className="font-bold text-slate-900 text-xs uppercase">Exclusive Protocol</p>
                                                      <p className="text-[9px] text-slate-400 font-semibold uppercase">Restricts parallel condition application.</p>
                                                  </div>
                                                  <Controller control={control} name="is_exclusive" render={({ field }) => (
                                                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                  )} />
                                              </div>
                                              <div className="flex items-center justify-between p-6 bg-[#F9FAFB] rounded-xl border border-slate-200">
                                                  <div className="space-y-1">
                                                      <p className="font-bold text-slate-900 text-xs uppercase">Tax Strategy</p>
                                                      <p className="text-[9px] text-slate-400 font-semibold uppercase">Financial calculation context.</p>
                                                  </div>
                                                  <Controller control={control} name="tax_strategy" render={({ field }) => (
                                                      <Select onValueChange={field.onChange} value={field.value}>
                                                          <SelectTrigger className="h-10 w-[110px] bg-white border-slate-200 rounded-lg font-bold text-[10px] uppercase">
                                                              <SelectValue />
                                                          </SelectTrigger>
                                                          <SelectContent>
                                                              <SelectItem value="GROSS">Gross</SelectItem>
                                                              <SelectItem value="NET">Net</SelectItem>
                                                          </SelectContent>
                                                      </Select>
                                                  )} />
                                              </div>
                                          </div>
                                      </CardContent>
                                  </Card>
                              </TabsContent>

                              {/* SECTION 2: DIMENSION MAPPING */}
                              <TabsContent value="logic" className="m-0">
                                  <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                                      <CardHeader className="p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-50 bg-[#F9FAFB]">
                                          <div>
                                              <CardTitle className="text-base font-bold text-slate-800 uppercase tracking-tight">Targeting Criteria</CardTitle>
                                              <CardDescription className="text-slate-500 font-semibold text-[10px] uppercase tracking-widest">Assign rule logic to products, client segments, or warehouses.</CardDescription>
                                          </div>
                                          <Button type="button" variant="outline" onClick={() => addCond({ type: 'PRODUCT', target_id: '', location_id: 'GLOBAL' })} className="rounded-lg border-slate-200 font-bold text-[10px] uppercase h-10 px-6 bg-white hover:bg-slate-50 shadow-sm">
                                              <Plus className="w-4 h-4 mr-2" /> Add Rule Node
                                          </Button>
                                      </CardHeader>
                                      <CardContent className="p-8 space-y-4">
                                          {condFields.map((field, index) => (
                                              <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative group animate-in slide-in-from-top-1">
                                                  <div className="md:col-span-3 space-y-2">
                                                      <Label className="text-[10px] font-bold text-slate-400 uppercase">Dimension</Label>
                                                      <Controller control={control} name={`conditions.${index}.type`} render={({ field }) => (
                                                          <Select onValueChange={(val) => { field.onChange(val); setValue(`conditions.${index}.target_id`, ''); }} value={field.value}>
                                                              <SelectTrigger className="h-10 border-slate-200 bg-slate-50/50 rounded-lg font-bold text-[10px] uppercase focus:ring-1 focus:ring-slate-900"><SelectValue /></SelectTrigger>
                                                              <SelectContent>
                                                                  <SelectItem value="PRODUCT">SKU Code</SelectItem>
                                                                  <SelectItem value="CUSTOMER">Client Segment</SelectItem>
                                                                  <SelectItem value="LOCATION">Retail Hub</SelectItem>
                                                              </SelectContent>
                                                          </Select>
                                                      )}/>
                                                  </div>
                                                  <div className="md:col-span-5 space-y-2">
                                                      <Label className="text-[10px] font-bold text-slate-400 uppercase">System ID</Label>
                                                      <Controller control={control} name={`conditions.${index}.target_id`} render={({ field: tField }) => (
                                                          <Select onValueChange={tField.onChange} value={tField.value}>
                                                              <SelectTrigger className="h-10 border-slate-200 bg-white rounded-lg font-bold text-[10px] uppercase focus:ring-1 focus:ring-slate-900"><SelectValue placeholder="Select Entity..." /></SelectTrigger>
                                                              <SelectContent className="max-h-[300px]">
                                                                  {watch(`conditions.${index}.type`) === 'PRODUCT' 
                                                                      ? products.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)
                                                                      : customers.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)
                                                                  }
                                                              </SelectContent>
                                                          </Select>
                                                      )}/>
                                                  </div>
                                                  <div className="md:col-span-3 space-y-2">
                                                      <Label className="text-[10px] font-bold text-slate-400 uppercase">Scope</Label>
                                                      <Controller control={control} name={`conditions.${index}.location_id`} render={({ field }) => (
                                                          <Select onValueChange={field.onChange} value={field.value}>
                                                              <SelectTrigger className="h-10 border-slate-200 bg-white rounded-lg font-bold text-[10px] uppercase focus:ring-1 focus:ring-slate-900"><SelectValue placeholder="Global" /></SelectTrigger>
                                                              <SelectContent>
                                                                  <SelectItem value="GLOBAL">Master Cluster</SelectItem>
                                                                  {locations.map(l => <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>)}
                                                              </SelectContent>
                                                          </Select>
                                                      )}/>
                                                  </div>
                                                  <div className="md:col-span-1 flex justify-center pb-1">
                                                      <Button variant="ghost" size="icon" onClick={() => remCond(index)} className="h-10 w-10 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></Button>
                                                  </div>
                                              </div>
                                          ))}
                                      </CardContent>
                                  </Card>
                              </TabsContent>

                              {/* SECTION 3: CALCULATION ADJUSTMENTS */}
                              <TabsContent value="outcomes" className="m-0">
                                  <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                                      <CardHeader className="p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-50 bg-[#F9FAFB]">
                                          <div>
                                              <CardTitle className="text-base font-bold text-slate-800 uppercase tracking-tight">Price Adjustments</CardTitle>
                                              <CardDescription className="text-slate-500 font-semibold text-[10px] uppercase tracking-widest">Master calculation logic: Algorithms, Fixed Points, or Scaling.</CardDescription>
                                          </div>
                                          <Button type="button" variant="outline" onClick={() => addAct({ type: 'PERCENTAGE_DISCOUNT', value: 0, currency_code: currencies[0] || 'USD', tiers: [] })} className="rounded-lg border-slate-200 font-bold text-[10px] uppercase h-10 px-6 bg-white hover:bg-slate-50 shadow-sm"><Plus className="w-4 h-4 mr-2" /> Add Operation</Button>
                                      </CardHeader>
                                      <CardContent className="p-8 space-y-6">
                                          {actFields.map((field, index) => {
                                              const actionType = watch(`actions.${index}.type`);
                                              return (
                                                  <div key={field.id} className="bg-slate-50/50 p-6 rounded-xl border border-slate-200 space-y-6 shadow-sm">
                                                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                                                          <div className="md:col-span-4 space-y-2">
                                                              <Label className="text-[10px] font-bold text-slate-400 uppercase">Processor</Label>
                                                              <Controller control={control} name={`actions.${index}.type`} render={({ field }) => (
                                                                  <Select onValueChange={field.onChange} value={field.value}>
                                                                      <SelectTrigger className="h-10 border-slate-200 bg-white rounded-lg font-bold text-[10px] uppercase focus:ring-1 focus:ring-slate-900"><SelectValue /></SelectTrigger>
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
                                                                      <Input {...register(`actions.${index}.formula_string`)} placeholder="e.g. (BASE * 0.95)" className="h-10 border-slate-200 bg-white rounded-lg font-mono font-bold text-xs px-4 pr-10 focus:ring-1 focus:ring-slate-900" />
                                                                      <Calculator className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                                                                  </div>
                                                              ) : actionType === 'VOLUME_TIER' ? (
                                                                  <div className="h-10 flex items-center px-4 bg-white rounded-lg border border-slate-100 shadow-inner"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scaling Matrix Active</p></div>
                                                              ) : (
                                                                  <Input type="number" step="0.0001" {...register(`actions.${index}.value`, { valueAsNumber: true })} className="h-10 border-slate-200 bg-white rounded-lg font-bold text-xs px-4 focus:ring-1 focus:ring-slate-900" />
                                                              )}
                                                          </div>
                                                          <div className="md:col-span-1 flex justify-center pb-1">
                                                              <Button variant="ghost" size="icon" onClick={() => remAct(index)} className="h-10 w-10 text-slate-300 hover:text-red-500 hover:bg-white rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></Button>
                                                          </div>
                                                      </div>

                                                      {actionType === 'VOLUME_TIER' && (
                                                          <div className="pt-6 border-t border-slate-200/60 space-y-4">
                                                              <div className="flex items-center justify-between">
                                                                  <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Tier Threshold Matrix</h4>
                                                                  <Button type="button" variant="outline" size="sm" onClick={() => {
                                                                      const cur = watch(`actions.${index}.tiers`) || [];
                                                                      setValue(`actions.${index}.tiers`, [...cur, { min_qty: 1, max_qty: null, value: 0 }]);
                                                                  }} className="rounded-md font-bold text-[9px] uppercase px-4 h-8 bg-white border-slate-200 shadow-sm">Add Threshold</Button>
                                                              </div>
                                                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                  {(watch(`actions.${index}.tiers`) || []).map((_, tIdx) => (
                                                                      <div key={tIdx} className="bg-white p-5 rounded-xl border border-slate-200 relative group shadow-sm animate-in zoom-in-95">
                                                                          <div className="grid grid-cols-2 gap-3 mb-3">
                                                                              <div className="space-y-1">
                                                                                  <Label className="text-[8px] font-bold text-slate-400 uppercase">Min Qty</Label>
                                                                                  <Input type="number" {...register(`actions.${index}.tiers.${tIdx}.min_qty`, { valueAsNumber: true })} className="h-8 rounded-md text-[10px] font-bold border-slate-100 bg-slate-50/50" />
                                                                              </div>
                                                                              <div className="space-y-1">
                                                                                  <Label className="text-[8px] font-bold text-slate-400 uppercase">Max Qty</Label>
                                                                                  <Input type="number" {...register(`actions.${index}.tiers.${tIdx}.max_qty`, { valueAsNumber: true })} placeholder="INF" className="h-8 rounded-md text-[10px] font-bold border-slate-100 bg-slate-50/50" />
                                                                              </div>
                                                                          </div>
                                                                          <div className="space-y-1">
                                                                              <Label className="text-[8px] font-bold text-slate-400 uppercase">Discount (%)</Label>
                                                                              <Input type="number" {...register(`actions.${index}.tiers.${tIdx}.value`, { valueAsNumber: true })} className="h-8 rounded-md text-[10px] font-bold bg-white focus:border-slate-900" />
                                                                          </div>
                                                                          <button type="button" onClick={() => {
                                                                              const cur = watch(`actions.${index}.tiers`) || [];
                                                                              setValue(`actions.${index}.tiers`, cur.filter((__, i) => i !== tIdx));
                                                                          }} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white border border-slate-200 text-red-500 shadow-sm flex items-center justify-center transition-colors hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
                                                                      </div>
                                                                  ))}
                                                              </div>
                                                          </div>
                                                      )}
                                                  </div>
                                              );
                                          })}
                                      </CardContent>
                                  </Card>
                              </TabsContent>
                          </motion.div>
                      </AnimatePresence>
                  </Tabs>
              </div>

              {/* --- PROFESSIONAL SIDEBAR ANALYTICS (MATCHING REF 3) --- */}
              <div className="xl:col-span-4 space-y-6 lg:sticky lg:top-8">
                  <Card className="bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden">
                      <CardHeader className="p-8 pb-4 border-b border-slate-50">
                          <div className="flex items-center gap-3 mb-4">
                              <div className="p-2 bg-blue-50 rounded-lg">
                                  <BarChart3 className="w-5 h-5 text-blue-600" />
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Yield Impact Analytics</span>
                          </div>
                          <CardTitle className="text-xl font-bold tracking-tight text-slate-900 leading-none truncate">{watchedData.name || 'Untitled Rule Strategy'}</CardTitle>
                      </CardHeader>
                      
                      <CardContent className="p-8 space-y-8">
                          <div className="space-y-6">
                              <div className="flex justify-between items-center text-sm font-medium">
                                  <span className="text-slate-500">Base Master Price</span>
                                  <span className="text-slate-900 font-mono font-bold">${yieldAnalytics.basePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm font-medium">
                                  <span className="text-blue-600">Calculated Adjustment</span>
                                  <span className="text-blue-600 font-mono font-bold">-${yieldAnalytics.deltaSavings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                              </div>
                              <Separator className="bg-slate-100" />
                              <div className="space-y-4 pt-2">
                                  <div className="flex items-baseline justify-between gap-2">
                                      <div className="space-y-1">
                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Projected Net Yield</span>
                                          <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-md border border-slate-100 max-w-[140px]">
                                              <span className="text-[9px] font-bold text-slate-500 uppercase truncate">{yieldAnalytics.targetDescriptor}</span>
                                          </div>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-4xl font-bold tracking-tighter text-slate-900 font-mono">${yieldAnalytics.finalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                      </div>
                                  </div>
                                  
                                  <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                                      <Label className="text-[10px] font-bold text-slate-400 uppercase">Simulate Volume</Label>
                                      <div className="flex items-center gap-4">
                                          <Input type="number" value={simulatedQty} onChange={(e) => setSimulatedQty(Math.max(1, Number(e.target.value)))} className="h-10 bg-white border-slate-200 font-bold text-center text-xs rounded-lg shadow-sm" />
                                          <div className="text-[9px] font-bold text-slate-400 uppercase leading-tight tracking-tight">Test <br/>Scaling</div>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col items-center shadow-sm">
                                  <History className="w-4 h-4 text-slate-400 mb-2" />
                                  <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Audit State</p>
                                  <p className={cn("text-[10px] font-bold uppercase tracking-wider", isAuthorizedForCommit ? "text-emerald-600" : "text-amber-500")}>{isAuthorizedForCommit ? "Verified" : "Staged"}</p>
                              </div>
                              <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col items-center shadow-sm">
                                  <Scale className="text-slate-400 mb-2 w-4 h-4" />
                                  <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Efficiency</p>
                                  <p className="text-[10px] font-bold text-slate-900">{yieldAnalytics.efficiencyScore.toFixed(2)}%</p>
                              </div>
                          </div>
                      </CardContent>
                  </Card>

                  {/* SUB-MODULE NODES (MATCHING REF 3) */}
                  <div className="grid grid-cols-3 gap-3">
                      {[
                          { icon: Globe, label: 'Geo-Map' },
                          { icon: Landmark, label: 'Tax-Rules' },
                          { icon: FileCode, label: 'Schema' }
                      ].map((item, i) => (
                          <button 
                              key={i} 
                              type="button"
                              className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-slate-900 transition-all active:scale-95 group"
                          >
                              <item.icon className="w-5 h-5 text-slate-400 mb-2 group-hover:text-slate-900 transition-colors" />
                              <span className="text-[9px] font-bold text-slate-500 uppercase text-center leading-tight tracking-tighter">{item.label}</span>
                          </button>
                      ))}
                  </div>

                  <div className="flex items-center justify-center gap-3 py-4 text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em]">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm" />
                      Master Sync: 100%
                  </div>
              </div>
          </div>
      </form>
    </div>
  );
}