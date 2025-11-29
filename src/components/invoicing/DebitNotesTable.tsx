"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, Search, FileText } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from '@/lib/supabase/client';

// Define the shape of your data
interface DebitNote {
  id: string;
  note_number: string;
  supplier_name: string;
  currency: string;
  amount: number;
  reason: string;
  status: string;
  created_at: string;
}

interface Props {
  tenantId: string;
  locale?: string;
}

export default function DebitNotesTable({ tenantId }: Props) {
  const [notes, setNotes] = useState<DebitNote[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Client-side Supabase client (does not need cookies passed manually)
  const supabase = createClient();

  useEffect(() => {
    const fetchNotes = async () => {
      setLoading(true);
      
      // Fetch data scoped to the tenant
      const { data, error } = await supabase
        .from('debit_notes')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching debit notes:", error);
      }
      
      if (data) {
        // Cast data to ensure TS is happy, or rely on generated types if available
        setNotes(data as unknown as DebitNote[]);
      }
      
      setLoading(false);
    };

    if (tenantId) {
      fetchNotes();
    }
  }, [tenantId, supabase]);

  // Client-side filtering
  const filtered = useMemo(() => notes.filter(n => 
    (n.note_number?.toLowerCase() || '').includes(filter.toLowerCase()) || 
    (n.supplier_name?.toLowerCase() || '').includes(filter.toLowerCase())
  ), [notes, filter]);

  return (
    <Card className="shadow-sm border-gray-200 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-gray-500" />
          Supplier Adjustments
        </CardTitle>
        <CardDescription>View and manage debit notes issued to suppliers.</CardDescription>
        
        {/* Search Bar */}
        <div className="relative mt-4 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input 
            placeholder="Search by note # or supplier..." 
            value={filter} 
            onChange={e => setFilter(e.target.value)} 
            className="pl-9 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700" 
          />
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex py-20 justify-center items-center text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Loading records...</span>
          </div>
        ) : (
          <ScrollArea className="h-[500px] w-full rounded-md border">
            <Table>
              <TableHeader className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <TableRow>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead>Note #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                      No debit notes found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((note) => (
                    <TableRow key={note.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                          ${note.status === 'approved' ? 'bg-green-100 text-green-800' : 
                            note.status === 'draft' ? 'bg-gray-100 text-gray-800' : 
                            'bg-yellow-100 text-yellow-800'}`}>
                          {note.status}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{note.note_number}</TableCell>
                      <TableCell>{note.supplier_name}</TableCell>
                      <TableCell className="font-mono text-gray-700 dark:text-gray-300">
                        {note.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {note.currency}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={note.reason}>
                        {note.reason}
                      </TableCell>
                      <TableCell className="text-right text-gray-500">
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