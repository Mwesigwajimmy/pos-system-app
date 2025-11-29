'use client';

import * as React from "react";
import { useState } from "react";
import toast from "react-hot-toast";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Server, RefreshCw, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";

export function CoreSwitchSyncPanel({ tenantId }: { tenantId: string }) {
  const [host, setHost] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [showKey, setShowKey] = useState(false);

  const handleSync = async () => {
    if (!host || !apiKey) {
        toast.error("Endpoint and API Key are required");
        return;
    }

    setStatus("SYNCING");
    try {
      // Simulate secure handshake
      await new Promise(r => setTimeout(r, 2000));
      
      // In real scenario: call backend API route that talks to HLR/HSS
      // const res = await fetch('/api/telecom/sync-switch', { ... })
      
      setStatus("SUCCESS");
      toast.success('Core switch synchronization complete');
    } catch (e: any) {
      setStatus("ERROR");
      toast.error("Connection timed out or refused");
    }
  };

  return (
    <Card className="border-t-4 border-t-cyan-600 shadow-sm">
      <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5 text-cyan-600"/> Core Network Sync
          </CardTitle>
          <CardDescription>Manage connectivity with HLR, HSS, and SMSC gateways.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        <div className="space-y-2">
            <label className="text-sm font-medium">Switch / Gateway Endpoint</label>
            <Input 
                placeholder="e.g. https://hlr-gateway.telecom.net/api/v2" 
                value={host} 
                onChange={e => setHost(e.target.value)}
                className="font-mono text-sm"
            />
        </div>

        <div className="space-y-2">
            <label className="text-sm font-medium">Authentication Token</label>
            <div className="relative">
                <Input 
                    type={showKey ? "text" : "password"}
                    placeholder="Enter secure API key" 
                    value={apiKey} 
                    onChange={e => setApiKey(e.target.value)}
                    className="pr-10"
                />
                <button 
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                    {showKey ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
            </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
                {status === 'SYNCING' && <><Loader2 className="w-4 h-4 animate-spin text-blue-500"/> Syncing...</>}
                {status === 'SUCCESS' && <><CheckCircle2 className="w-4 h-4 text-green-500"/> Connected & Synced</>}
                {status === 'ERROR' && <><XCircle className="w-4 h-4 text-red-500"/> Connection Failed</>}
                {status === 'IDLE' && <span className="text-muted-foreground">Ready to sync</span>}
            </div>
            
            <Button 
                onClick={handleSync} 
                disabled={status === 'SYNCING' || !host || !apiKey}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
                {status === 'SYNCING' ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <RefreshCw className="w-4 h-4 mr-2"/>}
                Sync Now
            </Button>
        </div>

      </CardContent>
    </Card>
  );
}