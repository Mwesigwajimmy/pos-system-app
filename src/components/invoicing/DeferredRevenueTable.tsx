"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from "@/components/ui/input";
import { Loader2, Search, TrendingUp, PiggyBank, ArrowRight, Clock, ShieldCheck } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress"; 
import { Badge } from "@/components/ui/badge";
import { createClient } from '@/lib/supabase/client';

// --- Enterprise Data Structure ---
interface DeferredRevenue {
  id: string;
  customer_name: string;
  invoice_number: string;
  total_amount: number;
  recognized_amount: number;
  start_date: string;
  end_date: string;
  status: string;
  currency: string;
  // Relational link to the 1:1 schedules created by the backend trigger
  accounting_amortization_schedules: {
    id: string;
    recognition_date: string;
    amount: number;
    status: string;
  }[];
}

interface Props {
  tenantId: string;
  locale?: string;
}

export default function DeferredRevenueTable({ tenantId, locale = 'en-UG' }: Props) {
  const [revenues, setRevenues] = useState<DeferredRevenue[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        // ENTERPRISE RELATIONAL FETCH:
        // We join with the amortization schedules we built in the SQL repair
        const { data, error } = await supabase
          .from('deferred_revenue')
          .select(`
            *,
            accounting_amortization_schedules (
              id,
              recognition_date,
              amount,
              status
            )
          `)
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (isMounted && data) setRevenues(data as any);
      } catch (err: any) {
        console.error("Deferred Revenue Sync Error:", err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (tenantId) fetchData();
    return () => { isMounted = false; };
  }, [tenantId, supabase]);

  // SMART SEARCH: Filter by customer or invoice number
  const filtered = useMemo(() => 
    revenues.filter(r => 
        (r.customer_name || '').toLowerCase().includes(filter.toLowerCase()) ||
        (r.invoice_number || '').toLowerCase().includes(filter.toLowerCase())
    ), 
  [revenues, filter]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency || 'UGX' }).format(amount);
  };

  return (
    <Card className="shadow-lg border-none overflow-hidden">
      <CardHeader className="bg-slate-50/50 pb-8 border-b border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <PiggyBank className="h-6 w-6 text-indigo-600" />
              Unearned Revenue Engine
            </CardTitle>
            <CardDescription className="text-sm font-medium text-slate-500">
                Autonomous revenue recognition schedules hard-linked to your Ledger.
            </CardDescription>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search customer or invoice..." 
              value={filter} 
              onChange={e => setFilter(e.target.value)} 
              className="pl-10 h-11 bg-white border-slate-200 shadow-sm" 
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {loading ? (
          <div className="flex py-32 justify-center items-center flex-col gap-4 text-slate-400">
            <Loader2 className="animate-spin h-10 w-10 text-indigo-600" />
            <span className="text-sm font-semibold animate-pulse">Calculating recognition cycles...</span>
          </div>
        ) : (
          <ScrollArea className="h-[600px] relative">
            <Table>
              <TableHeader className="bg-slate-50/80 sticky top-0 z-20 backdrop-blur-md">
                <TableRow className="border-b border-slate-200">
                  <TableHead className="pl-6 w-[280px]">Customer & Contract</TableHead>
                  <TableHead>Recognition Progress</TableHead>
                  <TableHead className="text-right">Total Contract</TableHead>
                  <TableHead className="text-center">Lifecycle</TableHead>
                  <TableHead className="text-right pr-6">Remaining Liability</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-60 text-center text-slate-400">
                       No deferred revenue records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(rev => {
                    const progress = rev.total_amount > 0 ? (rev.recognized_amount / rev.total_amount) * 100 : 0;
                    return (
                      <TableRow key={rev.id} className="hover:bg-indigo-50/20 transition-colors group">
                        <TableCell className="pl-6 py-5">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-slate-900">{rev.customer_name || 'Walk-in Client'}</span>
                            <div className="flex items-center gap-2">
                                <Badge variant={rev.status === 'active' ? 'default' : 'secondary'} className="text-[10px] px-1.5 h-4 bg-indigo-600">
                                    {rev.status.toUpperCase()}
                                </Badge>
                                <span className="text-[10px] text-slate-400 flex items-center gap-1 uppercase font-bold">
                                    <ShieldCheck className="h-2.5 w-2.5"/> Inv: {rev.invoice_number || '---'}
                                </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5 w-48">
                            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                                <span>{Math.round(progress)}% Earned</span>
                                <span>{rev.accounting_amortization_schedules?.length || 0} Slots</span>
                            </div>
                            <Progress value={progress} className="h-1.5 bg-slate-100" />
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-slate-700">
                          {formatCurrency(rev.total_amount, rev.currency)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-slate-500 bg-slate-100/50 py-1.5 px-3 rounded-lg border border-slate-200/50">
                            {new Date(rev.start_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                            <ArrowRight className="h-3 w-3 text-indigo-400" />
                            {new Date(rev.end_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6 font-mono font-bold text-indigo-600">
                           {formatCurrency(rev.total_amount - rev.recognized_amount, rev.currency)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}