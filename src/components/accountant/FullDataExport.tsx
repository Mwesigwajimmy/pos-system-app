'use client';

import { useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

async function fetchAllDataForExport() {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_accountant_export_data');
    if (error) throw new Error(error.message);
    return data;
}

export function FullDataExport() {
    const mutation = useMutation({
        mutationFn: fetchAllDataForExport,
        onSuccess: (data) => {
            const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
            const link = document.createElement("a");
            link.href = jsonString;
            link.download = `bbu1_export_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Full data export successful!");
        },
        onError: (error: Error) => toast.error(`Export failed: ${error.message}`),
    });

    return (
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} size="lg">
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {mutation.isPending ? "Compiling All Data..." : "Export Complete General Ledger (JSON)"}
        </Button>
    );
}