"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, Search, FileText, AlertCircle } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge"; // Ensure you have this Shadcn component
import { createClient } from '@/lib/supabase/client';

interface CreditNote {
  id: string;
  note_number: string;
  amount: number;
  currency: string;
  reason: string;
  status: string;
  created_at: string;
  // Relational data from the join
  invoices: {
    customers: {
      name: string;
    }
  }
}

interface Props {
  tenantId: string;
  locale?: string;
}

export default function CreditNotesTable({ tenantId, locale = 'en-UG' }: Props) {
  const [notes, setNotes] = useState<CreditNote[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;
    const fetchNotes = async () => {
      setLoading(true);
      try {
        // ENTERPRISE JOIN: We pull the customer name through the invoice bridge
        // discovered in our deep root audit.
        const { data, error } = await supabase
          .from('credit_notes')
          .select(`
            id, note_number, amount, currency, reason, status, created_at,
            invoices (
              customers (
                name
              )
            )
          `)
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (isMounted && data) setNotes(data as any);
      } catch (err) {
        console.error("Credit Note Load Error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (tenantId) fetchNotes();
    return () => { isMounted = false; };
  }, [tenantId, supabase]);

  // DEFENSIVE FILTERING: Prevents crashes on null values
  const filtered = useMemo(() => 
    notes.filter(note => {
      const searchStr = filter.toLowerCase();
      const num = (note.note_number || '').toLowerCase();
      const name = (note.invoices?.customers?.name || 'Unknown').toLowerCase();
      return num.includes(searchStr) || name.includes(searchStr);
    }),
    [notes, filter]
  );

  const getStatusVariant = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED': return 'default'; // Green/Blue
      case 'POSTED': return 'outline';   // Solid border
      case 'DRAFT': return 'secondary';  // Gray
      default: return 'destructive';     // Red
    }
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Credit Notes
        </CardTitle>
        <CardDescription>Customer returns and corrections hard-linked to the Ledger.</CardDescription>
        <div className="relative mt-4 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search by note # or customer..." 
            value={filter} 
            onChange={e => setFilter(e.target.value)} 
            className="pl-10 bg-gray-50 dark:bg-gray-900" 
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex py-20 justify-center items-center gap-3 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin" /> 
            <span>Synchronizing adjustments...</span>
          </div>
        ) : (
          <ScrollArea className="h-[450px] border rounded-lg">
            <Table>
              <TableHeader className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead>Note #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-gray-400">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      No matching records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(note => (
                    <TableRow key={note.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell>
                        <Badge variant={getStatusVariant(note.status)}>
                          {note.status || 'DRAFT'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono font-bold text-sm">
                        {note.note_number || '---'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {note.invoices?.customers?.name || 'Walk-in Customer'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-blue-600">
                        {new Intl.NumberFormat(locale, { style: 'currency', currency: note.currency || 'UGX' }).format(note.amount)}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-gray-500" title={note.reason}>
                        {note.reason}
                      </TableCell>
                      <TableCell className="text-right text-gray-400 text-xs">
                        {new Date(note.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}