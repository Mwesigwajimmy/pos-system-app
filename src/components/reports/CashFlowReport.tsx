'use client';

import React from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Download, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// FIX 1: Defined interface here and exported it (Removed import from page)
export interface CashFlowData {
  section: 'Operating' | 'Investing' | 'Financing';
  line_item: string;
  amount: number;
  currency: string;
  is_total?: boolean;
}

interface Props {
  data: CashFlowData[];
  netChange: number;
  period: string;
}

export default function CashFlowReportClient({ data, netChange, period }: Props) {
  
  const formatMoney = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'UGX' }).format(val);

  const handleExport = () => {
    try {
        const headers = ["Section", "Line Item", "Amount"];
        const csvRows = data.map(r => `"${r.section}","${r.line_item}",${r.amount}`);
        // Add Net Change Row
        csvRows.push(`"Summary","Net Change in Cash",${netChange}`);
        
        const csvContent = [headers.join(","), ...csvRows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `CashFlow_${period}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Cash Flow exported successfully.");
    } catch (e) {
        toast.error("Export failed.");
    }
  };

  return (
    <Card className="shadow-md border-slate-200">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Cash Flow Statement</CardTitle>
                <CardDescription>
                  Cash position analysis (Indirect Method) for period: <span className="font-semibold text-primary">{period}</span>.
                </CardDescription>
            </div>
            <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4"/> Export CSV
            </Button>
        </div>
      </CardHeader>
      <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-[300px]">Section</TableHead>
                <TableHead>Line Item Description</TableHead>
                <TableHead className="text-right">Amount (UGX)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, idx) => (
                <TableRow 
                    key={idx} 
                    className={row.is_total ? "bg-slate-50 font-bold border-t-2 border-slate-200" : ""}
                >
                  <TableCell className="font-medium text-slate-700">
                    {!row.is_total && row.section}
                  </TableCell>
                  <TableCell className={row.is_total ? "uppercase text-xs tracking-wider" : ""}>
                    {row.line_item}
                  </TableCell>
                  <TableCell className={`text-right font-mono ${row.amount < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                    {formatMoney(row.amount)}
                  </TableCell>
                </TableRow>
              ))}
              
              {/* Grand Total Row */}
              <TableRow className="bg-slate-900 text-white hover:bg-slate-800 border-t-4 border-slate-300">
                <TableCell className="font-bold flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-400"/> Summary
                </TableCell>
                <TableCell className="font-bold uppercase tracking-wider">
                    Net Increase / (Decrease) in Cash
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-lg">
                    {formatMoney(netChange)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* Analysis Footer */}
          <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-100 flex items-start gap-3">
             {netChange >= 0 ? (
                 <TrendingUp className="h-6 w-6 text-green-600 mt-1" />
             ) : (
                 <TrendingDown className="h-6 w-6 text-red-600 mt-1" />
             )}
             <div>
                 <h4 className="font-semibold text-sm text-slate-900">Cash Position Insight</h4>
                 <p className="text-sm text-slate-600 leading-relaxed">
                    {netChange >= 0 
                        ? "The entity has generated positive cash flow this period. This indicates good liquidity and operational efficiency, allowing for reinvestment or debt reduction."
                        : "The entity experienced a net cash outflow. Analyze Operating Activities to ensure core business is generating cash, or verify if outflows were strategic CapEx investments."}
                 </p>
             </div>
          </div>
      </CardContent>
    </Card>
  );
}