'use client';

/**
 * --- BBU1 SOVEREIGN PAYMENT PROVIDER MANAGER ---
 * VERSION: v11.0 OMEGA (REALTIME GATEWAY & MERCHANT RECEIVING WELD)
 * JURISDICTION: Unified Multi-Tenant Cloud / Enterprise Digital Commerce
 */

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import { 
  Loader2, Plus, Trash2, CreditCard, 
  Smartphone, Building2, CheckCircle2, 
  ShieldCheck, Sparkles, Globe, Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";

const supabase = createClient();

// 1. STRICT TYPE DEFINITIONS
export interface PaymentProvider {
  id: string;
  name: string;
  type: "Mobile Money" | "Credit Card" | "Bank" | "Voucher" | "Other";
  region: string;
  entity: string;
  active: boolean;
  currency: string;
  tenantId: string;
  merchantCode?: string;
}

interface PaymentProviderManagerProps {
  providers?: PaymentProvider[];
}

export function PaymentProviderManager({ providers: initialData }: PaymentProviderManagerProps) {
  const queryClient = useQueryClient();

  // INPUT FORM STATES
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('Mobile Money');
  const [newRegion, setNewRegion] = useState('');
  const [newEntity, setNewEntity] = useState('');
  const [newCurrency, setNewCurrency] = useState('');

  // 1. DATA: Identity Context & Currency
  const { data: profile } = useQuery({
    queryKey: ['active_profile_payment_providers'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('profiles').select('*, business_name, currency, business_id').eq('id', user?.id).limit(1).single();
      return data;
    }
  });

  const activeBusinessId = profile?.business_id;
  const defaultCurrency = profile?.currency || 'UGX';

  // 2. DATA: Pull Live Payment Integrations from Supabase
  const { data: liveProviders, isLoading } = useQuery({
    queryKey: ['live_payment_providers', activeBusinessId],
    enabled: !initialData && !!activeBusinessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('business_id', activeBusinessId);

      if (error) return [];

      return (data || []).map((i: any) => ({
        id: String(i.id),
        name: i.service_name || 'Payment Gateway',
        type: (i.meta?.type || (i.service_name?.includes('MOMO') || i.service_name?.includes('AIRTEL') ? 'Mobile Money' : 'Bank')) as PaymentProvider['type'],
        region: i.meta?.region || 'East Africa',
        entity: i.meta?.account_name || profile?.business_name || 'Primary Merchant',
        active: true,
        currency: i.meta?.currency || defaultCurrency,
        tenantId: activeBusinessId || '',
        merchantCode: i.meta?.merchant_code || ''
      })) as PaymentProvider[];
    }
  });

  const activeProvidersList = useMemo(() => {
    return initialData || liveProviders || [];
  }, [initialData, liveProviders]);

  // MUTATION 1: Add New Payment Gateway Provider to Database
  const addProviderMutation = useMutation({
    mutationFn: async () => {
      if (!newName.trim()) throw new Error("Provider name is required.");
      if (!activeBusinessId) throw new Error("Business identity context missing.");

      const serviceCode = newName.toUpperCase().replace(/\s+/g, '_');

      const { error } = await supabase
        .from('integrations')
        .upsert([{
          business_id: activeBusinessId,
          service_name: serviceCode,
          api_key: 'LIVE_ACTIVE',
          meta: {
            account_name: newEntity || profile?.business_name || 'Primary Node',
            merchant_code: newEntity,
            region: newRegion || 'East Africa',
            currency: newCurrency.toUpperCase() || defaultCurrency,
            type: newType,
            updated_at: new Date().toISOString()
          }
        }], { onConflict: 'business_id, service_name' });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment Provider Gateway Configured & Sealed!");
      setNewName(""); 
      setNewType("Mobile Money"); 
      setNewRegion(""); 
      setNewEntity(""); 
      setNewCurrency("");
      queryClient.invalidateQueries({ queryKey: ['live_payment_providers'] });
    },
    onError: (err: any) => toast.error(`Failed to add gateway: ${err.message}`)
  });

  // MUTATION 2: Remove Payment Provider
  const removeProviderMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment Gateway Connection Revoked.");
      queryClient.invalidateQueries({ queryKey: ['live_payment_providers'] });
    },
    onError: (err: any) => toast.error(`Removal Failed: ${err.message}`)
  });

  return (
    <Card className="border border-slate-200 shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-3 text-xl font-black text-slate-900 uppercase tracking-tight">
              <CreditCard className="h-6 w-6 text-blue-600" />
              Payment Provider & Gateway Manager
            </CardTitle>
            <CardDescription className="text-xs font-medium text-slate-500 mt-1">
              Manage payment gateways—local mobile money, card terminals, and bank channels per region & currency.
            </CardDescription>
          </div>

          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold px-3 py-1 text-[10px] uppercase w-fit">
            {activeProvidersList.length} Active Gateways
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-8 space-y-6">
        
        {/* ADD NEW GATEWAY INPUT BAR */}
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-4">
          <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Configure New Merchant Payment Gateway</Label>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
            <div>
              <Input 
                className="h-11 rounded-xl bg-white border-slate-200 font-bold text-xs" 
                placeholder="Provider Name (e.g. MTN MoMo)" 
                value={newName} 
                onChange={e => setNewName(e.target.value)} 
              />
            </div>

            <div>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 font-bold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mobile Money" className="font-bold text-xs">Mobile Money</SelectItem>
                  <SelectItem value="Credit Card" className="font-bold text-xs">Credit Card</SelectItem>
                  <SelectItem value="Bank" className="font-bold text-xs">Bank Transfer</SelectItem>
                  <SelectItem value="Voucher" className="font-bold text-xs">Voucher</SelectItem>
                  <SelectItem value="Other" className="font-bold text-xs">Other Gateway</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Input 
                className="h-11 rounded-xl bg-white border-slate-200 font-bold text-xs" 
                placeholder="Region (e.g. Uganda / KE)" 
                value={newRegion} 
                onChange={e => setNewRegion(e.target.value)} 
              />
            </div>

            <div>
              <Input 
                className="h-11 rounded-xl bg-white border-slate-200 font-bold text-xs" 
                placeholder="Till # / Account Name" 
                value={newEntity} 
                onChange={e => setNewEntity(e.target.value)} 
              />
            </div>

            <div>
              <Input 
                className="h-11 rounded-xl bg-white border-slate-200 font-black uppercase text-xs" 
                placeholder={`Currency (${defaultCurrency})`} 
                value={newCurrency} 
                onChange={e => setNewCurrency(e.target.value)} 
              />
            </div>

            <div>
              <Button 
                onClick={() => addProviderMutation.mutate()} 
                disabled={addProviderMutation.isPending}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md uppercase text-xs"
              >
                {addProviderMutation.isPending ? <Loader2 className="animate-spin h-4 w-4 mx-auto" /> : <><Plus className="w-4 h-4 mr-1"/> Add Gateway</>}
              </Button>
            </div>
          </div>
        </div>

        {/* PROVIDERS LIST TABLE */}
        <div className="rounded-2xl border border-slate-100 overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-16 gap-2 text-slate-400 font-bold text-xs uppercase">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600"/> Synchronizing Payment Providers...
            </div>
          ) : (
            <ScrollArea className="w-full">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="h-12">
                    <TableHead className="pl-8 font-bold text-[10px] uppercase text-slate-500">Provider Name</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase text-slate-500">Channel Type</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase text-slate-500">Region</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase text-slate-500">Merchant Entity / Till</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase text-slate-500">Currency</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase text-slate-500 text-center">Status</TableHead>
                    <TableHead className="text-right pr-8 font-bold text-[10px] uppercase text-slate-500">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeProvidersList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-slate-400 font-bold text-xs uppercase">
                        No payment providers connected. Configure your receiving gateways above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    activeProvidersList.map(p => (
                      <TableRow key={p.id} className="h-16 hover:bg-slate-50/50">
                        <TableCell className="pl-8 font-bold text-slate-900 text-xs flex items-center gap-2">
                          <CreditCard size={16} className="text-blue-600" />
                          {p.name}
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-[9px] font-bold uppercase border-slate-200">{p.type}</Badge></TableCell>
                        <TableCell className="text-xs font-medium text-slate-600">{p.region || 'East Africa'}</TableCell>
                        <TableCell className="text-xs font-bold text-slate-800">{p.entity || 'Primary Merchant'}</TableCell>
                        <TableCell className="font-mono text-xs font-black text-blue-600 uppercase">{p.currency || defaultCurrency}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={cn("border-none text-[9px] font-bold uppercase px-3 py-1", p.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                            {p.active ? "ONLINE" : "OFFLINE"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            disabled={deleteProviderMutation.isPending}
                            onClick={() => removeProviderMutation.mutate(p.id)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4"/>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </div>

      </CardContent>
    </Card>
  );
}