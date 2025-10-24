'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { generateInvoiceFromTimeEntries } from '@/lib/professional-services/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export interface UnbilledClient {
    customer_id: string;
    client_name: string;
    unbilled_hours: number;
    unbilled_amount: number;
}

export function UnbilledClients({ clients }: { clients: UnbilledClient[] }) {
    const { toast } = useToast();
    const [loadingClientId, setLoadingClientId] = useState<string | null>(null);

    const handleGenerate = async (client: UnbilledClient) => {
        setLoadingClientId(client.customer_id);
        const result = await generateInvoiceFromTimeEntries(client.customer_id);
        if (result.success) {
            toast({ title: "Success!", description: result.message });
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
        setLoadingClientId(null);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Unbilled Work by Client</CardTitle>
                <CardDescription>Generate invoices for clients with unbilled time entries.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {clients.length > 0 ? (
                    clients.map(client => (
                        <div key={client.customer_id} className="flex items-center justify-between p-3 border rounded-md">
                            <div>
                                <p className="font-semibold">{client.client_name}</p>
                                <p className="text-sm text-muted-foreground">{client.unbilled_hours.toFixed(1)} unbilled hours (${client.unbilled_amount.toFixed(2)})</p>
                            </div>
                            <Button size="sm" onClick={() => handleGenerate(client)} disabled={loadingClientId === client.customer_id}>
                                {loadingClientId === client.customer_id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Generate Invoice
                            </Button>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-muted-foreground py-10">No clients with unbilled time.</p>
                )}
            </CardContent>
        </Card>
    );
}