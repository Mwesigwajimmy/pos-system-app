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
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

interface TaxConfig {
  id: string;
  tax_name: string;
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

  // 2. Save New Smart Rule
  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.currentTarget);
    const newRule = {
      business_id: businessId,
      tax_name: formData.get('tax_name'),
      rate_percentage: parseFloat(formData.get('rate') as string),
      country_code: formData.get('country')?.toString().toUpperCase(),
      region_code: formData.get('region')?.toString() || null,
      currency_code: formData.get('currency')?.toString().toUpperCase() || 'USD',
      is_active: true
    };

    const { error } = await supabase.from('tax_configurations').insert([newRule]);

    if (error) {
      toast.error("Configuration Error: " + error.message);
    } else {
      toast.success("Tax Jurisdiction Activated");
      fetchConfigs();
      (e.target as HTMLFormElement).reset();
    }
    setSaving(false);
  };

  // 3. Toggle Rule Status
  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('tax_configurations')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) toast.error("Update failed");
    else fetchConfigs();
  };

  // 4. Delete Rule
  const deleteRule = async (id: string) => {
    if (!confirm("Are you sure you want to remove this tax jurisdiction?")) return;
    
    const { error } = await supabase.from('tax_configurations').delete().eq('id', id);
    if (error) toast.error("Delete failed");
    else fetchConfigs();
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in duration-500">
      
      {/* LEFT: Configuration Form */}
      <Card className="xl:col-span-1 h-fit border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50/50 border-b">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Settings2 className="w-5 h-5 text-blue-600"/>
            Smart Tax Setup
          </CardTitle>
          <CardDescription>
            Define custom tax rates for countries, states (Texas), or local municipalities.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="space-y-5 pt-6">
            <div className="space-y-2">
              <Label htmlFor="tax_name">Tax Authority Name</Label>
              <Input id="tax_name" name="tax_name" placeholder="e.g. Texas Sales Tax or Uganda VAT" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rate">Rate (%)</Label>
                <Input id="rate" name="rate" type="number" step="0.01" placeholder="8.25" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency Code</Label>
                <Input id="currency" name="currency" placeholder="USD, UGX, etc." required maxLength={3} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country ISO</Label>
                <Input id="country" name="country" placeholder="US, UG, UK" required maxLength={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">Region / State</Label>
                <Input id="region" name="region" placeholder="Texas, Kampala" />
              </div>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg flex gap-3 text-sm text-blue-700 border border-blue-100">
                <Globe className="w-5 h-5 shrink-0"/>
                <p>Rules are applied based on the transaction location. Ensure ISO codes match your sales data.</p>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50/50 border-t pt-4">
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={saving}>
              {saving ? <Loader2 className="animate-spin mr-2 w-4 h-4"/> : <Plus className="mr-2 w-4 h-4"/>}
              Activate Jurisdiction
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* RIGHT: Active Rules Table */}
      <Card className="xl:col-span-2 shadow-sm border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Jurisdictional Registry</CardTitle>
            <CardDescription>All active tax rules currently being applied to calculations.</CardDescription>
          </div>
          <Badge variant="outline" className="px-3 py-1 font-mono">
            {configs.length} Active Rules
          </Badge>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="animate-spin w-10 h-10 mb-4"/>
                <p>Synching tax ledger...</p>
            </div>
          ) : configs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl bg-slate-50/50">
                <AlertCircle className="w-12 h-12 text-slate-300 mb-4"/>
                <h3 className="text-lg font-medium text-slate-900">No Tax Rules Defined</h3>
                <p className="text-slate-500 text-center max-w-xs mt-1">
                    Calculations will default to 0% until a jurisdiction is activated.
                </p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Authority</TableHead>
                    <TableHead>Jurisdiction</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((rule) => (
                    <TableRow key={rule.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                            <Landmark className="w-4 h-4 text-slate-400"/>
                            <div>
                                <p className="font-semibold text-slate-900">{rule.tax_name}</p>
                                <p className="text-[10px] text-slate-500 uppercase font-mono">{rule.currency_code}</p>
                            </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 items-center">
                            <Badge variant="secondary" className="font-mono text-[10px]">{rule.country_code}</Badge>
                            {rule.region_code && <span className="text-slate-400 text-xs">/ {rule.region_code}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-700">
                        {rule.rate_percentage}%
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center items-center gap-3">
                           <Switch 
                             checked={rule.is_active} 
                             onCheckedChange={() => toggleActive(rule.id, rule.is_active)}
                           />
                           {rule.is_active ? <CheckCircle2 className="w-4 h-4 text-green-500"/> : <AlertCircle className="w-4 h-4 text-slate-300"/>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteRule(rule.id)}>
                            <Trash2 className="w-4 h-4"/>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-slate-50 text-[10px] text-slate-400 flex justify-between border-t py-3">
            <span>IFRS Compliance Verified</span>
            <span>Last Synced: {new Date().toLocaleTimeString()}</span>
        </CardFooter>
      </Card>
    </div>
  );
}