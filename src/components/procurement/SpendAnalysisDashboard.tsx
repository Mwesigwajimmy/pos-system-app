"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface CategorySpend {
  category: string;
  total_spend: number;
  currency: string;
  transaction_count: number;
}

interface Props {
  tenantId: string;
}

export default function SpendAnalysisDashboard({ tenantId }: Props) {
  const [spendData, setSpendData] = useState<CategorySpend[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchSpend = async () => {
      const { data } = await supabase
        .from('purchase_orders')
        .select('category, total_amount, currency')
        .eq('tenant_id', tenantId)
        .eq('status', 'approved');

      if (data) {
        // Client-side aggregation
        const aggregation: Record<string, CategorySpend> = {};
        
        data.forEach(po => {
          const cat = po.category || 'Uncategorized';
          if (!aggregation[cat]) {
            aggregation[cat] = { category: cat, total_spend: 0, currency: po.currency || 'USD', transaction_count: 0 };
          }
          aggregation[cat].total_spend += po.total_amount || 0;
          aggregation[cat].transaction_count += 1;
        });

        setSpendData(Object.values(aggregation).sort((a, b) => b.total_spend - a.total_spend));
      }
      setLoading(false);
    };
    fetchSpend();
  }, [tenantId, supabase]);

  if (loading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle>Spend by Category</CardTitle>
        <CardDescription>Top spending categories for approved Purchase Orders.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Transactions</TableHead>
              <TableHead className="text-right">Total Spend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {spendData.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center py-4">No spend data available.</TableCell></TableRow>
            ) : (
              spendData.slice(0, 5).map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{item.category}</TableCell>
                  <TableCell className="text-right">{item.transaction_count}</TableCell>
                  <TableCell className="text-right font-bold">
                    {item.total_spend.toLocaleString()} {item.currency}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}