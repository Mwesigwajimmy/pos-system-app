'use client';

import React, { useMemo, useState } from 'react';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Download, Search, ArrowUpDown, TrendingUp, TrendingDown 
} from 'lucide-react';

// --- MOVED TYPES HERE & EXPORTED THEM ---
export type AgingBucket = '0-30' | '31-60' | '61-90' | '90+';

export interface AgingRecord {
  id: string;
  type: 'Receivable' | 'Payable';
  name: string; // Customer or Vendor Name
  reference: string; // Invoice # or Bill #
  currency: string;
  total_amount: number;
  days_overdue: number;
  bucket: AgingBucket;
  created_at: string;
}

export interface AgingSummary {
  currency: string;
  total_receivables: number;
  total_payables: number;
}
// ----------------------------------------

interface AgingReportsProps {
  initialData: AgingRecord[];
  summaries: AgingSummary[];
}

export default function AgingReportsClient({ initialData, summaries }: AgingReportsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // --- Utility: Currency Formatter ---
  const formatMoney = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  // --- Logic: Filtering & Sorting ---
  const filteredData = useMemo(() => {
    let data = initialData.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reference.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return data.sort((a, b) => {
      // Sort by Days Overdue
      return sortOrder === 'desc' 
        ? b.days_overdue - a.days_overdue 
        : a.days_overdue - b.days_overdue;
    });
  }, [initialData, searchTerm, sortOrder]);

  const receivables = filteredData.filter(d => d.type === 'Receivable');
  const payables = filteredData.filter(d => d.type === 'Payable');

  // --- Logic: Export to CSV ---
  const handleExport = () => {
    const headers = ["Type", "Name", "Reference", "Currency", "Total Amount", "Days Overdue", "Bucket", "Date"];
    const csvContent = [
      headers.join(","),
      ...filteredData.map(row => [
        row.type,
        `"${row.name}"`, // Escape quotes
        row.reference,
        row.currency,
        row.total_amount,
        row.days_overdue,
        row.bucket,
        row.created_at
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `aging_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // --- Sub-Component: The Data Table ---
  const AgingTable = ({ data }: { data: AgingRecord[] }) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Entity / Name</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>
              <div 
                className="flex items-center cursor-pointer hover:text-primary"
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              >
                Days Overdue
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </div>
            </TableHead>
            <TableHead>Bucket</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No records found.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={`${row.type}-${row.id}`}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{row.name}</span>
                    <span className="text-xs text-muted-foreground">{row.type}</span>
                  </div>
                </TableCell>
                <TableCell>{row.reference}</TableCell>
                <TableCell>
                  <span className={row.days_overdue > 60 ? "text-red-600 font-bold" : ""}>
                    {row.days_overdue} days
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={
                    row.bucket === '90+' ? 'destructive' : 
                    row.bucket === '61-90' ? 'secondary' : 'outline'
                  }>
                    {row.bucket}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatMoney(row.total_amount, row.currency)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 1. Summary Cards (KPIs) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {summaries.map((s) => (
          <Card key={s.currency}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Totals ({s.currency})
              </CardTitle>
              <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded">{s.currency}</span>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center text-sm text-green-600">
                  <TrendingUp className="mr-1 h-4 w-4" /> Receivables
                </div>
                <div className="text-xl font-bold">{formatMoney(s.total_receivables, s.currency)}</div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center text-sm text-red-600">
                  <TrendingDown className="mr-1 h-4 w-4" /> Payables
                </div>
                <div className="text-xl font-bold">{formatMoney(s.total_payables, s.currency)}</div>
              </div>
            </CardContent>
          </Card>
        ))}
        {summaries.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No outstanding financials found.
            </CardContent>
          </Card>
        )}
      </div>

      {/* 2. Controls & Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search customer, vendor, or invoice..." 
            className="pl-8" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* 3. Tabbed Data View */}
      <Tabs defaultValue="receivables" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="receivables">Receivables (In)</TabsTrigger>
          <TabsTrigger value="payables">Payables (Out)</TabsTrigger>
        </TabsList>
        
        <TabsContent value="receivables" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Aged Receivables</CardTitle>
              <CardDescription>
                Outstanding invoices owed to you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AgingTable data={receivables} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="payables" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Aged Payables</CardTitle>
              <CardDescription>
                Outstanding bills you owe to vendors.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AgingTable data={payables} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}