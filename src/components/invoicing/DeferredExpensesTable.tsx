"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from "@/components/ui/input";
import { Loader2, Search, Calendar, DollarSign } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from '@/lib/supabase/client';

interface DeferredExpense {
  id: string;
  vendor_name: string;
  amount: number;
  start_date: string;
  end_date: string;
  currency: string;
}

interface Props {
  tenantId: string;
  locale?: string;
}

export default function DeferredExpensesTable({ tenantId }: Props) {
  const [expenses, setExpenses] = useState<DeferredExpense[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Client Side supabase (no arguments needed here)
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('deferred_expenses')
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) console.error("Error fetching expenses:", error);
      if (data) setExpenses(data as unknown as DeferredExpense[]);
      
      setLoading(false);
    };
    if (tenantId) fetchData();
  }, [tenantId, supabase]);

  const filtered = useMemo(() => 
    expenses.filter(e => (e.vendor_name || '').toLowerCase().includes(filter.toLowerCase())), 
  [expenses, filter]);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-gray-500" />
          Prepaid Expenses
        </CardTitle>
        <CardDescription>View amortization schedules for prepaid items.</CardDescription>
        <div className="relative mt-4 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Filter by vendor..." 
            value={filter} 
            onChange={e => setFilter(e.target.value)} 
            className="pl-9" 
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex py-16 justify-center text-gray-500">
            <Loader2 className="animate-spin h-8 w-8 mr-2" /> Loading data...
          </div>
        ) : (
          <ScrollArea className="h-[500px] border rounded-md">
            <Table>
              <TableHeader className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-gray-500">
                      No deferred expenses found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(exp => (
                    <TableRow key={exp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <TableCell className="font-medium">{exp.vendor_name}</TableCell>
                      <TableCell className="font-mono">
                        {exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {exp.currency}
                      </TableCell>
                      <TableCell>{new Date(exp.start_date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(exp.end_date).toLocaleDateString()}</TableCell>
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