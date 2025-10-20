'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BankStatementUploadComponent } from "@/components/telecom/financials/BankStatementUploadComponent";
import { BankReconciliationTable } from "@/components/accounting/BankReconciliationTable";
import { Button } from "@/components/ui/button";
import { FileUp, RefreshCw, Loader2, AlertCircle } from 'lucide-react';

// --- TYPES ---
// Ensure the internal transaction type matches the expected prop in BankReconciliationTable
interface BankTransaction { id: string; date: string; description: string; amount: number; }
interface SystemTransaction { id: string; date: string; description: string; amount: number; }
interface ReconciliationData { bank_transactions: BankTransaction[]; internal_transactions: SystemTransaction[]; }

// --- API FUNCTION ---
async function fetchReconciliationData(): Promise<ReconciliationData> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_reconciliation_data');
    if (error) throw new Error(error.message);

    // Map transaction_date to date for both sets
    return {
        bank_transactions: (data.bank_transactions || []).map((t: any) => ({
            ...t,
            date: t.transaction_date // remap for expected type
        })),
        internal_transactions: (data.internal_transactions || []).map((t: any) => ({
            ...t,
            date: t.transaction_date // remap for expected type
        }))
    };
}

export default function ReconciliationPage() {
    const [isStatementUploaded, setIsStatementUploaded] = useState(false);

    const { data, isLoading, isError, error, refetch } = useQuery<ReconciliationData>({
        queryKey: ['reconciliationData'],
        queryFn: fetchReconciliationData,
        enabled: isStatementUploaded,
    });

    const handleUploadSuccess = () => {
        setIsStatementUploaded(true);
        refetch();
    };

    const handleReset = () => {
        setIsStatementUploaded(false);
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <header className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold">Bank Reconciliation Center</h1>
                    <p className="text-muted-foreground mt-1">
                        Match your bank statements with your internal records to ensure perfect accuracy.
                    </p>
                </div>
                {isStatementUploaded && (
                    <Button onClick={handleReset} variant="outline">
                        <RefreshCw className="mr-2 h-4 w-4" /> Start New Reconciliation
                    </Button>
                )}
            </header>

            {!isStatementUploaded ? (
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle className="flex items-center"><FileUp className="mr-2" /> Step 1: Upload Statement</CardTitle>
                        <CardDescription>
                            Upload your bank statement. The system will automatically parse and add it to the bank transaction list.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <BankStatementUploadComponent onSuccess={handleUploadSuccess} />
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Step 2: Match Transactions</CardTitle>
                        <CardDescription>
                            Review, select, and match transactions from your bank statement with your system records.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading && <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>}
                        {isError && (
                            <div className="text-destructive p-4 bg-destructive/10 rounded-md flex items-center">
                                <AlertCircle className="mr-2 h-4 w-4"/>
                                <p>Error loading data: {error.message}</p>
                            </div>
                        )}
                        {data && (
                            <BankReconciliationTable
                                bankTransactions={data.bank_transactions}
                                systemTransactions={data.internal_transactions}
                            />
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}