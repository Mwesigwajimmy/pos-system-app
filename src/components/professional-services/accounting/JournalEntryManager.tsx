'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableHead, TableRow, TableCell, TableBody } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Plus, FileText } from 'lucide-react';
import { CreateJournalEntryModal } from './CreateJournalEntryModal'; // Imported from above

interface TenantContext { tenantId: string; currency: string;}
interface EntryLine { account_id: number; debit: number; credit: number; }
interface JournalEntry { id: number; date: string; reference: string; description: string; lines: EntryLine[]; status: string; }

async function fetchEntries(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('journal_entries')
    .select('*, lines:journal_entry_lines(*)')
    .eq('tenant_id', tenantId)
    .order('date', { ascending: false });
  
  if (error) throw error; 
  return data as JournalEntry[];
}

async function fetchAccounts(tenantId: string) {
  const db = createClient();
  const { data } = await db.from('accounts').select('id, name, code').eq('tenant_id', tenantId);
  return data || [];
}

export default function JournalEntryManager({ tenant }: { tenant: TenantContext }) {
  const [modalOpen, setModalOpen] = useState(false);
  
  const { data: entries, isLoading, refetch } = useQuery({ 
    queryKey: ['journals', tenant.tenantId], 
    queryFn: () => fetchEntries(tenant.tenantId) 
  });

  const { data: accounts } = useQuery({
    queryKey: ['coa-list', tenant.tenantId],
    queryFn: () => fetchAccounts(tenant.tenantId)
  });

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600"/> General Journal</CardTitle>
          <CardDescription>View and post journal entries.</CardDescription>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2"/> New Entry
        </Button>
      </CardHeader>
      <CardContent>
        {modalOpen && accounts && (
          <CreateJournalEntryModal 
            open={modalOpen} 
            onClose={() => setModalOpen(false)} 
            tenantId={tenant.tenantId} 
            accounts={accounts as any} // Cast if types slightly mismatch db return
            onComplete={refetch}
          />
        )}

        <div className="border rounded-md">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Lines</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto animate-spin"/></TableCell></TableRow>
              ) : entries?.map((e) => {
                const total = e.lines.reduce((sum, l) => sum + l.debit, 0);
                return (
                  <TableRow key={e.id}>
                    <TableCell>{new Date(e.date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono text-xs">{e.reference}</TableCell>
                    <TableCell className="font-medium">{e.description}</TableCell>
                    <TableCell className="text-center text-slate-500">{e.lines.length}</TableCell>
                    <TableCell className="text-right font-mono">{tenant.currency} {total.toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">{e.status}</span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}