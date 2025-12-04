"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Landmark, ArrowUpRight, ArrowDownLeft, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// --- Enterprise Types ---
// In a real system, we map the GL line to a readable transaction
interface TrustTransaction {
  id: string;
  transaction_date: string;
  reference_no: string;
  description: string;
  transaction_type: 'deposit' | 'withdrawal';
  amount: number;
  entity_name: string; // The Client or Payee
}

interface Props {
  tenantId: string;
  initialTransactions?: TrustTransaction[];
}

export default function TrustAccountingManager({ tenantId, initialTransactions = [] }: Props) {
  const [transactions, setTransactions] = useState<TrustTransaction[]>(initialTransactions);
  const [loading, setLoading] = useState(initialTransactions.length === 0);
  const [trustBalance, setTrustBalance] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    // If we have initial data (SSR), calculate balance and skip fetch
    if (initialTransactions.length > 0) {
      const balance = initialTransactions.reduce((acc, curr) => {
        return curr.transaction_type === 'deposit' ? acc + curr.amount : acc - curr.amount;
      }, 0);
      setTrustBalance(balance);
      setLoading(false);
      return;
    }

    const fetchRealGLData = async () => {
      try {
        setLoading(true);

        // STEP 1: Find the "Trust Liability" Account ID from the Chart of Accounts
        // In a real app, this might be stored in a 'system_settings' table or found by code/type
        const { data: accountData, error: accountError } = await supabase
          .from('accounts')
          .select('id')
          .eq('tenant_id', tenantId)
          .ilike('name', '%Trust%') // Searching for "Client Trust Funds" or similar
          .in('type', ['liability', 'LIABILITY']) // Trust funds are a Liability (we owe them to the client)
          .limit(1)
          .single();

        if (accountError || !accountData) {
          throw new Error("Trust Liability Account not configured in Chart of Accounts.");
        }

        const trustAccountId = accountData.id;

        // STEP 2: Query the General Ledger (Journal Entry Lines) for this Account
        // This is the "Single Source of Truth" in enterprise accounting
        const { data: glLines, error: glError } = await supabase
          .from('journal_entry_lines')
          .select(`
            id,
            debit,
            credit,
            description,
            journal_entries!inner (
              date,
              reference,
              description,
              entity_name 
            )
          `)
          .eq('tenant_id', tenantId)
          .eq('account_id', trustAccountId)
          .order('journal_entries(date)', { ascending: false });

        if (glError) throw glError;

        // STEP 3: Transform GL Lines into Trust Transactions
        // Accounting Rule: For Liability Accounts:
        // CREDIT = Increase (Deposit/Inflow)
        // DEBIT  = Decrease (Withdrawal/Outflow)
        const mappedTransactions: TrustTransaction[] = glLines.map((line: any) => {
          const isDeposit = line.credit > 0;
          
          return {
            id: line.id,
            transaction_date: line.journal_entries.date,
            reference_no: line.journal_entries.reference,
            // Prefer line description, fallback to header description
            description: line.description || line.journal_entries.description, 
            // In a real schema, 'entity_name' (Client) is usually on the Journal Header
            entity_name: line.journal_entries.entity_name || 'Unknown Client',
            transaction_type: isDeposit ? 'deposit' : 'withdrawal',
            amount: isDeposit ? line.credit : line.debit
          };
        });

        // Calculate running balance
        const totalBalance = mappedTransactions.reduce((acc, curr) => {
          return curr.transaction_type === 'deposit' ? acc + curr.amount : acc - curr.amount;
        }, 0);

        setTransactions(mappedTransactions);
        setTrustBalance(totalBalance);
      } catch (err: any) {
        console.error("Trust Accounting Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRealGLData();
  }, [tenantId, supabase, initialTransactions]);

  if (error) {
    return (
      <Card className="border-red-500">
        <CardContent className="pt-6 flex items-center gap-4 text-red-600">
          <AlertCircle className="h-8 w-8" />
          <div>
            <h3 className="font-bold">Configuration Error</h3>
            <p>{error}</p>
            <p className="text-sm text-slate-500 mt-1">Please ensure a Liability account named "Client Trust Funds" exists in the Chart of Accounts.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900 text-white border-slate-800 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Trust Liability</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
               <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
            ) : (
              <>
                <div className="text-2xl font-bold flex items-center gap-2 font-mono">
                  <Landmark className="h-5 w-5 text-emerald-400" />
                  ${trustBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-slate-400 mt-1">Funds currently held in escrow</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ledger Table */}
      <Card className="border-t-4 border-t-emerald-600">
        <CardHeader>
          <CardTitle>Trust Ledger</CardTitle>
          <CardDescription>Real-time view of the General Ledger (GL) for Client Trust Funds.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" /></div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Client / Entity</TableHead>
                    <TableHead>Transaction</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Credit (In)</TableHead>
                    <TableHead className="text-right">Debit (Out)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No GL entries found for Trust Accounts.</TableCell></TableRow>
                  ) : (
                    transactions.map((tx) => (
                      <TableRow key={tx.id} className="hover:bg-slate-50">
                        <TableCell className="text-xs font-medium">{new Date(tx.transaction_date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium text-slate-700">{tx.entity_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={tx.transaction_type === 'deposit' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-700 border-slate-200'}>
                            {tx.transaction_type === 'deposit' ? <ArrowDownLeft className="w-3 h-3 mr-1"/> : <ArrowUpRight className="w-3 h-3 mr-1"/>}
                            {tx.transaction_type === 'deposit' ? 'DEPOSIT' : 'DISBURSEMENT'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{tx.reference_no}</TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-[200px] truncate">{tx.description}</TableCell>
                        
                        {/* Accounting View: Credit Column */}
                        <TableCell className="text-right font-mono text-sm">
                          {tx.transaction_type === 'deposit' 
                            ? <span className="text-green-700 font-bold">{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            : <span className="text-slate-200">-</span>
                          }
                        </TableCell>
                        
                        {/* Accounting View: Debit Column */}
                        <TableCell className="text-right font-mono text-sm">
                          {tx.transaction_type === 'withdrawal' 
                            ? <span className="text-red-600 font-bold">{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            : <span className="text-slate-200">-</span>
                          }
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}