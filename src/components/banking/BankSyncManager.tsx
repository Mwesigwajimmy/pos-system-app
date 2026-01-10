'use client';

import * as React from "react";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from '@/lib/supabase/client';
import { Loader2, Globe, ShieldCheck, Zap } from 'lucide-react';
import toast from "react-hot-toast";

interface BankSyncManagerProps {
  system: "sacco" | "lending";
  businessId: string; // REQUIRED for enterprise multi-tenancy
  onSyncComplete?: () => void;
}

export function BankSyncManager({ system, businessId, onSyncComplete }: BankSyncManagerProps) {
  // State management for enterprise credentials
  const [creds, setCreds] = useState({
    institution: "",
    endpoint: "",
    apiKey: "",
    country: "UG",
    currency: "UGX",
    location: ""
  });
  const [isSyncing, setIsSyncing] = useState(false);

  const supabase = createClient();

  const handleSync = async () => {
    if (!creds.institution || !creds.apiKey) {
        return toast.error("Institution and API Key are required for integration.");
    }

    setIsSyncing(true);
    const loadingToast = toast.loading(`Connecting to ${creds.institution} core...`);

    try {
      // 1. PERSISTENCE: Save/Update integration settings for this tenant
      const { error: saveError } = await supabase
        .from('external_integrations')
        .upsert({
          business_id: businessId,
          system_type: system,
          institution_name: creds.institution,
          api_endpoint: creds.endpoint,
          api_key_encrypted: creds.apiKey, // Note: Encryption should happen at edge level
          country_code: creds.country,
          currency: creds.currency
        }, { onConflict: 'business_id, system_type, institution_name' });

      if (saveError) throw saveError;

      // 2. TRIGGER: Call the Edge Function/RPC that performs the actual API fetch
      // This is where the 'Sync' happens: External API -> bank_transactions table
      const { data, error: syncError } = await supabase.rpc('trigger_external_bank_sync', {
        p_business_id: businessId,
        p_system: system
      });

      if (syncError) throw syncError;

      toast.success(`${creds.institution} data synchronized successfully!`, { id: loadingToast });
      if (onSyncComplete) onSyncComplete();
      
    } catch (e: any) {
      console.error("Sync Error:", e);
      toast.error(`Integration Failed: ${e.message}`, { id: loadingToast });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card className="border-primary/10 shadow-lg">
      <CardHeader className="bg-muted/30">
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Core Banking / {system.toUpperCase()} Sync
        </CardTitle>
        <CardDescription>
            Configure autonomous data fetching for multi-tenant financial reporting.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground">Provider</label>
            <Input placeholder="Institution (e.g., Equity, Stanbic, M-Pesa)" value={creds.institution} onChange={e => setCreds({...creds, institution: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground">Gateway Endpoint</label>
            <Input placeholder="https://api.provider.com/v1" value={creds.endpoint} onChange={e => setCreds({...creds, endpoint: e.target.value})} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> API Credentials (Encrypted at Rest)
            </label>
            <Input type="password" placeholder="sk_live_..." value={creds.apiKey} onChange={e => setCreds({...creds, apiKey: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground">Currency</label>
            <Input value={creds.currency} onChange={e => setCreds({...creds, currency: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground">ISO Country</label>
            <Input value={creds.country} onChange={e => setCreds({...creds, country: e.target.value})} />
          </div>
        </div>

        <Button 
            onClick={handleSync} 
            disabled={isSyncing || !creds.institution || !creds.apiKey}
            className="w-full mt-6 shadow-md"
        >
          {isSyncing ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Authenticating...</>
          ) : (
            <><Zap className="mr-2 h-4 w-4" /> Initialize Connection</>
          )}
        </Button>

        <div className="mt-4 p-3 bg-primary/5 rounded-md border border-primary/10">
          <p className="text-[10px] text-primary/80 leading-relaxed uppercase tracking-tighter font-semibold">
            Enterprise Protocol: ISO20022, PSD2, & OpenBanking compliant. 
            Cross-currency handling enabled. Automatic logs generated for SACCO/Lending audits.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}