"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, Search, FilePlus, AlertCircle, TrendingUp } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { createClient } from '@/lib/supabase/client';

// --- Enterprise Data Interface ---
interface DebitNote {
  id: string;
  note_number: string;
  amount: number;
  currency: string;
  reason: string;
  status: string;
  created_at: string;
  // Relational Bridge: Join through invoice to find the partner
  invoices: {
    customer_name: string;
    invoice_number: string;
    customers: {
      name: string;
    }
  }
}

interface Props {
  tenantId: string;
  locale?: string;
}

export default function DebitNotesTable({ tenantId, locale = 'en-UG' }: Props) {
  const [notes, setNotes] = useState<DebitNote[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;
    const fetchNotes = async () => {
      setLoading(true);
      try {
        // ENTERPRISE RELATIONAL FETCH:
        // We join 'debit_notes' -> 'invoices' -> 'customers'
        // This ensures the adjustment is hard-linked to the correct ledger sub-account.
        const { data, error } = await supabase
          .from('debit_notes')
          .select(`
            id, note_number, amount, currency, reason, status, created_at,
            invoices (
              customer_name,
              invoice_number,
              customers (
                name
              )
            )
          `)
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (isMounted && data) setNotes(data as any);
      } catch (err: any) {
        console.error("Debit Note Connectivity Error:", err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (tenantId) fetchNotes();
    return () => { isMounted = false; };
  }, [tenantId, supabase]);

  // SMART FILTERING: Handles potential null values in note numbers or names
  const filtered = useMemo(() => notes.filter(n => {
    const search = filter.toLowerCase();
    const noteNum = (n.note_number || '').toLowerCase();
    const partyName = (n.invoices?.customers?.name || n.invoices?.customer_name || '').toLowerCase();
    return noteNum.includes(search) || partyName.includes(search);
  }), [notes, filter]);

  const getStatusBadge = (status: string) => {
    const s = (status || 'DRAFT').toUpperCase();
    switch (s) {
      case 'APPROVED': 
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 border-none">APPROVED</Badge>;
      case 'POSTED': 
        return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">POSTED</Badge>;
      case 'DRAFT': 
        return <Badge variant="secondary">DRAFT</Badge>;
      default: 
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="shadow-lg border-none overflow-hidden">
      <CardHeader className="bg-slate-50/50 pb-8 border-b border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
              Debit Adjustments
            </CardTitle>
            <CardDescription className="text-sm">
                Manage upward adjustments to invoices and supplier obligations.
            </CardDescription>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by note # or name..." 
              value={filter} 
              onChange={e => setFilter(e.target.value)} 
              className="pl-10 h-11 bg-white shadow-sm border-slate-200 focus:ring-emerald-500" 
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {loading ? (
          <div className="flex py-32 justify-center items-center text-slate-400 flex-col gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
            <span className="text-sm font-medium animate-pulse">Syncing adjustments with Ledger...</span>
          </div>
        ) : (
          <ScrollArea className="h-[550px] relative">
            <Table>
              <TableHeader className="bg-slate-50/80 sticky top-0 z-20 backdrop-blur-md">
                <TableRow className="border-b border-slate-200">
                  <TableHead className="pl-6 w-[120px]">Workflow</TableHead>
                  <TableHead>Note Reference</TableHead>
                  <TableHead>Related Account</TableHead>
                  <TableHead className="text-right">Adjustment Value</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right pr-6">Entry Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-60 text-center">
                        <AlertCircle className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                        <p className="text-slate-500 font-medium">No active debit notes</p>
                        <p className="text-xs text-slate-400">Your filters or database returned no records.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((note) => (
                    <TableRow key={note.id} className="hover:bg-emerald-50/30 transition-colors group">
                      <TableCell className="pl-6">
                        {getStatusBadge(note.status)}
                      </TableCell>
                      <TableCell className="font-bold font-mono text-slate-700">
                        {note.note_number || `DBN-${note.id.substring(0,4)}`}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">
                            {note.invoices?.customers?.name || note.invoices?.customer_name || 'Walk-in Partner'}
                          </span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 uppercase">
                            Ref: {note.invoices?.invoice_number || 'Internal'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-emerald-700 bg-emerald-50/50 px-4">
                        {new Intl.NumberFormat(locale, { style: 'currency', currency: note.currency || 'UGX' }).format(note.amount)}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate italic text-slate-500 text-sm" title={note.reason}>
                        {note.reason || 'Standard adjustment'}
                      </TableCell>
                      <TableCell className="text-right pr-6 text-slate-400 text-xs font-medium">
                        {new Date(note.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
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