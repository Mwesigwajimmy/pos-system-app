'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableFooter 
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Download, Printer, MoreHorizontal, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import RecordPaymentDialog from "./RecordPaymentDialog";
import toast from "react-hot-toast";

// --- Enterprise Types ---

interface AmortizationEntry { 
    id: string; 
    loan_id: string; 
    installment_number: number;
    due_date: string; 
    principal_amount: number; 
    interest_amount: number;
    penalty_amount: number; 
    total_due: number; // Principal + Interest + Penalty
    amount_paid: number;
    balance_due: number;
    status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'GRACE_PERIOD';
    paid_date: string | null;
}

// --- Fetcher ---

async function fetchLoanSchedule(tenantId: string, loanId: string) {
  const db = createClient();
  // Fetch from 'repayment_schedules' table
  const { data, error } = await db
      .from('repayment_schedules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('loan_application_id', loanId) // Ensure column matches DB schema
      .order('installment_number', { ascending: true });
  
  if (error) throw new Error(error.message); 
  
  // Enterprise Transformation: Ensure calculated fields exist if not in DB
  return data.map((row: any) => ({
      id: row.id,
      loan_id: row.loan_application_id,
      installment_number: row.installment_number,
      due_date: row.due_date,
      principal_amount: row.principal_component,
      interest_amount: row.interest_component,
      penalty_amount: row.penalty_amount || 0,
      total_due: row.total_due,
      amount_paid: row.amount_paid || 0,
      balance_due: (row.total_due + (row.penalty_amount || 0)) - (row.amount_paid || 0),
      status: row.status,
      paid_date: row.paid_date
  })) as AmortizationEntry[];
}

// --- Component ---

export function RepaymentScheduleTable({ tenantId, loanId }: { tenantId: string, loanId: string }) {
  const { data: schedule, isLoading } = useQuery({ 
      queryKey: ['repayment-schedule', tenantId, loanId], 
      queryFn: () => fetchLoanSchedule(tenantId, loanId) 
  });

  // Export Handler (Mock CSV)
  const handleExport = () => {
    if (!schedule) return;
    const headers = "Installment,Due Date,Principal,Interest,Penalty,Total,Paid,Status\n";
    const rows = schedule.map(s => 
        `${s.installment_number},${s.due_date},${s.principal_amount},${s.interest_amount},${s.penalty_amount},${s.total_due},${s.amount_paid},${s.status}`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Schedule_Loan_${loanId}.csv`;
    a.click();
    toast.success("Schedule downloaded");
  };

  // Helper: Status Styles
  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'PAID': return <Badge className="bg-green-600 hover:bg-green-700"><CheckCircle2 className="w-3 h-3 mr-1"/> Paid</Badge>;
          case 'OVERDUE': return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1"/> Overdue</Badge>;
          case 'PARTIAL': return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">Partial</Badge>;
          default: return <Badge variant="outline" className="text-slate-500"><Clock className="w-3 h-3 mr-1"/> Pending</Badge>;
      }
  };

  // Totals Calculation
  const totals = React.useMemo(() => {
      if (!schedule) return null;
      return schedule.reduce((acc, curr) => ({
          principal: acc.principal + curr.principal_amount,
          interest: acc.interest + curr.interest_amount,
          penalty: acc.penalty + curr.penalty_amount,
          total: acc.total + curr.total_due,
          paid: acc.paid + curr.amount_paid,
          balance: acc.balance + curr.balance_due
      }), { principal: 0, interest: 0, penalty: 0, total: 0, paid: 0, balance: 0 });
  }, [schedule]);

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-slate-400"/></div>;

  return (
    <Card className="shadow-sm border-t-4 border-t-primary">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Amortization Schedule</CardTitle>
            <CardDescription>Detailed breakdown of principal, interest, and penalties.</CardDescription>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4"/> Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4"/> Export CSV
            </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-md border-t">
            <Table>
            <TableHeader className="bg-slate-50">
                <TableRow>
                <TableHead className="w-[50px] text-center">#</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Principal</TableHead>
                <TableHead className="text-right">Interest</TableHead>
                <TableHead className="text-right text-amber-600">Penalty</TableHead>
                <TableHead className="text-right font-bold">Total Due</TableHead>
                <TableHead className="text-right text-green-700">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {schedule?.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Schedule not generated yet.</TableCell></TableRow>
                ) : (
                    schedule?.map((s) => (
                        <TableRow key={s.id} className={s.status === 'OVERDUE' ? 'bg-red-50/50' : ''}>
                            <TableCell className="text-center font-mono text-xs">{s.installment_number}</TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-medium">{formatDate(s.due_date)}</span>
                                    {s.paid_date && <span className="text-[10px] text-green-600">Pd: {formatDate(s.paid_date)}</span>}
                                </div>
                            </TableCell>
                            <TableCell className="text-right text-slate-600">{formatCurrency(s.principal_amount)}</TableCell>
                            <TableCell className="text-right text-slate-600">{formatCurrency(s.interest_amount)}</TableCell>
                            <TableCell className="text-right text-amber-600 font-medium">
                                {s.penalty_amount > 0 ? formatCurrency(s.penalty_amount) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-bold text-slate-900">{formatCurrency(s.total_due)}</TableCell>
                            <TableCell className="text-right font-medium text-green-700">{formatCurrency(s.amount_paid)}</TableCell>
                            <TableCell className="text-right font-medium text-slate-800">{formatCurrency(s.balance_due)}</TableCell>
                            <TableCell className="text-center">
                                {getStatusBadge(s.status)}
                            </TableCell>
                            <TableCell>
                                {s.balance_due > 0 && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4"/></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                <RecordPaymentDialog 
                                                    applicationId={Number(loanId)} 
                                                    balance={s.balance_due}
                                                    suggestedAmount={s.balance_due}
                                                    tenantId={tenantId}
                                                />
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
            {totals && (
                <TableFooter className="bg-slate-100 font-bold">
                    <TableRow>
                        <TableCell colSpan={2} className="text-right">Totals</TableCell>
                        <TableCell className="text-right">{formatCurrency(totals.principal)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(totals.interest)}</TableCell>
                        <TableCell className="text-right text-amber-700">{formatCurrency(totals.penalty)}</TableCell>
                        <TableCell className="text-right text-slate-900">{formatCurrency(totals.total)}</TableCell>
                        <TableCell className="text-right text-green-700">{formatCurrency(totals.paid)}</TableCell>
                        <TableCell className="text-right text-slate-900">{formatCurrency(totals.balance)}</TableCell>
                        <TableCell colSpan={2}></TableCell>
                    </TableRow>
                </TableFooter>
            )}
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}