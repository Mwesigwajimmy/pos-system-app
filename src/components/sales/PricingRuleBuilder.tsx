'use client';

import React, { useState, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useFormState } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Save, ShieldCheck, Layers, Calculator,
  ArrowRight, Trash2, Plus, Activity, Target,
  Settings2, BarChart3, ArrowUpRight, Scale,
  History, Globe, Landmark, FileCode, BadgeCheck,
  ShieldAlert, Database, BoxSelect, RefreshCw, Search, ChevronRight,
  TrendingUp, FileText, Layout
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// --- Interfaces ---
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

// Formula Engine (Logic Preserved)
const evaluateEnterpriseFormula = (formula: string, base: number, qty: number): number => {
  try {
    if (!formula) return base;
    const sanitized = formula
      .replace(/BASE/g, base.toString())
      .replace(/QTY/g, qty.toString())
      .replace(/[^-?\d+/*().\s]/g, ''); 
    
    const compute = new Function(`return (${sanitized})`);
    return Number(compute()) || 0;
  } catch (e) {
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
          currency_code: currencies[0] || 'UGX',
          tiers: [{ min_qty: 1, max_qty: null, value: 0 }] 
      }],
    },
  });

  const watchedData = watch();
  const { fields: condFields, append: addCond, remove: remCond } = useFieldArray({ control, name: "conditions" });
  const { fields: actFields, append: addAct, remove: remAct } = useFieldArray({ control, name: "actions" });
  const [state, formAction] = useFormState(createOrUpdatePricingRule, { success: false, message: '' });

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
            const activeTier = action.tiers?.find(t => simulatedQty >= t.min_qty && (!t.max_qty || simulatedQty <= t.max_qty));
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
        basePrice: baseUnitCost,
        finalPrice: Math.max(0, adjustedPrice),
        deltaSavings: Math.max(0, cumulativeSavings),
        efficiencyScore: baseUnitCost > 0 ? (cumulativeSavings / baseUnitCost) * 100 : 0,
        targetDescriptor: resolvedProduct?.name || 'No Product Selected'
    };
  }, [watchedData, products, simulatedQty]);

  const onExecuteCommit = async (data: PricingRuleFormValues) => {
    const isValid = await trigger();
    if (!isValid) return;
    const formData = new FormData();
    formData.append('ruleData', JSON.stringify({ ...data, id: initialData?.id }));
    formData.append('locale', locale);
    toast({ title: "Saving Strategy", description: "Applying pricing parameters to the global database." });
    formAction(formData);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased">
      <form onSubmit={handleSubmit(onExecuteCommit)} className="w-full max-w-[1400px] mx-auto space-y-8 p-6 md:p-10">
          
          {/* HEADER */}
          <header className="flex flex-col lg:flex-row items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-4 w-full lg:w-auto">
                  <div className="p-3 bg-blue-600 rounded-lg shadow-md">
                      <Scale className="text-white w-7 h-7" />
                  </div>
                  <div>
                      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pricing Strategy Builder</h1>
                      <div className="flex items-center gap-2 mt-1">
                          <CheckCircle2 className="w-4 h-4 text-blue-500" />
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-tight">Active Tenant: {tenantId.slice(0, 8)}</p>
                      </div>
                  </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto justify-end">
                  <div className="hidden md:flex flex-col justify-center px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg min-w-[150px]">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Configuration Status</span>
                      <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", isAuthorizedForCommit ? "bg-emerald-500" : "bg-amber-500")} />
                          <span className="text-xs font-bold text-slate-700">{systemReadiness.length}/3 Complete</span>
                      </div>
                  </div>
                  
                  <Button 
                      type="submit" 
                      disabled={!isAuthorizedForCommit || isSubmitting}
                      className={cn(
                          "h-11 px-8 font-bold text-sm shadow-sm transition-all rounded-lg w-full sm:w-auto",
                          isAuthorizedForCommit ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-slate-100 text-slate-400"
                      )}
                  >
                      {isAuthorizedForCommit ? <Save className="w-4 h-4 mr-2" /> : <ShieldAlert className="w-4 h-4 mr-2" />}
                      Save Strategy
                  </Button>
              </div>
          </header>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              
              {/* BUILDER WORKSPACE */}
              <div className="xl:col-span-8 space-y-6">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
                      <TabsList className="bg-white border border-slate-200 p-1.5 rounded-xl w-full h-14 shadow-sm">
                          {[
                              { id: 'config', label: '1. Settings', icon: Settings2 },
                              { id: 'logic', label: '2. Targeting', icon: Layers },
                              { id: 'outcomes', label: '3. Logic', icon: Calculator },
                          ].map(tab => (
                              <TabsTrigger 
                                  key={tab.id} 
                                  value={tab.id} 
                                  className="rounded-lg font-bold text-xs uppercase tracking-tight h-full data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all flex items-center justify-center gap-2 px-6"
                              >
                                  <tab.icon size={16} />
                                  <span>{tab.label}</span>
                              </TabsTrigger>
                          ))}
                      </TabsList>

                      <AnimatePresence mode="wait">
                          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                              
                              {/* TAB 1: CONFIG */}
                              <TabsContent value="config" className="m-0">
                                  <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                                      <CardHeader className="p-8 border-b bg-slate-50/50">
                                          <CardTitle className="text-lg font-bold text-slate-800">Strategy Configuration</CardTitle>
                                          <CardDescription className="text-sm">Set the baseline parameters for this pricing rule.</CardDescription>
                                      </CardHeader>
                                      <CardContent className="p-8 space-y-8">
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                              <div className="space-y-2">
                                                  <Label className="text-xs font-bold text-slate-600 uppercase">Strategy Name</Label>
                                                  <Input {...register('name', { required: true })} placeholder="e.g. Summer Discount 2025" className="h-10 border-slate-200 focus:ring-blue-600" />
                                              </div>
                                              <div className="space-y-2">
                                                  <Label className="text-xs font-bold text-slate-600 uppercase">Priority Rank</Label>
                                                  <Input type="number" {...register('priority', { valueAsNumber: true })} className="h-10 border-slate-200" />
                                              </div>
                                          </div>

                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                                  <div className="space-y-0.5">
                                                      <p className="font-bold text-slate-900 text-sm">Exclusive Rule</p>
                                                      <p className="text-xs text-slate-500">Stops other rules from applying.</p>
                                                  </div>
                                                  <Controller control={control} name="is_exclusive" render={({ field }) => (
                                                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                  )} />
                                              </div>
                                              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                                  <div className="space-y-0.5">
                                                      <p className="font-bold text-slate-900 text-sm">Tax Strategy</p>
                                                      <p className="text-xs text-slate-500">Apply to Net or Gross price.</p>
                                                  </div>
                                                  <Controller control={control} name="tax_strategy" render={({ field }) => (
                                                      <Select onValueChange={field.onChange} value={field.value}>
                                                          <SelectTrigger className="w-[100px] h-9 border-slate-200 bg-white font-bold text-xs uppercase">
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

                                          <div className="flex justify-end pt-6 border-t">
                                              <Button type="button" onClick={async () => { if(await trigger(['name', 'priority'])) setActiveTab('logic'); }} className="bg-slate-900 h-10 px-8 font-bold rounded-lg text-white">
                                                  Continue <ArrowRight className="ml-2 w-4 h-4" />
                                              </Button>
                                          </div>
                                      </CardContent>
                                  </Card>
                              </TabsContent>

                              {/* TAB 2: LOGIC */}
                              <TabsContent value="logic" className="m-0">
                                  <Card className="border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
                                      <CardHeader className="p-8 border-b bg-slate-50/50 flex flex-row items-center justify-between">
                                          <div>
                                              <CardTitle className="text-lg font-bold">Targeting Criteria</CardTitle>
                                              <CardDescription className="text-sm">Define exactly where this pricing rule applies.</CardDescription>
                                          </div>
                                          <Button type="button" variant="outline" onClick={() => addCond({ type: 'PRODUCT', target_id: '', location_id: 'GLOBAL' })} className="h-9 font-bold text-xs border-slate-300">
                                              <Plus className="w-3.5 h-3.5 mr-2" /> Add Criteria
                                          </Button>
                                      </CardHeader>
                                      <CardContent className="p-8 space-y-4">
                                          {condFields.map((field, index) => (
                                              <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 relative group">
                                                  <div className="md:col-span-3 space-y-1.5">
                                                      <Label className="text-[10px] font-bold uppercase text-slate-500">Dimension</Label>
                                                      <Controller control={control} name={`conditions.${index}.type`} render={({ field }) => (
                                                          <Select onValueChange={(val) => { field.onChange(val); setValue(`conditions.${index}.target_id`, ''); }} value={field.value}>
                                                              <SelectTrigger className="h-10 border-slate-200 bg-white font-bold text-[11px] uppercase"><SelectValue /></SelectTrigger>
                                                              <SelectContent>
                                                                  <SelectItem value="PRODUCT">Product</SelectItem>
                                                                  <SelectItem value="CUSTOMER">Customer</SelectItem>
                                                                  <SelectItem value="LOCATION">Branch</SelectItem>
                                                              </SelectContent>
                                                          </Select>
                                                      )}/>
                                                  </div>
                                                  <div className="md:col-span-5 space-y-1.5">
                                                      <Label className="text-[10px] font-bold uppercase text-slate-500">Selection</Label>
                                                      <Controller control={control} name={`conditions.${index}.target_id`} render={({ field: tField }) => (
                                                          <Select onValueChange={tField.onChange} value={tField.value}>
                                                              <SelectTrigger className="h-10 border-slate-200 bg-white font-semibold text-[11px]"><SelectValue placeholder="Search..." /></SelectTrigger>
                                                              <SelectContent>
                                                                  <ScrollArea className="h-64">
                                                                      {watch(`conditions.${index}.type`) === 'PRODUCT' 
                                                                          ? products.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)
                                                                          : customers.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)
                                                                      }
                                                                  </ScrollArea>
                                                              </SelectContent>
                                                          </Select>
                                                      )}/>
                                                  </div>
                                                  <div className="md:col-span-3 space-y-1.5">
                                                      <Label className="text-[10px] font-bold uppercase text-slate-500">Regional Scope</Label>
                                                      <Controller control={control} name={`conditions.${index}.location_id`} render={({ field }) => (
                                                          <Select onValueChange={field.onChange} value={field.value}>
                                                              <SelectTrigger className="h-10 border-slate-200 bg-white font-semibold text-[11px]"><SelectValue placeholder="Global" /></SelectTrigger>
                                                              <SelectContent>
                                                                  <SelectItem value="GLOBAL">All Branches</SelectItem>
                                                                  {locations.map(l => <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>)}
                                                              </SelectContent>
                                                          </Select>
                                                      )}/>
                                                  </div>
                                                  <div className="md:col-span-1 flex items-end pb-1 justify-center">
                                                      <Button variant="ghost" size="icon" onClick={() => remCond(index)} className="text-slate-300 hover:text-red-600"><Trash2 size={16} /></Button>
                                                  </div>
                                              </div>
                                          ))}
                                          <div className="flex justify-between pt-8 border-t">
                                              <Button type="button" variant="ghost" onClick={() => setActiveTab('config')} className="font-bold text-xs uppercase text-slate-400">Previous</Button>
                                              <Button type="button" onClick={async () => { if(await trigger('conditions')) setActiveTab('outcomes'); }} className="bg-slate-900 h-10 px-8 font-bold rounded-lg text-white shadow-sm">
                                                  Next Step <ArrowUpRight className="ml-2 w-4 h-4" />
                                              </Button>
                                          </div>
                                      </CardContent>
                                  </Card>
                              </TabsContent>

                              {/* TAB 3: OUTCOMES */}
                              <TabsContent value="outcomes" className="m-0">
                                  <Card className="border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
                                      <CardHeader className="p-8 border-b bg-slate-50/50 flex flex-row items-center justify-between">
                                          <div>
                                              <CardTitle className="text-lg font-bold">Calculation Logic</CardTitle>
                                              <CardDescription className="text-sm">Define how the final price is calculated.</CardDescription>
                                          </div>
                                          <Button type="button" variant="outline" onClick={() => addAct({ type: 'PERCENTAGE_DISCOUNT', value: 0, currency_code: currencies[0] || 'UGX', tiers: [] })} className="h-9 font-bold text-xs border-slate-300">
                                              <Plus className="w-3.5 h-3.5 mr-2" /> Add Operation
                                          </Button>
                                      </CardHeader>
                                      <CardContent className="p-8 space-y-6">
                                          {actFields.map((field, index) => {
                                              const actionType = watch(`actions.${index}.type`);
                                              return (
                                                  <div key={field.id} className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-6">
                                                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                                                          <div className="md:col-span-4 space-y-1.5">
                                                              <Label className="text-[10px] font-bold uppercase text-slate-500">Adjustment Type</Label>
                                                              <Controller control={control} name={`actions.${index}.type`} render={({ field }) => (
                                                                  <Select onValueChange={field.onChange} value={field.value}>
                                                                      <SelectTrigger className="h-10 border-slate-200 bg-white font-bold text-[11px] uppercase"><SelectValue /></SelectTrigger>
                                                                      <SelectContent>
                                                                          <SelectItem value="PERCENTAGE_DISCOUNT">Discount (%)</SelectItem>
                                                                          <SelectItem value="FIXED_PRICE">Set Fixed Price</SelectItem>
                                                                          <SelectItem value="FORMULA">Custom Formula</SelectItem>
                                                                          <SelectItem value="VOLUME_TIER">Volume Tiers</SelectItem>
                                                                      </SelectContent>
                                                                  </Select>
                                                              )}/>
                                                          </div>

                                                          <div className="md:col-span-7">
                                                              {actionType === 'FORMULA' ? (
                                                                  <div className="relative">
                                                                      <Input {...register(`actions.${index}.formula_string`)} placeholder="e.g. (BASE * 0.90)" className="h-10 font-mono text-sm border-slate-200" />
                                                                      <Calculator className="absolute right-3 top-3 text-slate-300 w-4 h-4" />
                                                                  </div>
                                                              ) : actionType === 'VOLUME_TIER' ? (
                                                                  <div className="h-10 flex items-center px-4 bg-slate-100 rounded-lg text-slate-400 font-bold text-[10px] uppercase">Tier configuration enabled below</div>
                                                              ) : (
                                                                  <Input type="number" step="0.01" {...register(`actions.${index}.value`, { valueAsNumber: true })} className="h-10 font-bold border-slate-200" />
                                                              )}
                                                          </div>
                                                          <div className="md:col-span-1 flex items-end pb-1 justify-center">
                                                              <Button variant="ghost" size="icon" onClick={() => remAct(index)} className="text-slate-300 hover:text-red-600"><Trash2 size={16} /></Button>
                                                          </div>
                                                      </div>

                                                      {actionType === 'VOLUME_TIER' && (
                                                          <div className="pt-6 border-t border-slate-200 space-y-4">
                                                              <div className="flex items-center justify-between">
                                                                  <h4 className="text-[10px] font-bold text-slate-700 uppercase">Threshold Matrix</h4>
                                                                  <Button type="button" variant="outline" size="sm" onClick={() => {
                                                                      const cur = watch(`actions.${index}.tiers`) || [];
                                                                      setValue(`actions.${index}.tiers`, [...cur, { min_qty: 1, max_qty: null, value: 0 }]);
                                                                  }} className="h-8 text-[10px] font-bold border-slate-300">Add Row</Button>
                                                              </div>
                                                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                  {(watch(`actions.${index}.tiers`) || []).map((_, tIdx) => (
                                                                      <div key={tIdx} className="bg-white p-4 rounded-xl border border-slate-200 relative shadow-sm">
                                                                          <div className="grid grid-cols-2 gap-3 mb-3">
                                                                              <div className="space-y-1">
                                                                                  <Label className="text-[9px] font-bold text-slate-400 uppercase">Min Qty</Label>
                                                                                  <Input type="number" {...register(`actions.${index}.tiers.${tIdx}.min_qty`, { valueAsNumber: true })} className="h-8 text-xs font-bold" />
                                                                              </div>
                                                                              <div className="space-y-1">
                                                                                  <Label className="text-[9px] font-bold text-slate-400 uppercase">Max Qty</Label>
                                                                                  <Input type="number" {...register(`actions.${index}.tiers.${tIdx}.max_qty`, { valueAsNumber: true })} placeholder="Max" className="h-8 text-xs font-bold" />
                                                                              </div>
                                                                          </div>
                                                                          <div className="space-y-1">
                                                                              <Label className="text-[9px] font-bold text-slate-400 uppercase">Reduction (%)</Label>
                                                                              <Input type="number" {...register(`actions.${index}.tiers.${tIdx}.value`, { valueAsNumber: true })} className="h-8 text-xs font-bold bg-blue-50/50" />
                                                                          </div>
                                                                          <button type="button" onClick={() => {
                                                                              const cur = watch(`actions.${index}.tiers`) || [];
                                                                              setValue(`actions.${index}.tiers`, cur.filter((__, i) => i !== tIdx));
                                                                          }} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white border border-slate-200 text-red-500 shadow-sm flex items-center justify-center hover:bg-red-50"><X size={12} /></button>
                                                                      </div>
                                                                  ))}
                                                              </div>
                                                          </div>
                                                      )}
                                                  </div>
                                              );
                                          })}
                                          
                                          <div className="flex justify-between pt-8 border-t">
                                              <Button type="button" variant="ghost" onClick={() => setActiveTab('logic')} className="font-bold text-xs uppercase text-slate-400">Previous</Button>
                                              <Button type="submit" disabled={!isAuthorizedForCommit || isSubmitting} className={cn("h-12 px-10 font-bold text-xs uppercase tracking-widest rounded-lg transition-all shadow-md", isAuthorizedForCommit ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-slate-100 text-slate-300 cursor-not-allowed")}>
                                                  Finalize Strategy <CheckCircle2 className="ml-2 w-4 h-4" />
                                              </Button>
                                          </div>
                                      </CardContent>
                                  </Card>
                              </TabsContent>
                          </motion.div>
                      </AnimatePresence>
                  </Tabs>
              </div>

              {/* ANALYTICS SIDEBAR */}
              <div className="xl:col-span-4 space-y-6 lg:sticky lg:top-8">
                  <Card className="bg-slate-950 border-none rounded-xl overflow-hidden shadow-xl text-white">
                      <CardHeader className="p-8 border-b border-white/5">
                          <div className="flex items-center gap-3 mb-3">
                              <TrendingUp className="text-blue-400 h-5 w-5" />
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Yield Impact Summary</span>
                          </div>
                          <CardTitle className="text-xl font-bold tracking-tight truncate uppercase">{watchedData.name || 'Strategy Name'}</CardTitle>
                          <div className="flex items-center gap-2 mt-4">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logic Ready</span>
                          </div>
                      </CardHeader>
                      
                      <CardContent className="p-8 space-y-6">
                          <div className="space-y-5 p-5 bg-white/5 rounded-xl border border-white/10">
                              <div className="flex justify-between items-center text-xs">
                                  <span className="font-semibold text-slate-400">Current Unit Price</span>
                                  <span className="font-bold font-mono">UGX {yieldAnalytics.basePrice.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                  <span className="font-semibold text-blue-400">Adjustment Applied</span>
                                  <span className="font-bold text-blue-400 font-mono">-UGX {yieldAnalytics.deltaSavings.toLocaleString()}</span>
                              </div>
                              <Separator className="bg-white/10" />
                              <div className="space-y-4 pt-1">
                                  <div className="flex justify-between items-end">
                                      <div>
                                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Projected Yield</p>
                                          <p className="text-[11px] font-bold text-slate-300 mt-1 truncate max-w-[150px]">{yieldAnalytics.targetDescriptor}</p>
                                      </div>
                                      <span className="text-3xl font-bold font-mono text-white">UGX {yieldAnalytics.finalPrice.toLocaleString()}</span>
                                  </div>
                                  <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-white/5">
                                      <Label className="text-[10px] font-bold text-slate-400 uppercase">Simulation Qty</Label>
                                      <Input type="number" value={simulatedQty} onChange={(e) => setSimulatedQty(Math.max(1, Number(e.target.value)))} className="w-20 h-9 bg-white/5 border-white/10 text-white font-bold text-center text-xs" />
                                  </div>
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center">
                                  <History className="w-4 h-4 text-slate-500 mx-auto mb-2" />
                                  <p className="text-[9px] font-bold text-slate-500 uppercase">Status</p>
                                  <p className={cn("text-[10px] font-bold uppercase mt-1", isAuthorizedForCommit ? "text-emerald-400" : "text-amber-400")}>{isAuthorizedForCommit ? "Valid" : "Incomplete"}</p>
                              </div>
                              <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center">
                                  <Scale className="text-slate-500 mx-auto mb-2 w-4 h-4" />
                                  <p className="text-[9px] font-bold text-slate-500 uppercase">Efficiency</p>
                                  <p className="text-[10px] font-bold text-white mt-1">{yieldAnalytics.efficiencyScore.toFixed(2)}%</p>
                              </div>
                          </div>
                      </CardContent>
                  </Card>

                  <div className="grid grid-cols-3 gap-3">
                      {[
                          { icon: Globe, label: 'Geo-Logic' },
                          { icon: Landmark, label: 'Compliance' },
                          { icon: FileText, label: 'Audit Log' }
                      ].map((item, i) => (
                          <div key={i} className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm transition-all hover:border-blue-300 group cursor-default">
                              <item.icon size={18} className="text-slate-300 mb-2 group-hover:text-blue-600 transition-colors" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase group-hover:text-slate-600 transition-colors">{item.label}</span>
                          </div>
                      ))}
                  </div>

                  <div className="flex items-center justify-center gap-2 pt-4 opacity-50">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">System Sync: 100%</span>
                  </div>
              </div>
          </div>
      </form>
    </div>
  );
}