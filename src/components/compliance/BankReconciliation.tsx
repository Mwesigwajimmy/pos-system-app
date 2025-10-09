// src/components/compliance/BankReconciliation.tsx
'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
// FIXED: Removed BankTransaction from this import as it's not exported.
import { Transaction } from '@/types/dashboard';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import toast, { Toaster } from 'react-hot-toast';

const supabase = createClient();

// FIXED: Defined the missing BankTransaction type locally.
interface BankTransaction {
  id: number;
  transaction_date: string;
  description: string;
  amount: number;
}

// This interface now correctly uses the locally defined BankTransaction type.
interface ReconciliationData {
  bank_transactions: BankTransaction[];
  internal_transactions: Transaction[];
}

async function fetchReconciliationData(): Promise<ReconciliationData> {
  const { data, error } = await supabase.rpc('get_unreconciled_data', { p_business_id: 1 });
  if (error) throw new Error(error.message);
  return data as ReconciliationData;
}

async function matchTransactions({ bankTxId, internalTxId }: { bankTxId: number, internalTxId: number }) {
  const { error } = await supabase.rpc('match_transactions', {
    p_bank_transaction_id: bankTxId,
    p_internal_transaction_id: internalTxId,
  });
  if (error) throw new Error(error.message);
}

// A single transaction item component for our lists
const TransactionItem = ({ tx, onSelect, isSelected }: { tx: {id: number, transaction_date: string, description: string, amount: number}, onSelect: () => void, isSelected: boolean }) => (
  <div 
    onClick={onSelect}
    className={`p-3 border-b cursor-pointer hover:bg-gray-100 ${isSelected ? 'bg-indigo-100 border-l-4 border-indigo-500' : ''}`}
  >
    <div className="flex justify-between items-center">
      <p className="font-medium text-sm truncate">{tx.description}</p>
      <p className="font-mono text-sm font-semibold">{tx.amount.toFixed(2)}</p>
    </div>
    <p className="text-xs text-gray-500">{new Date(tx.transaction_date).toLocaleDateString()}</p>
  </div>
);

export default function BankReconciliation() {
  const queryClient = useQueryClient();
  const [selectedBankTx, setSelectedBankTx] = useState<BankTransaction | null>(null);
  const [selectedInternalTx, setSelectedInternalTx] = useState<Transaction | null>(null);

  const { data, isLoading, error } = useQuery<ReconciliationData>({
    queryKey: ['reconciliationData'],
    queryFn: fetchReconciliationData,
  });
  
  const mutation = useMutation({
    mutationFn: matchTransactions,
    onSuccess: () => {
      toast.success('Transactions Matched!');
      queryClient.invalidateQueries({ queryKey: ['reconciliationData'] });
      setSelectedBankTx(null);
      setSelectedInternalTx(null);
    },
    onError: (err) => {
      toast.error(`Matching failed: ${err.message}`);
    }
  });

  const handleMatch = () => {
    if (selectedBankTx && selectedInternalTx) {
      mutation.mutate({ bankTxId: selectedBankTx.id, internalTxId: selectedInternalTx.id });
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Bank Reconciliation</CardTitle>
        <p className="text-sm text-gray-500">Match imported bank transactions with your internal records.</p>
      </CardHeader>
      <CardContent>
        <Toaster />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Panel: Bank Transactions */}
          <div className="border rounded-lg">
            <h3 className="p-3 font-semibold border-b bg-gray-50">Unreconciled Bank Transactions</h3>
            <ScrollArea className="h-96">
              {isLoading ? <p className="p-4 text-center">Loading...</p> : 
               data?.bank_transactions.map(tx => (
                <TransactionItem 
                  key={`bank-${tx.id}`}
                  tx={tx}
                  onSelect={() => setSelectedBankTx(tx)}
                  isSelected={selectedBankTx?.id === tx.id}
                />
              ))}
            </ScrollArea>
          </div>

          {/* Right Panel: Internal Transactions */}
          <div className="border rounded-lg">
            <h3 className="p-3 font-semibold border-b bg-gray-50">Unreconciled Internal Transactions</h3>
             <ScrollArea className="h-96">
              {isLoading ? <p className="p-4 text-center">Loading...</p> : 
               data?.internal_transactions.map(tx => (
                <TransactionItem 
                  key={`internal-${tx.id}`}
                  tx={{...tx, amount: tx.journal_entries.find(je => je.type === 'DEBIT')?.amount || 0}}
                  onSelect={() => setSelectedInternalTx(tx)}
                  isSelected={selectedInternalTx?.id === tx.id}
                />
              ))}
            </ScrollArea>
          </div>
        </div>
        <div className="mt-6 flex justify-center">
          <Button 
            onClick={handleMatch} 
            disabled={!selectedBankTx || !selectedInternalTx || mutation.isPending}
            size="lg"
          >
            {mutation.isPending ? 'Matching...' : 'Match Selected Transactions'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}