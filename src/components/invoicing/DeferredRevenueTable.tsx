"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from "@/components/ui/input";
import { Loader2, Search, TrendingUp } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from '@/lib/supabase/client';

interface DeferredRevenue {
  id: string;
  customer_name: string;
  invoice_number: string;
  amount: number;
  start_date: string;
  end_date: string;
  currency: string;
}

interface Props {
  tenantId: string;
  locale?: string;
}

export default function DeferredRevenueTable({ tenantId }: Props) {
  const [revenues, setRevenues] = useState<DeferredRevenue[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('deferred_revenue')
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) console.error("Error fetching revenue:", error);
      if (data) setRevenues(data as unknown as DeferredRevenue[]);
      
      setLoading(false);
    };
    if (tenantId) fetchData();
  }, [tenantId, supabase]);

  const filtered = useMemo(() => 
    revenues.filter(r => (r.customer_name || '').toLowerCase().includes(filter.toLowerCase())), 
  [revenues, filter]);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-gray-500" />
          Unearned Revenue
        </CardTitle>
        <CardDescription>Track revenue recognition across future periods.</CardDescription>
        <div className="relative mt-4 max-w-sm">
           <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
           <Input 
             placeholder="Filter by customer..." 
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
                   <TableHead>Customer</TableHead>
                   <TableHead>Invoice #</TableHead>
                   <TableHead>Amount</TableHead>
                   <TableHead>Recognition Period</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-gray-500">
                      No deferred revenue records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(rev => (
                    <TableRow key={rev.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <TableCell className="font-medium">{rev.customer_name}</TableCell>
                      <TableCell className="text-gray-500">{rev.invoice_number}</TableCell>
                      <TableCell className="font-mono">
                        {rev.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {rev.currency}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(rev.start_date).toLocaleDateString()} &rarr; {new Date(rev.end_date).toLocaleDateString()}
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