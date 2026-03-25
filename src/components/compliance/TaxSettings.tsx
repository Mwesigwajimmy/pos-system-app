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
  Landmark, 
  Trash2, 
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Briefcase,
  Globe
} from "lucide-react";
import toast from "react-hot-toast";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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
      toast.error(error.code === '23505' ? "Rule already exists for this category." : "Error saving rule.");
    } else {
      toast.success("Tax Rule Saved");
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
    const { error } = await supabase.from('tax_configurations').update({ is_active: !currentStatus }).eq('id', id);
    if (error) toast.error("Update failed.");
    else fetchConfigs();
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    const { error } = await supabase.from('tax_configurations').delete().eq('id', id);
    if (error) toast.error("Delete failed");
    else fetchConfigs();
  };

  return (
    <div className="flex flex-col xl:flex-row gap-8 p-6 md:p-10 bg-white min-h-[600px] animate-in fade-in duration-500">
      
      {/* LEFT: Configuration Form (Fixed Width on Desktop) */}
      <div className="w-full xl:w-[400px] shrink-0">
        <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden sticky top-0">
          <CardHeader className="bg-slate-50 border-b border-slate-200 p-6">
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-blue-600" />
              Tax Setup
            </CardTitle>
            <CardDescription className="text-xs font-medium text-slate-500">
              Configure rates for your jurisdiction.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSave}>
            <CardContent className="space-y-5 p-6">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500 uppercase">Tax Name</Label>
                <Input name="tax_name" placeholder="e.g. VAT" className="h-10" required />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500 uppercase">Category Code</Label>
                <Input name="tax_category_code" placeholder="STANDARD" className="h-10 font-mono uppercase bg-slate-50" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Rate (%)</Label>
                  <Input name="rate" type="number" step="0.01" placeholder="18.0" className="h-10 font-bold text-blue-600" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Currency</Label>
                  <Input name="currency" placeholder="UGX" className="h-10 font-bold uppercase" required maxLength={3} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Country ISO</Label>
                  <Input name="country" placeholder="UG" className="h-10 font-bold" required maxLength={2} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Region</Label>
                  <Input name="region" placeholder="Optional" className="h-10" />
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex gap-3">
                <Briefcase className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-blue-700 font-semibold leading-relaxed">
                  Automatic handling for Retail and Professional Services.
                </p>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t p-6">
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 rounded-lg" disabled={saving}>
                {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                Save Rule
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      {/* RIGHT: Active Rules Table (Expands to fill space) */}
      <div className="flex-1 min-w-0">
        <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden h-full flex flex-col">
          <CardHeader className="bg-slate-50/50 border-b p-6 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">Active Rules</CardTitle>
              <CardDescription className="text-xs text-slate-500">Live jurisdictions and tax rates.</CardDescription>
            </div>
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-bold">
              {configs.length} Rules
            </Badge>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <ScrollArea className="h-full w-full">
              {loading ? (
                <div className="p-20 text-center text-slate-400">Loading rules...</div>
              ) : configs.length === 0 ? (
                <div className="p-20 text-center">
                  <AlertCircle className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                  <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">No rules configured</p>
                </div>
              ) : (
                <div className="min-w-[600px]">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="pl-6 h-10 text-[10px] font-bold uppercase text-slate-500">Authority</TableHead>
                        <TableHead className="h-10 text-[10px] font-bold uppercase text-slate-500">Location</TableHead>
                        <TableHead className="text-right h-10 text-[10px] font-bold uppercase text-slate-500">Rate</TableHead>
                        <TableHead className="text-center h-10 text-[10px] font-bold uppercase text-slate-500">Active</TableHead>
                        <TableHead className="text-right pr-6 h-10 text-[10px] font-bold uppercase text-slate-500"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {configs.map((rule) => (
                        <TableRow key={rule.id} className="hover:bg-slate-50 border-b border-slate-100">
                          <TableCell className="pl-6 py-4">
                            <div className="flex items-center gap-3">
                              <Landmark size={16} className="text-slate-400" />
                              <div>
                                <p className="font-bold text-slate-900 text-sm">{rule.tax_name}</p>
                                <span className="text-[9px] font-bold text-blue-600 uppercase bg-blue-50 px-1.5 py-0.5 rounded">{rule.tax_category_code || 'STANDARD'}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="font-mono text-[10px] h-5">{rule.country_code}</Badge>
                              {rule.region_code && <span className="text-slate-400 text-[10px] font-bold uppercase">/ {rule.region_code}</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-900">{rule.rate_percentage}%</TableCell>
                          <TableCell className="text-center">
                            <Switch checked={rule.is_active} onCheckedChange={() => toggleActive(rule.id, rule.is_active, rule.tax_category_code)} />
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-600" onClick={() => deleteRule(rule.id)}>
                              <Trash2 size={16} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t py-3 px-6 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-tight">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> System Verified
            </div>
            <span>v10.2</span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}