// src/components/compliance/BankReconciliation.tsx
'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// --- TYPES (Aligned with UUIDs and Absolute Truth Schema) ---
interface Transaction {
  id: string; // UUID
  transaction_date: string;
  description: string;
  amount: number;
}

interface BankReconciliationProps {
  businessId: string; // Passed from the page/auth context
  accountId: string;  // The specific bank account (e.g., grace Olet ID)
}

// --- API FUNCTIONS (Fully Connected) ---
async function fetchEnterpriseReconciliation(businessId: string, accountId: string) {
  const supabase = createClient();
  // Using the Master RPC we verified earlier
  const { data, error } = await supabase.rpc('get_reconciliation_data', { 
    p_business_id: businessId,
    p_account_id: accountId 
  });
  if (error) throw new Error(error.message);
  return data;
}

async function matchTransactionsBulk(vars: { bankIds: string[], systemIds: string[] }) {
  const supabase = createClient();
  // Using the bulk matcher we established for enterprise performance
  const { error } = await supabase.rpc('match_transactions_bulk', {
    p_bank_transaction_ids: vars.bankIds,
    p_internal_transaction_ids: vars.systemIds,
  });
  if (error) throw new Error(error.message);
}

// --- SUB-COMPONENT: LIST ITEM ---
const TransactionItem = ({ tx, onSelect, isSelected }: { tx: Transaction, onSelect: () => void, isSelected: boolean }) => (
  <div 
    onClick={onSelect}
    className={`p-4 border-b cursor-pointer transition-all hover:bg-muted/50 ${
      isSelected ? 'bg-primary/10 border-l-4 border-primary shadow-inner' : ''
    }`}
  >
    <div className="flex justify-between items-start">
      <div className="space-y-1">
        <p className="font-semibold text-sm leading-none">{tx.description}</p>
        <p className="text-xs text-muted-foreground">{new Date(tx.transaction_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
      </div>
      <p className={`font-mono text-sm font-bold ${tx.amount < 0 ? 'text-destructive' : 'text-green-600'}`}>
        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'UGX' }).format(tx.amount)}
      </p>
    </div>
  </div>
);

export default function BankReconciliation({ businessId, accountId }: BankReconciliationProps) {
  const queryClient = useQueryClient();
  const [selectedBankTxId, setSelectedBankTxId] = useState<string | null>(null);
  const [selectedSystemTxId, setSelectedSystemTxId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['reconciliation', businessId, accountId],
    queryFn: () => fetchEnterpriseReconciliation(businessId, accountId),
    enabled: !!businessId && !!accountId
  });
  
  const mutation = useMutation({
    mutationFn: matchTransactionsBulk,
    onSuccess: () => {
      toast.success('System and Bank records matched perfectly!');
      queryClient.invalidateQueries({ queryKey: ['reconciliation'] });
      setSelectedBankTxId(null);
      setSelectedSystemTxId(null);
    },
    onError: (err: any) => toast.error(`Matching failed: ${err.message}`)
  });

  const handleMatch = () => {
    if (selectedBankTxId && selectedSystemTxId) {
      mutation.mutate({ 
        bankIds: [selectedBankTxId], 
        systemIds: [selectedSystemTxId] 
      });
    }
  };
  
  return (
    <Card className="shadow-lg border-primary/10">
      <Toaster position="top-right" />
      <CardHeader className="border-b bg-muted/20">
        <CardTitle className="text-2xl flex items-center gap-2">
          Bank Reconciliation Engine
          {mutation.isPending && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
        </CardTitle>
        <CardDescription>
            Multi-tenant synchronization for business: <span className="font-mono text-xs">{businessId}</span>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 divide-x">
          {/* LEFT: Bank Transactions */}
          <div className="flex flex-col">
            <header className="p-4 bg-muted/40 font-bold text-xs uppercase tracking-widest border-b flex justify-between">
              Bank Statement Lines
              <span className="text-primary">{data?.bank_transactions?.length || 0}</span>
            </header>
            <ScrollArea className="h-[500px]">
              {isLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin opacity-20" /></div>
              ) : data?.bank_transactions?.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-sm italic">No imported bank data found.</div>
              ) : (
                data?.bank_transactions.map((tx: Transaction) => (
                    <TransactionItem 
                      key={tx.id}
                      tx={tx}
                      onSelect={() => setSelectedBankTxId(tx.id)}
                      isSelected={selectedBankTxId === tx.id}
                    />
                  ))
              )}
            </ScrollArea>
          </div>

          {/* RIGHT: Internal Ledger (Absolute Truth) */}
          <div className="flex flex-col">
            <header className="p-4 bg-muted/40 font-bold text-xs uppercase tracking-widest border-b flex justify-between">
              Internal Ledger Entries
              <span className="text-green-600">{data?.internal_transactions?.length || 0}</span>
            </header>
            <ScrollArea className="h-[500px]">
              {isLoading ? (
                 <div className="flex justify-center p-12"><Loader2 className="animate-spin opacity-20" /></div>
              ) : data?.internal_transactions?.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-sm italic">Ledger is fully reconciled.</div>
              ) : (
                data?.internal_transactions.map((tx: Transaction) => (
                    <TransactionItem 
                      key={tx.id}
                      tx={tx}
                      onSelect={() => setSelectedSystemTxId(tx.id)}
                      isSelected={selectedSystemTxId === tx.id}
                    />
                  ))
              )}
            </ScrollArea>
          </div>
        </div>

        <div className="p-6 bg-muted/10 border-t flex flex-col items-center gap-4">
            <div className="flex items-center gap-8 text-sm font-medium">
                <div className="flex flex-col items-center">
                    <span className="text-muted-foreground text-[10px] uppercase">Bank Selection</span>
                    <span className={selectedBankTxId ? 'text-primary' : 'text-muted-foreground/30'}>
                        {selectedBankTxId ? 'Ready' : 'Pending'}
                    </span>
                </div>
                <CheckCircle2 className={`h-6 w-6 ${selectedBankTxId && selectedSystemTxId ? 'text-green-500' : 'text-muted-foreground/20'}`} />
                <div className="flex flex-col items-center">
                    <span className="text-muted-foreground text-[10px] uppercase">Ledger Selection</span>
                    <span className={selectedSystemTxId ? 'text-green-600' : 'text-muted-foreground/30'}>
                        {selectedSystemTxId ? 'Ready' : 'Pending'}
                    </span>
                </div>
            </div>

            <Button 
                onClick={handleMatch} 
                disabled={!selectedBankTxId || !selectedSystemTxId || mutation.isPending}
                size="lg"
                className="w-full max-w-xs shadow-md"
            >
                {mutation.isPending ? 'Processing Match...' : 'Authorize Reconciliation'}
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}