'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Loader2, 
  Settings2, 
  Plus, 
  Globe, 
  Landmark, 
  Trash2, 
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Briefcase
} from "lucide-react";
import { toast } from "react-hot-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TaxConfig {
  id: string;
  tax_name: string;
  tax_category_code: string | null;
  rate_percentage: number;
  country_code: string;
  region_code: string | null;
  currency_code: string;
  is_active: boolean;
  created_at: string;
}

export default function TaxSettings({ businessId }: { businessId: string }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configs, setConfigs] = useState<TaxConfig[]>([]);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tax_configurations')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) toast.error("Failed to load rules.");
    else setConfigs(data || []);
    setLoading(false);
  }, [businessId, supabase]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.currentTarget);
    const categoryCode = formData.get('tax_category_code')?.toString().toUpperCase() || 'STANDARD';

    const existingActive = configs.find(c => c.tax_category_code === categoryCode && c.is_active);
    
    const newRule = {
      business_id: businessId,
      tax_name: formData.get('tax_name'),
      tax_category_code: categoryCode,
      rate_percentage: parseFloat(formData.get('rate') as string),
      country_code: formData.get('country')?.toString().toUpperCase(),
      region_code: formData.get('region')?.toString() || null,
      currency_code: formData.get('currency')?.toString().toUpperCase() || 'UGX',
      is_active: existingActive ? false : true 
    };

    const { error } = await supabase.from('tax_configurations').insert([newRule]);

    if (error) {
      if (error.code === '23505') {
        toast.error("An active rule already exists for this category.");
      } else {
        toast.error("Error: " + error.message);
      }
    } else {
      toast.success(existingActive ? "Rule saved as Draft" : "Tax Rule Activated");
      fetchConfigs();
      (e.target as HTMLFormElement).reset();
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, currentStatus: boolean, categoryCode: string | null) => {
    if (!currentStatus) {
        const otherActive = configs.find(c => c.tax_category_code === categoryCode && c.is_active && c.id !== id);
        if (otherActive) {
            toast.error(`Please deactivate the existing ${categoryCode} rule first.`);
            return;
        }
    }

    const { error } = await supabase
      .from('tax_configurations')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) toast.error("Update failed.");
    else fetchConfigs();
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Remove this tax rule? This action is permanent.")) return;
    const { error } = await supabase.from('tax_configurations').delete().eq('id', id);
    if (error) toast.error("Delete failed");
    else fetchConfigs();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500 p-2 lg:p-4">
      
      {/* LEFT: Configuration Form */}
      <Card className="lg:col-span-1 h-fit border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-50 border-b border-slate-200 p-6">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Settings2 className="w-5 h-5 text-blue-600"/>
            Tax Configuration
          </CardTitle>
          <CardDescription className="text-slate-500 text-xs font-medium">
            Define tax rates for different product and service categories.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="space-y-5 p-6">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Tax Name</Label>
              <Input name="tax_name" placeholder="e.g. VAT" className="h-10 border-slate-200" required />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase ml-1">
                Category Code
              </Label>
              <Input name="tax_category_code" placeholder="STANDARD, MEDICAL, etc." className="h-10 font-mono uppercase font-bold bg-slate-50" required />
              <p className="text-[10px] text-slate-400 italic leading-tight ml-1">Must match product category codes.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Rate (%)</Label>
                <Input name="rate" type="number" step="0.01" placeholder="18.0" className="h-10 font-bold text-blue-600" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Currency</Label>
                <Input name="currency" placeholder="UGX" className="h-10 font-bold uppercase" required maxLength={3} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Country ISO</Label>
                <Input name="country" placeholder="UG" className="h-10 font-bold" required maxLength={2} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Region</Label>
                <Input name="region" placeholder="Optional" className="h-10" />
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex gap-3 items-start">
                <Briefcase className="w-4 h-4 text-blue-600 mt-0.5 shrink-0"/>
                <p className="text-[10px] text-blue-700 font-semibold leading-relaxed">
                    This logic handles Retail, Medical, and Professional Service fees automatically.
                </p>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t p-6">
            <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm" disabled={saving}>
              {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Plus className="mr-2 h-4 w-4"/>}
              Save Configuration
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* RIGHT: Active Rules Table */}
      <Card className="lg:col-span-2 shadow-sm border border-slate-200 rounded-xl overflow-hidden bg-white">
        <CardHeader className="flex flex-row items-center justify-between border-b p-6 bg-slate-50/30">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 uppercase">Active Rules</CardTitle>
            <CardDescription className="text-xs font-medium text-slate-500 mt-1">Manage active tax jurisdictions and rates.</CardDescription>
          </div>
          <Badge variant="secondary" className="px-3 py-1 font-bold text-blue-600 bg-blue-50 border border-blue-100">
            {configs.length} Rules Defined
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 text-slate-300">
                <Loader2 className="animate-spin h-8 w-8 mb-3 text-blue-600"/>
                <p className="text-xs font-bold uppercase tracking-widest">Loading records...</p>
            </div>
          ) : configs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                <AlertCircle className="w-12 h-12 mb-3 opacity-20"/>
                <p className="text-sm font-semibold uppercase">No rules configured</p>
                <p className="text-xs mt-1 italic">Taxes will default to 0%.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="pl-6 h-12 text-[10px] font-bold uppercase text-slate-500 tracking-wider">Tax Details</TableHead>
                    <TableHead className="h-12 text-[10px] font-bold uppercase text-slate-500 tracking-wider">Region</TableHead>
                    <TableHead className="text-right h-12 text-[10px] font-bold uppercase text-slate-500 tracking-wider">Rate</TableHead>
                    <TableHead className="text-center h-12 text-[10px] font-bold uppercase text-slate-500 tracking-wider">Status</TableHead>
                    <TableHead className="text-right pr-6 h-12 text-[10px] font-bold uppercase text-slate-500 tracking-wider">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((rule) => (
                    <TableRow key={rule.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 group">
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 rounded-lg text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                <Landmark size={18}/>
                            </div>
                            <div>
                                <p className="font-bold text-slate-900 text-sm">{rule.tax_name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] font-bold text-slate-400 font-mono">{rule.currency_code}</span>
                                  <Badge className="text-[8px] h-3.5 bg-blue-600 text-white font-bold border-none uppercase">
                                    {rule.tax_category_code || 'STANDARD'}
                                  </Badge>
                                </div>
                            </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="font-mono text-[10px] border-slate-200 text-slate-500 font-bold px-1.5 h-5">{rule.country_code}</Badge>
                            {rule.region_code && <span className="text-slate-400 text-[10px] font-semibold uppercase">/ {rule.region_code}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-sm text-slate-900">
                        {rule.rate_percentage}%
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center items-center gap-3">
                           <Switch 
                             checked={rule.is_active} 
                             onCheckedChange={() => toggleActive(rule.id, rule.is_active, rule.tax_category_code)}
                             className="data-[state=checked]:bg-emerald-500"
                           />
                           {rule.is_active ? <CheckCircle2 size={14} className="text-emerald-500"/> : <AlertCircle size={14} className="text-slate-200"/>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg" onClick={() => deleteRule(rule.id)}>
                            <Trash2 size={16}/>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-slate-50 border-t py-4 px-6 flex justify-between items-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500"/>
              System Verified
            </div>
            <div className="flex items-center gap-4">
                <span>Version: 10.2</span>
                <span>Node: {businessId.substring(0,8).toUpperCase()}</span>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}