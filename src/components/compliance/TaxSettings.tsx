'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
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
  Fingerprint,
  ShieldCheck
} from "lucide-react";
import { toast } from "sonner";

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

    if (error) toast.error("Failed to load tax rules: " + error.message);
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

    // GRASSROOT VERIFICATION: Check if an active rule for this category already exists
    const existingActive = configs.find(c => c.tax_category_code === categoryCode && c.is_active);
    
    const newRule = {
      business_id: businessId,
      tax_name: formData.get('tax_name'),
      tax_category_code: categoryCode,
      rate_percentage: parseFloat(formData.get('rate') as string),
      country_code: formData.get('country')?.toString().toUpperCase(),
      region_code: formData.get('region')?.toString() || null,
      currency_code: formData.get('currency')?.toString().toUpperCase() || 'USD',
      is_active: existingActive ? false : true // Default to inactive if a conflict exists
    };

    const { error } = await supabase.from('tax_configurations').insert([newRule]);

    if (error) {
      if (error.code === '23505') {
        toast.error("A conflict was detected: You already have an active rule for this category.");
      } else {
        toast.error("Configuration Error: " + error.message);
      }
    } else {
      toast.success(existingActive ? "Rule created as Draft (Category already has active rule)" : "Tax Jurisdiction Activated");
      fetchConfigs();
      (e.target as HTMLFormElement).reset();
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, currentStatus: boolean, categoryCode: string | null) => {
    // If activating, ensure we don't violate our unique constraint logic
    if (!currentStatus) {
        const otherActive = configs.find(c => c.tax_category_code === categoryCode && c.is_active && c.id !== id);
        if (otherActive) {
            toast.error(`Please deactivate the existing ${categoryCode} rule before activating this one.`);
            return;
        }
    }

    const { error } = await supabase
      .from('tax_configurations')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) toast.error("Kernel update failed: " + error.message);
    else fetchConfigs();
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Are you sure you want to remove this tax jurisdiction? This action is permanent but will not affect old ledger records.")) return;
    const { error } = await supabase.from('tax_configurations').delete().eq('id', id);
    if (error) toast.error("Delete failed");
    else fetchConfigs();
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in duration-500">
      
      <Card className="xl:col-span-1 h-fit border-slate-200 shadow-xl rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-slate-900 text-white border-b border-white/10">
          <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight">
            <Settings2 className="w-5 h-5 text-blue-400"/>
            Tax Provisioning
          </CardTitle>
          <CardDescription className="text-slate-400 font-medium">
            Define the legal tax DNA for your jurisdictional transactions.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="space-y-5 pt-8">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Tax Authority Name</Label>
              <Input name="tax_name" placeholder="e.g. Uganda VAT" className="h-11 font-bold" required />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                <Fingerprint className="w-4 h-4 text-blue-500"/>
                Tax Category Code
              </Label>
              <Input name="tax_category_code" placeholder="STANDARD, MEDICINE, etc." className="h-11 font-mono uppercase font-bold" required />
              <p className="text-[9px] text-slate-400 italic leading-tight">Must match the 'Tax Category' birthed on your product variants.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Rate (%)</Label>
                <Input name="rate" type="number" step="0.01" placeholder="18.0" className="h-11 font-mono font-bold" required />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Currency</Label>
                <Input name="currency" placeholder="UGX" className="h-11 font-mono uppercase font-bold" required maxLength={3} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Country ISO</Label>
                <Input name="country" placeholder="UG" className="h-11 font-mono font-bold" required maxLength={2} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Region</Label>
                <Input name="region" placeholder="Optional" className="h-11" />
              </div>
            </div>

            <div className="p-4 bg-blue-50/50 rounded-2xl flex gap-3 text-[10px] text-blue-700 border border-blue-100 font-medium">
                <Globe className="w-4 h-4 shrink-0"/>
                <p>Logic is applied autonomously based on transaction location and product DNA.</p>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t pt-4">
            <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 font-black uppercase tracking-widest shadow-lg shadow-blue-100" disabled={saving}>
              {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Plus className="mr-2 h-4 w-4"/>}
              Activate Jurisdiction
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="xl:col-span-2 shadow-2xl border-none rounded-[2rem] overflow-hidden bg-white">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-6 bg-slate-50/50">
          <div>
            <CardTitle className="text-2xl font-black uppercase tracking-tight">Jurisdictional Registry</CardTitle>
            <CardDescription className="font-medium text-slate-500">Live tax rules applied to your Sovereign Ledger.</CardDescription>
          </div>
          <Badge variant="outline" className="px-4 py-1.5 font-mono text-blue-600 border-blue-200 bg-blue-50 font-black">
            {configs.length} ACTIVE RULES
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 text-slate-300 animate-pulse">
                <Loader2 className="animate-spin w-12 h-12 mb-4"/>
                <p className="font-black uppercase tracking-[0.2em] text-xs">Syncing Ledger...</p>
            </div>
          ) : configs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32">
                <AlertCircle className="w-16 h-16 text-slate-100 mb-4"/>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Empty Registry</h3>
                <p className="text-slate-400 text-sm mt-1 italic">The system is currently defaulting to 0% tax.</p>
            </div>
          ) : (
            <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="pl-8 font-black uppercase text-[10px] tracking-widest text-slate-400">Authority</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Location</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-slate-400">Rate</TableHead>
                    <TableHead className="text-center font-black uppercase text-[10px] tracking-widest text-slate-400">Status</TableHead>
                    <TableHead className="text-right pr-8 font-black uppercase text-[10px] tracking-widest text-slate-400">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((rule) => (
                    <TableRow key={rule.id} className="hover:bg-blue-50/30 transition-colors border-slate-50">
                      <TableCell className="pl-8 py-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 rounded-lg">
                                <Landmark className="w-4 h-4 text-slate-600"/>
                            </div>
                            <div>
                                <p className="font-black text-slate-900 leading-none mb-1">{rule.tax_name}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-slate-400 font-mono">{rule.currency_code}</span>
                                  <Badge variant="secondary" className="text-[8px] py-0 h-3.5 bg-blue-600 text-white font-black border-none uppercase">
                                    {rule.tax_category_code || 'STANDARD'}
                                  </Badge>
                                </div>
                            </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-[10px] border-slate-200 text-slate-500 font-bold">{rule.country_code}</Badge>
                            {rule.region_code && <span className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter">/ {rule.region_code}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-black text-lg text-slate-900 font-mono">
                        {rule.rate_percentage}%
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center items-center gap-4">
                           <Switch 
                             checked={rule.is_active} 
                             onCheckedChange={() => toggleActive(rule.id, rule.is_active, rule.tax_category_code)}
                             className="data-[state=checked]:bg-blue-600"
                           />
                           {rule.is_active ? <CheckCircle2 className="w-4 h-4 text-emerald-500"/> : <AlertCircle className="w-4 h-4 text-slate-200"/>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-600 transition-colors" onClick={() => deleteRule(rule.id)}>
                            <Trash2 className="w-4 h-4"/>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter className="bg-slate-50 border-t py-4 flex justify-between items-center text-[9px] font-mono text-slate-400 font-bold uppercase tracking-widest">
            <span className="flex items-center gap-2 text-emerald-600">
              <ShieldCheck className="w-3.5 h-3.5"/>
              Forensic Compliance Handshake Verified
            </span>
            <span>Ref ID: TX_KERNEL_V10_{businessId.substring(0,6)}</span>
        </CardFooter>
      </Card>
    </div>
  );
}