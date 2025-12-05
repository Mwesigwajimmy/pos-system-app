import React from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { BankReconciliationTable } from '@/components/accounting/BankReconciliationTable';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// --- Data Fetching Functions ---

async function getBankAccounts(supabase: any, businessId: string) {
    const { data, error } = await supabase
        .from('accounting_accounts')
        .select('id, name, balance, currency, code')
        .eq('business_id', businessId)
        .eq('type', 'Bank')
        .eq('is_active', true)
        .order('name');
    
    if (error) {
        console.error("Failed to fetch bank accounts", error);
        return [];
    }
    return data;
}

async function getBankTransactions(supabase: any, accountId: string) {
    // Fetches raw bank statement lines that have been uploaded/imported but not yet reconciled
    const { data, error } = await supabase
        .from('accounting_bank_transactions')
        .select('*')
        .eq('account_id', accountId)
        .eq('status', 'unreconciled')
        .order('date', { ascending: false })
        .limit(500); // Production limit for performance

    if (error) {
        console.error("Failed to fetch bank transactions", error);
        return [];
    }
    return data;
}

async function getSystemTransactions(supabase: any, accountId: string) {
    // Fetches General Ledger lines hitting this bank account that are not yet marked as reconciled
    const { data, error } = await supabase
        .from('accounting_journal_lines')
        .select(`
            id, 
            description, 
            debit, 
            credit,
            created_at,
            journal_entry: accounting_journal_entries (
                date,
                reference
            )
        `)
        .eq('account_id', accountId)
        .is('reconciled_at', null)
        .order('created_at', { ascending: false })
        .limit(500);

    if (error) {
        console.error("Failed to fetch system transactions", error);
        return [];
    }

    // Normalize data structure for the frontend comparison table
    return data.map((line: any) => {
        const debit = Number(line.debit) || 0;
        const credit = Number(line.credit) || 0;
        
        // For a Bank Asset account: Debit = Increase (Positive), Credit = Decrease (Negative)
        const amount = debit - credit;

        return {
            id: line.id,
            date: line.journal_entry?.date || line.created_at,
            description: line.description || 'Ledger Entry',
            amount: amount,
            reference: line.journal_entry?.reference
        };
    });
}

// --- Main Page Component ---

export default async function BankingPage({ searchParams, params: { locale } }: { searchParams: { accountId?: string }, params: { locale: string } }) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // Auth & Tenancy Verification
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}/auth/login`);

    const { data: profile } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", user.id)
        .single();

    if (!profile?.business_id) return <div className="p-6 text-red-500">Unauthorized: No Business Profile found.</div>;

    // Load Data
    const bankAccounts = await getBankAccounts(supabase, profile.business_id);
    const selectedAccountId = searchParams.accountId || bankAccounts[0]?.id;
    const selectedAccount = bankAccounts.find((acc: any) => acc.id === selectedAccountId);

    let bankTransactions: any[] = [];
    let systemTransactions: any[] = [];

    if (selectedAccountId) {
        const [bTx, sTx] = await Promise.all([
            getBankTransactions(supabase, selectedAccountId),
            getSystemTransactions(supabase, selectedAccountId)
        ]);
        bankTransactions = bTx;
        systemTransactions = sTx;
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Banking</h2>
                    <p className="text-muted-foreground">
                        Reconciliation & Cash Flow Management
                    </p>
                </div>
            </div>

            {bankAccounts.length === 0 ? (
                 <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Bank Accounts Configured</AlertTitle>
                    <AlertDescription>
                        You must add a Bank Account in the Chart of Accounts before accessing this module.
                    </AlertDescription>
                </Alert>
            ) : (
                <div className="space-y-6">
                    {/* Account Switcher & Summary Card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg font-medium">Active Account</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                <div className="flex flex-wrap gap-2">
                                    {bankAccounts.map((acc: any) => (
                                        <a 
                                            key={acc.id} 
                                            href={`?accountId=${acc.id}`}
                                            className={`px-4 py-2 rounded-md text-sm font-medium border transition-all ${
                                                acc.id === selectedAccountId 
                                                ? 'bg-primary text-primary-foreground border-primary' 
                                                : 'bg-background hover:bg-muted text-foreground border-input'
                                            }`}
                                        >
                                            {acc.name}
                                            <span className="ml-2 opacity-70 font-mono text-xs">
                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: acc.currency }).format(acc.balance)}
                                            </span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Reconciliation Workspace */}
                    {selectedAccountId && (
                        <BankReconciliationTable 
                            bankTransactions={bankTransactions}
                            systemTransactions={systemTransactions}
                            businessId={profile.business_id}
                            bankAccountId={selectedAccountId}
                            userId={user.id}
                        />
                    )}
                </div>
            )}
        </div>
    );
}