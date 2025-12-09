'use client';

import * as React from "react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger 
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { 
  Copy, Eye, EyeOff, Globe, Server, RefreshCw, Terminal, AlertTriangle, Check, Webhook, Activity 
} from "lucide-react";

// --- Enterprise Types ---

interface ApiCredential {
  id: string;
  client_id: string; // Public
  client_secret_hint: string; // Masked
  environment: 'SANDBOX' | 'PRODUCTION';
  status: 'ACTIVE' | 'REVOKED';
  created_at: string;
  last_used_at: string | null;
  scopes: string[];
  rate_limit: number;
}

interface WebhookConfig {
  url: string;
  secret: string;
  events: string[]; // ['loan.approved', 'payment.received']
  status: 'ACTIVE' | 'PAUSED';
}

interface ApiUsageStats {
  total_requests_24h: number;
  success_rate: number;
  avg_latency_ms: number;
}

// --- Fetchers ---

async function fetchApiDetails(tenantId: string) {
  const supabase = createClient();
  
  // 1. Get Credentials
  const { data: creds, error: credError } = await supabase
    .from('api_credentials')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();

  // 2. Get Webhook Config
  const { data: webhook } = await supabase
    .from('api_webhooks')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();
    
  // 3. Mock Usage Stats (Real app would query Logs/Analytics DB)
  const stats: ApiUsageStats = {
      total_requests_24h: 1240,
      success_rate: 99.8,
      avg_latency_ms: 45
  };

  if (credError) {
      // Return default/empty state if first time
      return null;
  }

  return { credential: creds as ApiCredential, webhook: webhook as WebhookConfig | null, stats };
}

async function revealSecret(tenantId: string) {
    const supabase = createClient();
    // RPC call that logs "Secret Accessed" audit trail before returning the plaintext secret
    const { data, error } = await supabase.rpc('reveal_api_secret', { p_tenant_id: tenantId });
    if (error) throw new Error(error.message);
    return data as string; // The actual secret
}

async function rotateSecret(tenantId: string) {
    const supabase = createClient();
    // RPC that revokes old keys and generates new secure random keys
    const { data, error } = await supabase.rpc('rotate_api_keys', { p_tenant_id: tenantId });
    if (error) throw new Error(error.message);
    return data as { client_id: string, client_secret: string };
}

async function updateWebhook({ tenantId, url, events }: { tenantId: string, url: string, events: string[] }) {
    const supabase = createClient();
    const { error } = await supabase.from('api_webhooks').upsert({
        tenant_id: tenantId,
        url,
        events,
        status: 'ACTIVE',
        updated_at: new Date().toISOString()
    });
    if (error) throw new Error(error.message);
}

// --- Component ---

