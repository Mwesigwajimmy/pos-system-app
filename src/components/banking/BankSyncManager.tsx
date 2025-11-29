'use client';
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import toast from "react-hot-toast";

export function BankSyncManager({
  system,
  onSync,
  status,
}: {
  system: "sacco" | "lending";
  onSync: (credentials: { institution: string; endpoint: string; apiKey: string; country: string; currency: string; location: string }) => void;
  status?: string;
}) {
  const [institution, setInstitution] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [country, setCountry] = useState("UG");
  const [currency, setCurrency] = useState("UGX");
  const [location, setLocation] = useState("");
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await onSync({ institution, endpoint, apiKey, country, currency, location });
      toast.success("Bank/core integration triggered!");
    } catch (e: any) {
      toast.error(e.message || "Sync failed!");
    }
    setSyncing(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bank/Core Sync ({system.toUpperCase()})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          <Input placeholder="Institution" value={institution} onChange={e => setInstitution(e.target.value)} />
          <Input placeholder="API Endpoint" value={endpoint} onChange={e => setEndpoint(e.target.value)} />
          <Input placeholder="API Key (encrypted)" value={apiKey} onChange={e => setApiKey(e.target.value)} />
          <Input placeholder="Country (ISO)" value={country} onChange={e => setCountry(e.target.value)} />
          <Input placeholder="Currency" value={currency} onChange={e => setCurrency(e.target.value)} />
          <Input placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} />
          <Button onClick={handleSync} disabled={syncing || !institution || !endpoint || !apiKey}>
            {syncing ? "Syncing..." : "Sync"}
          </Button>
        </div>
        {status && <div className="text-xs text-muted-foreground mt-2">{status}</div>}
        <div className="text-xs text-primary mt-3">
          Supports multi-tenancy, global standards (ISO20022, PSD2/OpenBanking, local APIs); Handles cross-currency. Logs/integrates for both SACCO and Lending.
        </div>
      </CardContent>
    </Card>
  );
}