"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, Search } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from '@/lib/supabase/client';

interface CreditNote {
  id: string;
  note_number: string;
  customer_name: string;
  currency: string;
  amount: number;
  reason: string;
  status: string;
  entity: string;
  country: string;
  created_at: string;
}

interface Props {
  tenantId: string;
  locale?: string;
}

export default function CreditNotesTable({ tenantId, locale = 'en' }: Props) {
  const [notes, setNotes] = useState<CreditNote[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchNotes = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('credit_notes')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) console.error(error);
      if (data) setNotes(data);
      setLoading(false);
    };

    fetchNotes();
  }, [tenantId, supabase]);

  const filtered = useMemo(
    () => notes.filter(note =>
        note.note_number.toLowerCase().includes(filter.toLowerCase()) ||
        note.customer_name.toLowerCase().includes(filter.toLowerCase())
    ),
    [notes, filter]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credit Notes</CardTitle>
        <CardDescription>Handle customer returns, corrections, and incentives.</CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Filter..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex py-14 justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>
        ) : (
          <ScrollArea className="h-72">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Note #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0
                  ? <TableRow><TableCell colSpan={6}>No credit notes found.</TableCell></TableRow>
                  : filtered.map(note => (
                    <TableRow key={note.id}>
                      <TableCell>{note.status}</TableCell>
                      <TableCell>{note.note_number}</TableCell>
                      <TableCell>{note.customer_name}</TableCell>
                      <TableCell>{note.amount.toLocaleString()} {note.currency}</TableCell>
                      <TableCell>{note.reason}</TableCell>
                      <TableCell>{new Date(note.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}