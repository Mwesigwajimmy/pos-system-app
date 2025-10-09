'use client';
import { useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';

// This function will download all data as a single JSON file.
// In a real enterprise app, you might use a library to convert this to an Excel workbook with multiple sheets.
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
            const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
            const link = document.createElement("a");
            link.href = jsonString;
            link.download = `ug-biz-suite_export_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            toast.success("Full data export successful!");
        },
        onError: (error: any) => toast.error(`Export failed: ${error.message}`),
    });

    return (
        <div className="container mx-auto py-6">
            <h1 className="text-3xl font-bold mb-6">Accountant Center</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Full Data Export</CardTitle>
                    <CardDescription>
                        Download a complete history of all sales, expenses, and financial transactions.
                        This is the one-stop shop for auditing and accounting purposes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                        <Download className="mr-2 h-4 w-4" />
                        {mutation.isPending ? "Exporting All Data..." : "Export Complete Ledger (JSON)"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}