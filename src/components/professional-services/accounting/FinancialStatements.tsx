'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Download, Printer } from "lucide-react";

interface FinancialRow {
  category: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'ASSET' | 'LIABILITY' | 'EQUITY';
}

interface StatementData {
  incomeStatement: FinancialRow[];
  balanceSheet: FinancialRow[];
  netIncome: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

// Fetches consolidated financial data via RPC
async function fetchFinancials(tenantId: string, year: string): Promise<StatementData> {
  const db = createClient();
  const { data, error } = await db.rpc('generate_financial_statements', { 
    p_tenant_id: tenantId, 
    p_year: parseInt(year) 
  });
  
  if (error) throw error;
  return data as StatementData;
}

export default function FinancialStatements({ tenantId, currency }: { tenantId: string; currency: string }) {
  const [year, setYear] = React.useState(new Date().getFullYear().toString());
  
  const { data, isLoading } = useQuery({
    queryKey: ['financial-statements', tenantId, year],
    queryFn: () => fetchFinancials(tenantId, year)
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-slate-400"/></div>;
  if (!data) return <div className="p-8 text-center text-red-500">Failed to load financial data.</div>;

  return (
    <Card className="h-full print:shadow-none print:border-none">
      <CardHeader className="flex flex-row items-center justify-between print:hidden">
        <div>
          <CardTitle>Financial Statements</CardTitle>
          <CardDescription>Consolidated financial reporting for Fiscal Year {year}</CardDescription>
        </div>
        <div className="flex gap-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2, 3].map(i => {
                const y = new Date().getFullYear() - i;
                return <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              })}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handlePrint}>
            <Printer className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="income_statement" className="w-full">
          <TabsList className="grid w-full grid-cols-2 print:hidden">
            <TabsTrigger value="income_statement">Income Statement (P&L)</TabsTrigger>
            <TabsTrigger value="balance_sheet">Balance Sheet</TabsTrigger>
          </TabsList>

          {/* Income Statement Tab */}
          <TabsContent value="income_statement" className="space-y-4">
            <div className="border rounded-md p-6 bg-white">
              <h3 className="text-xl font-bold text-center mb-6 uppercase tracking-wider">Profit & Loss Statement</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount ({currency})</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-slate-50 font-semibold"><TableCell colSpan={2}>Revenue</TableCell></TableRow>
                  {data.incomeStatement.filter(r => r.type === 'INCOME').map((row, i) => (
                    <TableRow key={i}><TableCell className="pl-8">{row.category}</TableCell><TableCell className="text-right">{row.amount.toLocaleString()}</TableCell></TableRow>
                  ))}
                  
                  <TableRow className="bg-slate-50 font-semibold"><TableCell colSpan={2}>Operating Expenses</TableCell></TableRow>
                  {data.incomeStatement.filter(r => r.type === 'EXPENSE').map((row, i) => (
                    <TableRow key={i}><TableCell className="pl-8">{row.category}</TableCell><TableCell className="text-right">({row.amount.toLocaleString()})</TableCell></TableRow>
                  ))}
                  
                  <TableRow className="border-t-2 border-black font-bold text-lg">
                    <TableCell>Net Income</TableCell>
                    <TableCell className={data.netIncome >= 0 ? "text-right text-green-700" : "text-right text-red-700"}>
                      {currency} {data.netIncome.toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Balance Sheet Tab */}
          <TabsContent value="balance_sheet" className="space-y-4">
            <div className="border rounded-md p-6 bg-white">
              <h3 className="text-xl font-bold text-center mb-6 uppercase tracking-wider">Balance Sheet</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <Table>
                    <TableHeader><TableRow><TableHead className="font-bold text-black">Assets</TableHead><TableHead></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {data.balanceSheet.filter(r => r.type === 'ASSET').map((row, i) => (
                        <TableRow key={i}><TableCell>{row.category}</TableCell><TableCell className="text-right">{row.amount.toLocaleString()}</TableCell></TableRow>
                      ))}
                      <TableRow className="font-bold bg-slate-50"><TableCell>Total Assets</TableCell><TableCell className="text-right">{data.totalAssets.toLocaleString()}</TableCell></TableRow>
                    </TableBody>
                  </Table>
                </div>
                <div>
                  <Table>
                    <TableHeader><TableRow><TableHead className="font-bold text-black">Liabilities & Equity</TableHead><TableHead></TableHead></TableRow></TableHeader>
                    <TableBody>
                      <TableRow className="bg-slate-50 font-semibold"><TableCell colSpan={2}>Liabilities</TableCell></TableRow>
                      {data.balanceSheet.filter(r => r.type === 'LIABILITY').map((row, i) => (
                        <TableRow key={i}><TableCell>{row.category}</TableCell><TableCell className="text-right">{row.amount.toLocaleString()}</TableCell></TableRow>
                      ))}
                      <TableRow className="font-bold"><TableCell>Total Liabilities</TableCell><TableCell className="text-right">{data.totalLiabilities.toLocaleString()}</TableCell></TableRow>

                      <TableRow className="bg-slate-50 font-semibold"><TableCell colSpan={2}>Equity</TableCell></TableRow>
                      {data.balanceSheet.filter(r => r.type === 'EQUITY').map((row, i) => (
                        <TableRow key={i}><TableCell>{row.category}</TableCell><TableCell className="text-right">{row.amount.toLocaleString()}</TableCell></TableRow>
                      ))}
                      <TableRow className="font-bold"><TableCell>Total Equity</TableCell><TableCell className="text-right">{data.totalEquity.toLocaleString()}</TableCell></TableRow>
                      
                      <TableRow className="border-t-2 border-black font-bold">
                        <TableCell>Total Liab. & Equity</TableCell>
                        <TableCell className="text-right">{currency} {(data.totalLiabilities + data.totalEquity).toLocaleString()}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}