export function OpenAPIGatewayPanel({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient();
  const [showSecret, setShowSecret] = useState(false);
  const [rawSecret, setRawSecret] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);

  // Queries
  const { data, isLoading } = useQuery({
      queryKey: ['api-settings', tenantId],
      queryFn: () => fetchApiDetails(tenantId)
  });

  // Mutations
  const revealMutation = useMutation({
      mutationFn: () => revealSecret(tenantId),
      onSuccess: (secret) => setRawSecret(secret),
      onError: (e) => toast.error("Access Denied: " + e.message)
  });

  const rotateMutation = useMutation({
      mutationFn: () => rotateSecret(tenantId),
      onSuccess: () => {
          toast.success("Keys rotated successfully");
          setIsRotating(false);
          setRawSecret(null); // Clear old displayed secret
          setShowSecret(false);
          queryClient.invalidateQueries({ queryKey: ['api-settings', tenantId] });
      },
      onError: (e: Error) => toast.error(e.message)
  });

  const webhookMutation = useMutation({
      mutationFn: (vals: { url: string, events: string[] }) => updateWebhook({ tenantId, ...vals }),
      onSuccess: () => toast.success("Webhook configuration saved")
  });

  // UI Handlers
  const handleToggleSecret = () => {
      if (showSecret) {
          setShowSecret(false);
          setRawSecret(null);
      } else {
          setShowSecret(true);
          revealMutation.mutate();
      }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const generateCurl = (clientId: string) => `curl -X GET https://api.sacco.network/v1/loans \\
  -H "Authorization: Basic ${btoa(`${clientId}:<YOUR_CLIENT_SECRET>`)}" \\
  -H "Content-Type: application/json"`;

  if (isLoading) return <div className="p-8 flex justify-center"><RefreshCw className="animate-spin h-8 w-8 text-slate-400"/></div>;

  const creds = data?.credential;
  const stats = data?.stats;

  return (
    <div className="space-y-6">
        
        {/* 1. Header & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-2 border-l-4 border-l-blue-600">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Server className="h-5 w-5 text-blue-600" />
                        <CardTitle>Open Banking Gateway</CardTitle>
                    </div>
                    <CardDescription>
                        Secure REST API endpoints for Mobile App, Core Banking, and Regulator integration.
                    </CardDescription>
                </CardHeader>
            </Card>
            
            <Card className="bg-slate-50 border-slate-200">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-600 flex items-center gap-2"><Activity className="h-4 w-4"/> API Health</span>
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">Operational</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                            <p className="text-2xl font-bold">{stats?.total_requests_24h.toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground">Requests (24h)</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-600">{stats?.success_rate}%</p>
                            <p className="text-[10px] text-muted-foreground">Success Rate</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* 2. Main Config Tabs */}
        <Tabs defaultValue="credentials" className="w-full">
            <TabsList>
                <TabsTrigger value="credentials">Credentials</TabsTrigger>
                <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
                <TabsTrigger value="docs">Integration Guide</TabsTrigger>
            </TabsList>

            {/* --- Credentials Tab --- */}
            <TabsContent value="credentials" className="mt-4 space-y-4">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between">
                            <div>
                                <CardTitle>Client Credentials</CardTitle>
                                <CardDescription>Use these keys to authenticate your backend services.</CardDescription>
                            </div>
                            {creds && (
                                <Dialog open={isRotating} onOpenChange={setIsRotating}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                            <RefreshCw className="mr-2 h-4 w-4"/> Rotate Keys
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle className="flex items-center gap-2 text-red-600"><AlertTriangle className="h-5 w-5"/> Rotate API Keys?</DialogTitle>
                                            <DialogDescription>
                                                This will <strong>immediately revoke</strong> the old Client Secret. 
                                                Any running services using the old key will fail until updated.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <DialogFooter>
                                            <Button variant="ghost" onClick={() => setIsRotating(false)}>Cancel</Button>
                                            <Button variant="destructive" onClick={() => rotateMutation.mutate()}>Confirm Rotation</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!creds ? (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground mb-4">No active credentials found.</p>
                                <Button onClick={() => rotateMutation.mutate()}>Generate Keys</Button>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <Label>Client ID (Public)</Label>
                                    <div className="flex gap-2">
                                        <Input value={creds.client_id} readOnly className="font-mono bg-slate-50" />
                                        <Button variant="ghost" size="icon" onClick={() => handleCopy(creds.client_id)}>
                                            <Copy className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Client Secret (Private)</Label>
                                    <div className="flex gap-2">
                                        <Input 
                                            type={showSecret ? "text" : "password"} 
                                            value={rawSecret || "••••••••••••••••••••••••••••••••"} 
                                            readOnly 
                                            className="font-mono bg-slate-50" 
                                        />
                                        <Button variant="outline" size="icon" onClick={handleToggleSecret}>
                                            {showSecret ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleCopy(rawSecret || "")} disabled={!rawSecret}>
                                            <Copy className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3 text-amber-500"/> Never share this secret in client-side code or public repos.
                                    </p>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            {/* --- Webhooks Tab --- */}
            <TabsContent value="webhooks" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Webhook className="h-5 w-5"/> Webhook Configuration</CardTitle>
                        <CardDescription>Receive real-time JSON payloads when events occur.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form 
                            onSubmit={(e) => {
                                e.preventDefault();
                                const form = e.target as HTMLFormElement;
                                webhookMutation.mutate({
                                    url: (form.elements.namedItem('url') as HTMLInputElement).value,
                                    events: ['loan.disbursed', 'repayment.success'] // Mock selection
                                });
                            }} 
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                                <Label>Callback URL</Label>
                                <div className="flex gap-2">
                                    <Globe className="h-10 w-10 p-2 bg-slate-100 rounded border text-slate-500"/>
                                    <Input 
                                        name="url" 
                                        defaultValue={data?.webhook?.url} 
                                        placeholder="https://your-backend.com/webhooks/sacco" 
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Signing Secret</Label>
                                <Input value={data?.webhook?.secret || "whsec_..."} readOnly disabled className="bg-slate-50" />
                                <p className="text-[10px] text-muted-foreground">Used to verify the `X-Sacco-Signature` header.</p>
                            </div>

                            <div className="pt-2">
                                <Button type="submit" disabled={webhookMutation.isPending}>
                                    {webhookMutation.isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin"/>}
                                    Save Endpoint
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* --- Docs Tab --- */}
            <TabsContent value="docs" className="mt-4">
                <Card className="bg-slate-900 text-slate-100 border-none">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Terminal className="h-5 w-5 text-green-400"/> Quick Start
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <p className="text-sm font-medium mb-2 text-slate-300">Authentication (Header)</p>
                            <pre className="bg-black/50 p-4 rounded-md font-mono text-xs overflow-x-auto border border-slate-700">
                                <code className="text-green-300">Authorization: Basic base64(client_id:client_secret)</code>
                            </pre>
                        </div>
                        
                        <div>
                            <p className="text-sm font-medium mb-2 text-slate-300">Example Request (List Loans)</p>
                            <pre className="bg-black/50 p-4 rounded-md font-mono text-xs overflow-x-auto border border-slate-700">
                                {creds ? generateCurl(creds.client_id) : "# Generate keys first to see example"}
                            </pre>
                        </div>

                        <div className="flex gap-4 pt-2">
                            <Button variant="secondary" size="sm" onClick={() => window.open('/docs/api', '_blank')}>
                                View Full API Reference
                            </Button>
                            <Button variant="outline" size="sm" className="bg-transparent border-slate-600 text-slate-300 hover:bg-slate-800">
                                Download Postman Collection
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}