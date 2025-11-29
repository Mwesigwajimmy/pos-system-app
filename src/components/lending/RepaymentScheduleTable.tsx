'use client';

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

interface ScheduleEntry { 
    id: string; 
    loan_id: string; 
    due_date: string; 
    principal: number; 
    interest: number; 
    balance: number; 
    paid: number;
    status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
}

async function fetchSchedule(tenantId: string, loanId: string) {
  const db = createClient();
  const { data, error } = await db.from('repayment_schedule')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('loan_id', loanId)
      .order('due_date', { ascending: true });
  if (error) throw error; 
  return data as ScheduleEntry[];
}

const currency = new Intl.NumberFormat('en-US');

export function RepaymentScheduleTable({ tenantId, loanId }: { tenantId: string, loanId: string }) {
  const { data, isLoading } = useQuery({ 
      queryKey: ['repayment-schedule', tenantId, loanId], 
      queryFn: () => fetchSchedule(tenantId, loanId) 
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detailed Amortization Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Principal</TableHead>
              <TableHead className="text-right">Interest</TableHead>
              <TableHead className="text-right">Expected Total</TableHead>
              <TableHead className="text-right">Paid Amount</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-4">Loading schedule...</TableCell></TableRow>
            ) : data?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-4">No schedule generated yet.</TableCell></TableRow>
            ) : (
                data?.map((s) => (
                    <TableRow key={s.id}>
                        <TableCell>{new Date(s.due_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">{currency.format(s.principal)}</TableCell>
                        <TableCell className="text-right">{currency.format(s.interest)}</TableCell>
                        <TableCell className="text-right font-medium">{currency.format(s.principal + s.interest)}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">{currency.format(s.paid)}</TableCell>
                        <TableCell className="text-center">
                            <Badge variant={s.status === 'PAID' ? 'default' : s.status === 'OVERDUE' ? 'destructive' : 'secondary'}>
                                {s.status}
                            </Badge>
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