'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BankStatementUploadComponent } from "@/components/telecom/financials/BankStatementUploadComponent";
import { BankReconciliationTable } from "@/components/accounting/BankReconciliationTable";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUp, RefreshCw, Loader2, AlertCircle, Database } from 'lucide-react';

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

// --- API FUNCTION: FULLY CONNECTED ---
// This function fetches the Absolute Truth for both sides of the reconciliation
async function fetchReconciliationData(accountId: string, businessId: string): Promise<ReconciliationData> {
    const supabase = createClient();
    
    // ENTERPRISE WIRING: Calling the Master RPC
    const { data, error } = await supabase.rpc('get_reconciliation_data', {
        p_account_id: accountId,
        p_business_id: businessId
    });
    
    if (error) throw new Error(error.message);

    return {
        // Map backend keys to frontend interface names
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
    // TRACKING STATE: In enterprise systems, we track if the user has triggered a 'Sync' session
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');

    // THE ENGINE: React Query fetches Absolute Truth from the DB
    const { data, isLoading, isError, error, refetch } = useQuery<ReconciliationData>({
        queryKey: ['reconciliationData', selectedAccountId, businessId],
        queryFn: () => fetchReconciliationData(selectedAccountId, businessId),
        // Enabled immediately if session is active or as a preview
        enabled: !!selectedAccountId,
        refetchOnWindowFocus: false
    });

    // FIXED: Handler now matches '() => void' signature to pass build linter
    const handleUploadSuccess = () => {
        setIsSessionActive(true);
        // We trigger a refetch so the bank transactions just uploaded to the DB 
        // flood into the UI immediately.
        refetch();
    };

    const handleReset = () => {
        setIsSessionActive(false);
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Financial Reconciliation Center</h1>
                    <p className="text-muted-foreground mt-1">
                        Enterprise-grade synchronization for internal and external records.
                    </p>
                </div>
                
                <div className="flex items-center gap-2">
                    <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                        <SelectTrigger className="w-[250px] shadow-sm">
                            <SelectValue placeholder="Select Bank Account" />
                        </SelectTrigger>
                        <SelectContent>
                            {accounts.map(acc => (
                                <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {isSessionActive && (
                        <Button onClick={handleReset} variant="outline" size="sm">
                            <RefreshCw className="mr-2 h-4 w-4" /> Switch Account
                        </Button>
                    )}
                </div>
            </header>

            {!selectedAccountId ? (
                <div className="p-12 text-center border-2 border-dashed rounded-lg bg-muted/30">
                    <Database className="mx-auto h-12 w-12 text-muted-foreground/20 mb-4" />
                    <p className="text-lg font-semibold">No Financial Source Selected</p>
                    <p className="text-sm text-muted-foreground">Select an account from the dashboard to initialize reconciliation.</p>
                </div>
            ) : !isSessionActive ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-1 border-primary/10 shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center text-primary text-lg">
                                <FileUp className="mr-2 h-5 w-5" /> 1. Upload Statement
                            </CardTitle>
                            <CardDescription>
                                Import external data for <strong>{accounts.find(a => a.id === selectedAccountId)?.name}</strong>.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* onSuccess is now a perfect match for the component signature */}
                            <BankStatementUploadComponent onSuccess={handleUploadSuccess} />
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-2 bg-muted/10 border-dashed border-2">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Internal Ledger Preview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-4xl font-black font-mono">
                                        {data?.internal_transactions?.length || 0}
                                    </p>
                                    <p className="text-xs font-bold uppercase text-muted-foreground">Unmatched System Transactions</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <Card className="shadow-2xl border-primary/5">
                    <CardHeader className="bg-muted/40 border-b">
                        <CardTitle>Step 2: Absolute Truth Matching</CardTitle>
                        <CardDescription>
                            Validating external bank records against internal ledger entries.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {isLoading ? (
                            <div className="py-20 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
                        ) : isError ? (
                            <div className="p-4 bg-destructive/10 text-destructive rounded-md flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" /> {error.message}
                            </div>
                        ) : (
                            <BankReconciliationTable
                                bankTransactions={data?.bank_transactions || []}
                                systemTransactions={data?.internal_transactions || []}
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