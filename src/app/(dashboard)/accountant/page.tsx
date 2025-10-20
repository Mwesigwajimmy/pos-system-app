// src/app/(dashboard)/accountant/page.tsx
'use client';

import { useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

// This function calls the powerful backend RPC to get all data.
async function fetchAllDataForExport() {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_accountant_export_data');
    if (error) throw new Error(error.message);
    return data;
}

export default function AccountantPage() {
    const mutation = useMutation({
        mutationFn: fetchAllDataForExport,
        onSuccess: (data) => {
            // This logic converts the JSON data into a downloadable file.
            const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
            const link = document.createElement("a");
            link.href = jsonString;
            link.download = `ug-biz-suite_export_${new Date().toISOString().split('T')[0]}.json`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            toast.success("Full data export successful!");
        },
        onError: (error: Error) => toast.error(`Export failed: ${error.message}`),
    });

    return (
        <div className="container mx-auto py-6">
            <h1 className="text-3xl font-bold mb-6">Accountant Center</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Full Data Export</CardTitle>
                    <CardDescription>
                        Download a complete, machine-readable history of all sales, expenses, and financial transactions.
                        This is the primary tool for auditing, migrating, or providing data to external accounting systems.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                        {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        {mutation.isPending ? "Compiling All Data..." : "Export Complete General Ledger (JSON)"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}