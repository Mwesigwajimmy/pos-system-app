'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BankStatementUploadComponent } from "@/components/telecom/financials/BankStatementUploadComponent";
import { BankReconciliationTable } from "@/components/accounting/BankReconciliationTable";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUp, RefreshCw, Loader2, AlertCircle } from 'lucide-react';

// --- TYPES ---
interface BankTransaction { id: string; date: string; description: string; amount: number; }
interface SystemTransaction { id: string; date: string; description: string; amount: number; }
interface ReconciliationData { bank_transactions: BankTransaction[]; internal_transactions: SystemTransaction[]; }

interface Account {
    id: string;
    name: string;
}

interface ReconciliationClientProps {
    userId: string;
    businessId: string;
    accounts: Account[];
}

// --- API FUNCTION ---
async function fetchReconciliationData(): Promise<ReconciliationData> {
    const supabase = createClient();
    // Note: In a real scenario, you might want to pass account_id to this RPC
    const { data, error } = await supabase.rpc('get_reconciliation_data');
    if (error) throw new Error(error.message);

    return {
        bank_transactions: (data.bank_transactions || []).map((t: any) => ({
            ...t,
            date: t.transaction_date 
        })),
        internal_transactions: (data.internal_transactions || []).map((t: any) => ({
            ...t,
            date: t.transaction_date
        }))
    };
}

export default function ReconciliationClient({ userId, businessId, accounts }: ReconciliationClientProps) {
    const [isStatementUploaded, setIsStatementUploaded] = useState(false);
    // Automatically select the first account if available
    const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');

    const { data, isLoading, isError, error, refetch } = useQuery<ReconciliationData>({
        queryKey: ['reconciliationData', selectedAccountId],
        queryFn: fetchReconciliationData,
        enabled: isStatementUploaded && !!selectedAccountId,
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
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Bank Reconciliation Center</h1>
                    <p className="text-muted-foreground mt-1">
                        Match your bank statements with your internal records.
                    </p>
                </div>
                
                <div className="flex items-center gap-2">
                    {/* Account Selector is needed to provide bankAccountId */}
                    <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select Bank Account" />
                        </SelectTrigger>
                        <SelectContent>
                            {accounts.map(acc => (
                                <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {isStatementUploaded && (
                        <Button onClick={handleReset} variant="outline">
                            <RefreshCw className="mr-2 h-4 w-4" /> Reset
                        </Button>
                    )}
                </div>
            </header>

            {!selectedAccountId ? (
                <div className="p-8 text-center border rounded-md bg-muted text-muted-foreground">
                    Please select a Bank Account to proceed with reconciliation.
                </div>
            ) : !isStatementUploaded ? (
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle className="flex items-center"><FileUp className="mr-2" /> Step 1: Upload Statement</CardTitle>
                        <CardDescription>
                            Upload your bank statement for <strong>{accounts.find(a => a.id === selectedAccountId)?.name}</strong>.
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
                            Review matches for <strong>{accounts.find(a => a.id === selectedAccountId)?.name}</strong>.
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
                            /* FIX: Passing all required props here */
                            <BankReconciliationTable
                                bankTransactions={data.bank_transactions}
                                systemTransactions={data.internal_transactions}
                                businessId={businessId}
                                userId={userId}
                                bankAccountId={selectedAccountId}
                            />
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}