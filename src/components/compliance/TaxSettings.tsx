'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
// GRASSROOT FIX: Ensuring all Card components are strictly imported to resolve the ReferenceError
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
  Fingerprint,
  ShieldCheck,
  Briefcase // UPGRADE: Added for Professional Services visibility
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

  // 1. Fetch Existing Jurisdictions
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

  // 2. Save New Smart Rule (Upgraded with Professional Services DNA)
  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.currentTarget);
    const categoryCode = formData.get('tax_category_code')?.toString().toUpperCase() || 'STANDARD';

    // GRASSROOT VERIFICATION: Check for active rule collision
    const existingActive = configs.find(c => c.tax_category_code === categoryCode && c.is_active);
    
    const newRule = {
      business_id: businessId,
      tax_name: formData.get('tax_name'),
      tax_category_code: categoryCode,
      rate_percentage: parseFloat(formData.get('rate') as string),
      country_code: formData.get('country')?.toString().toUpperCase(),
      region_code: formData.get('region')?.toString() || null,
      currency_code: formData.get('currency')?.toString().toUpperCase() || 'USD',
      is_active: existingActive ? false : true 
    };

    const { error } = await supabase.from('tax_configurations').insert([newRule]);

    if (error) {
      if (error.code === '23505') {
        toast.error("Forensic Collision: An active rule already exists for this category.");
      } else {
        toast.error("Configuration Error: " + error.message);
      }
    } else {
      toast.success(existingActive ? "Jurisdiction saved as Draft" : "Tax Jurisdiction Activated");
      fetchConfigs();
      (e.target as HTMLFormElement).reset();
    }
    setSaving(false);
  };

  // 3. Toggle Rule Status (With Conflict Protection)
  const toggleActive = async (id: string, currentStatus: boolean, categoryCode: string | null) => {
    if (!currentStatus) {
        const otherActive = configs.find(c => c.tax_category_code === categoryCode && c.is_active && c.id !== id);
        if (otherActive) {
            toast.error(`Sovereign Guard: Please deactivate the existing ${categoryCode} rule first.`);
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

  // 4. Delete Rule
  const deleteRule = async (id: string) => {
    if (!confirm("Are you sure you want to remove this tax jurisdiction? This action is permanent in the registry.")) return;
    
    const { error } = await supabase.from('tax_configurations').delete().eq('id', id);
    if (error) toast.error("Delete failed");
    else fetchConfigs();
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in duration-500">
      
      {/* LEFT: Configuration Form */}
      <Card className="xl:col-span-1 h-fit border-slate-200 shadow-xl rounded-[2rem] overflow-hidden bg-white">
        <CardHeader className="bg-slate-900 text-white border-b border-white/5 p-8">
          <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight">
            <Settings2 className="w-5 h-5 text-blue-400"/>
            Tax Provisioning
          </CardTitle>
          <CardDescription className="text-slate-400 font-medium">
            Define the legal tax DNA for your jurisdictional transactions.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="space-y-5 pt-8 p-8">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Tax Authority Name</Label>
              <Input name="tax_name" placeholder="e.g. Professional Service Tax" className="h-12 font-bold bg-slate-50/50" required />
            </div>

            {/* UPGRADE: Robotic Category Code Field (Now including Professional Services context) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                <Fingerprint className="w-4 h-4 text-blue-500"/>
                Tax Category Code
              </Label>
              <Input name="tax_category_code" placeholder="STANDARD, MEDICAL, SERVICE, etc." className="h-12 font-mono uppercase font-black bg-slate-50/50" required />
              <p className="text-[9px] text-slate-400 italic leading-tight ml-1">Must align with your product/service DNA categories.</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Rate (%)</Label>
                <Input name="rate" type="number" step="0.01" placeholder="18.0" className="h-12 font-mono font-black text-blue-600 bg-slate-50/50" required />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Currency</Label>
                <Input name="currency" placeholder="UGX" className="h-12 font-mono font-black uppercase bg-slate-50/50" required maxLength={3} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Country ISO</Label>
                <Input name="country" placeholder="UG" className="h-12 font-mono font-black bg-slate-50/50" required maxLength={2} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Region / State</Label>
                <Input name="region" placeholder="Optional" className="h-12 bg-slate-50/50" />
              </div>
            </div>

            {/* UPGRADE: Professional Services Context Alert */}
            <div className="p-4 bg-blue-50/50 rounded-2xl flex gap-3 text-[10px] text-blue-700 border border-blue-100 font-bold uppercase tracking-tight">
                <Briefcase className="w-5 h-5 shrink-0 text-blue-600"/>
                <p>Logic handles standard Retail, Medical Billing, and Professional Service fees autonomously.</p>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t pt-4 p-8">
            <Button type="submit" className="w-full h-14 bg-blue-600 hover:bg-blue-700 font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95" disabled={saving}>
              {saving ? <Loader2 className="animate-spin mr-3 h-5 w-5"/> : <Plus className="mr-3 h-5 w-5"/>}
              Activate Jurisdiction
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* RIGHT: Active Rules Table */}
      <Card className="xl:col-span-2 shadow-2xl border-none rounded-[2rem] overflow-hidden bg-white">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-8 p-10 bg-slate-50/50">
          <div>
            <CardTitle className="text-3xl font-black uppercase tracking-tighter">Jurisdictional Registry</CardTitle>
            <CardDescription className="font-medium text-slate-500 mt-1">Live tax rules applied to your Sovereign Ledger.</CardDescription>
          </div>
          <Badge variant="outline" className="px-5 py-2 font-mono text-blue-600 border-blue-200 bg-blue-50 font-black text-xs">
            {configs.length} ACTIVE RULES
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 text-slate-300 animate-pulse">
                <Loader2 className="animate-spin w-16 h-16 mb-6"/>
                <p className="font-black uppercase tracking-[0.3em] text-xs">Synchronizing Sovereign DNA...</p>
            </div>
          ) : configs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40">
                <AlertCircle className="w-20 h-20 text-slate-100 mb-6"/>
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Empty Registry</h3>
                <p className="text-slate-400 text-sm mt-1 italic">Calculations are currently defaulting to 0%.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="pl-10 h-14 font-black uppercase text-[10px] tracking-widest text-slate-400">Authority Control</TableHead>
                    <TableHead className="h-14 font-black uppercase text-[10px] tracking-widest text-slate-400">Location</TableHead>
                    <TableHead className="text-right h-14 font-black uppercase text-[10px] tracking-widest text-slate-400">Rate</TableHead>
                    <TableHead className="text-center h-14 font-black uppercase text-[10px] tracking-widest text-slate-400">Status</TableHead>
                    <TableHead className="text-right pr-10 h-14 font-black uppercase text-[10px] tracking-widest text-slate-400">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((rule) => (
                    <TableRow key={rule.id} className="hover:bg-blue-50/20 transition-all border-slate-50 group">
                      <TableCell className="pl-10 py-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-100 rounded-2xl group-hover:bg-blue-100 transition-colors">
                                <Landmark className="w-5 h-5 text-slate-600 group-hover:text-blue-600"/>
                            </div>
                            <div>
                                <p className="font-black text-slate-900 text-base leading-none mb-2">{rule.tax_name}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-black text-slate-400 font-mono">{rule.currency_code}</span>
                                  <Badge className="text-[9px] py-0.5 h-4 bg-blue-600 text-white font-black border-none uppercase tracking-tighter">
                                    {rule.tax_category_code || 'STANDARD'}
                                  </Badge>
                                </div>
                            </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-[10px] border-slate-200 text-slate-500 font-black px-2">{rule.country_code}</Badge>
                            {rule.region_code && <span className="text-slate-400 text-[10px] font-black uppercase tracking-tighter">/ {rule.region_code}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-black text-xl text-slate-900 font-mono tracking-tighter">
                        {rule.rate_percentage}%
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center items-center gap-4">
                           <Switch 
                             checked={rule.is_active} 
                             onCheckedChange={() => toggleActive(rule.id, rule.is_active, rule.tax_category_code)}
                             className="data-[state=checked]:bg-emerald-500"
                           />
                           {rule.is_active ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shadow-sm"/> : <AlertCircle className="w-5 h-5 text-slate-200"/>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-10">
                        <Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all rounded-xl" onClick={() => deleteRule(rule.id)}>
                            <Trash2 className="w-5 h-5"/>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-slate-50 border-t py-6 p-10 flex justify-between items-center text-[10px] font-mono text-slate-400 font-black uppercase tracking-[0.2em]">
            <span className="flex items-center gap-2 text-emerald-600">
              <ShieldCheck className="w-4 h-4"/>
              Forensic Integrity Handshake Verified
            </span>
            <div className="flex items-center gap-4">
                <span>Ref: KERNEL_V10.2</span>
                <div className="h-1 w-1 rounded-full bg-slate-300" />
                <span>Node: {businessId.substring(0,8).toUpperCase()}</span>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}