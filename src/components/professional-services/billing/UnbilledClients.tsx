'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Loader2, Zap, CheckCircle2 } from 'lucide-react';
import { createClient } from "@/lib/supabase/client";

export interface UnbilledClient {
    customer_id: string;
    client_name: string;
    unbilled_hours: number;
    unbilled_amount: number;
}

export function UnbilledClients({ clients, tenantId }: { clients: UnbilledClient[], tenantId: string }) {
    const router = useRouter();
    const [loadingClientId, setLoadingClientId] = useState<string | null>(null);

    const handleGenerate = async (client: UnbilledClient) => {
        setLoadingClientId(client.customer_id);
        const db = createClient();

        try {
            // 1. Execute Transactional RPC
            // This calls a Postgres function that groups unbilled hours, creates an invoice, 
            // creates invoice lines, and marks time entries as 'billed'.
            const { error } = await db.rpc('generate_invoice_from_unbilled', {
                p_tenant_id: tenantId,
                p_client_id: client.customer_id
            });

            if (error) throw error;

            // 2. User Feedback
            toast.success(`Invoice generated for ${client.client_name}`, { 
                icon: <CheckCircle2 className="text-green-500 h-5 w-5"/>,
                duration: 4000
            });

            // 3. Refresh Server Data
            // This triggers a re-fetch of the server components, removing the processed client from this list
            // and updating the Invoice list on the parent page without a full page reload.
            router.refresh();

        } catch (error: any) {
            console.error("Invoice Generation Error:", error);
            toast.error(error.message || "Failed to generate invoice. Please contact support.");
        } finally {
            setLoadingClientId(null);
        }
    };

    return (
        <Card className="h-full border-t-4 border-t-amber-500 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500"/> Unbilled Work
                </CardTitle>
                <CardDescription>
                    Clients with pending billable hours ready for invoicing.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {clients.length > 0 ? (
                    <div className="space-y-3">
                        {clients.map(client => (
                            <div 
                                key={client.customer_id} 
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors bg-white shadow-sm"
                            >
                                <div>
                                    <p className="font-semibold text-slate-800">{client.client_name}</p>
                                    <div className="flex gap-3 text-sm text-slate-500 mt-1 items-center">
                                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-mono text-xs">
                                            {client.unbilled_hours.toFixed(1)} hrs
                                        </span>
                                        <span className="text-slate-300">|</span>
                                        <span className="font-bold text-emerald-600">
                                            ${client.unbilled_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                        </span>
                                    </div>
                                </div>
                                <Button 
                                    size="sm" 
                                    onClick={() => handleGenerate(client)} 
                                    disabled={loadingClientId === client.customer_id}
                                    className="bg-slate-900 text-white hover:bg-slate-800 min-w-[140px]"
                                >
                                    {loadingClientId === client.customer_id ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Processing
                                        </>
                                    ) : (
                                        "Generate Invoice"
                                    )}
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg bg-slate-50/50">
                        <CheckCircle2 className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="font-medium text-slate-700">All caught up!</p>
                        <p className="text-sm">No unbilled time entries found for this period.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}