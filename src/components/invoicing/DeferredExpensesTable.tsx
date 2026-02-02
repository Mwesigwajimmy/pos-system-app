"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from "@/components/ui/input";
import { Loader2, Search, Calendar, DollarSign, Wallet, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress"; // Ensure you have this Shadcn component
import { Badge } from "@/components/ui/badge";
import { createClient } from '@/lib/supabase/client';

// --- Enterprise Data Structure ---
interface DeferredExpense {
  id: string;
  vendor_name: string;
  total_amount: number;
  recognized_amount: number;
  start_date: string;
  end_date: string;
  status: string;
  currency: string;
  // Relational link to the 1:1 schedules
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

export default function DeferredExpensesTable({ tenantId, locale = 'en-UG' }: Props) {
  const [expenses, setExpenses] = useState<DeferredExpense[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        // ENTERPRISE JOIN: 
        // We fetch the master record PLUS all monthly recognition slots.
        const { data, error } = await supabase
          .from('deferred_expenses')
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
        if (isMounted && data) setExpenses(data as any);
      } catch (err: any) {
        console.error("Deferred Expense Sync Error:", err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (tenantId) fetchData();
    return () => { isMounted = false; };
  }, [tenantId, supabase]);

  // SMART FILTERING
  const filtered = useMemo(() => 
    expenses.filter(e => (e.vendor_name || '').toLowerCase().includes(filter.toLowerCase())), 
  [expenses, filter]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency || 'UGX' }).format(amount);
  };

  return (
    <Card className="shadow-lg border-none overflow-hidden">
      <CardHeader className="bg-slate-50/50 pb-8 border-b border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Wallet className="h-6 w-6 text-blue-600" />
              Prepaid Amortization
            </CardTitle>
            <CardDescription className="text-sm">
                Tracking asset-to-expense recognition across future periods.
            </CardDescription>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search vendor..." 
              value={filter} 
              onChange={e => setFilter(e.target.value)} 
              className="pl-10 h-11 bg-white border-slate-200" 
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {loading ? (
          <div className="flex py-32 justify-center items-center flex-col gap-4">
            <Loader2 className="animate-spin h-10 w-10 text-blue-600" />
            <span className="text-sm font-medium text-slate-500">Calculating recognition progress...</span>
          </div>
        ) : (
          <ScrollArea className="h-[600px] relative">
            <Table>
              <TableHeader className="bg-slate-50/80 sticky top-0 z-20 backdrop-blur-md">
                <TableRow>
                  <TableHead className="pl-6 w-[250px]">Vendor & Status</TableHead>
                  <TableHead>Amortization Progress</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead className="text-center">Recognition Period</TableHead>
                  <TableHead className="text-right pr-6">Remaining</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-60 text-center text-slate-400">
                       No deferred expenses found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(exp => {
                    const progress = (exp.recognized_amount / exp.total_amount) * 100;
                    return (
                      <TableRow key={exp.id} className="hover:bg-blue-50/20 transition-colors">
                        <TableCell className="pl-6 py-5">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-slate-900">{exp.vendor_name}</span>
                            <div className="flex items-center gap-2">
                                <Badge variant={exp.status === 'active' ? 'default' : 'secondary'} className="text-[10px] px-1.5 h-4">
                                    {exp.status.toUpperCase()}
                                </Badge>
                                <span className="text-[10px] text-slate-400 flex items-center gap-1 uppercase font-semibold">
                                    <Clock className="h-2.5 w-2.5"/> {exp.accounting_amortization_schedules?.length || 0} Months
                                </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5 w-48">
                            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                                <span>{Math.round(progress)}% Recognize</span>
                                <span>{exp.recognized_amount > 0 ? 'Live' : 'Pending'}</span>
                            </div>
                            <Progress value={progress} className="h-1.5 bg-slate-100" />
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-slate-700">
                          {formatCurrency(exp.total_amount, exp.currency)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 py-1 px-2 rounded-full border border-slate-100">
                            {new Date(exp.start_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                            <ArrowRight className="h-3 w-3" />
                            {new Date(exp.end_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6 font-mono font-bold text-blue-600">
                           {formatCurrency(exp.total_amount - exp.recognized_amount, exp.currency)}
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