'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from "@/components/ui/badge"; // <-- THIS LINE IS THE FIX

// Define the detailed types for the props this component expects.
// This ensures full type safety and developer clarity.
type PayrollElement = { name: string; type: string };
type PayslipDetail = { calculated_amount: string | number; payroll_elements: PayrollElement | null };
type Employee = { full_name: string | null };
type Payslip = {
  id: string;
  currency_code: string;
  gross_earnings: string | number;
  total_deductions: string | number;
  net_pay: string | number;
  employees: Employee | null;
  payslip_details: PayslipDetail[];
};

export function ReviewPayslipTable({ payslips }: { payslips: Payslip[] }) {
  const [openPayslipId, setOpenPayslipId] = useState<string | null>(null);

  const getElementTypeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    if (type.includes('EARNING')) return 'default';
    if (type.includes('DEDUCTION')) return 'destructive';
    if (type.includes('CONTRIBUTION')) return 'outline';
    return 'secondary';
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead style={{ width: '40px' }}></TableHead>
            <TableHead>Employee</TableHead>
            <TableHead className="text-right">Gross Earnings</TableHead>
            <TableHead className="text-right">Total Deductions</TableHead>
            <TableHead className="text-right font-semibold">Net Pay</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payslips.map((payslip) => (
            <Collapsible asChild key={payslip.id} open={openPayslipId === payslip.id} onOpenChange={() => setOpenPayslipId(openPayslipId === payslip.id ? null : payslip.id)}>
              <>
                <TableRow className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-9 p-0">
                        {openPayslipId === payslip.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="sr-only">Toggle details</span>
                      </Button>
                    </CollapsibleTrigger>
                  </TableCell>
                  <TableCell className="font-medium">{payslip.employees?.full_name || 'N/A'}</TableCell>
                  <TableCell className="text-right">{formatCurrency(payslip.gross_earnings, payslip.currency_code)}</TableCell>
                  <TableCell className="text-right text-destructive">{formatCurrency(payslip.total_deductions, payslip.currency_code)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(payslip.net_pay, payslip.currency_code)}</TableCell>
                </TableRow>
                <CollapsibleContent asChild>
                  <TableRow>
                    <TableCell colSpan={5} className="p-0">
                      <div className="p-4 bg-muted">
                        <h4 className="font-semibold mb-2 ml-2">Payslip Breakdown for {payslip.employees?.full_name}</h4>
                        <div className='rounded-md border bg-background'>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Element</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {payslip.payslip_details.map((detail, index) => (
                              <TableRow key={index}>
                                <TableCell>{detail.payroll_elements?.name}</TableCell>
                                <TableCell>
                                  <Badge variant={getElementTypeVariant(detail.payroll_elements?.type || '')}>
                                    {detail.payroll_elements?.type.replace('_', ' ')}
                                  </Badge>
                                </TableCell>
                                <TableCell className={cn(
                                    "text-right",
                                    Number(detail.calculated_amount) < 0 && "text-destructive"
                                )}>
                                  {formatCurrency(detail.calculated_amount, payslip.currency_code)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                </CollapsibleContent>
              </>
            </Collapsible>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}