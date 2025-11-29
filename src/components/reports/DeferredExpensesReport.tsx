'use client';

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DeferredExpenseRow {
  id: string;
  vendor: string;
  bill: string;
  recognized: number;
  unrecognized: number;
  startDate: string;
  endDate: string;
  currency: string;
  entity: string;
  country: string;
  period: string;
  tenantId: string;
}

export default function DeferredExpensesReport() {
  const [rows, setRows] = useState<DeferredExpenseRow[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setTimeout(() => {
      setRows([
        {
          id: "defexprep-001",
          vendor: "Acme Rentals",
          bill: "BILL-UG-101",
          recognized: 1350000,
          unrecognized: 4050000,
          startDate: "2025-10-01",
          endDate: "2026-09-30",
          currency: "UGX",
          entity: "Main Comp Ltd.",
          country: "UG",
          period: "2025-11",
          tenantId: "tenant-001"
        },
        {
          id: "defexprep-002",
          vendor: "Global Insurance",
          bill: "BILL-AU-200",
          recognized: 600,
          unrecognized: 1800,
          startDate: "2025-09-01",
          endDate: "2026-08-31",
          currency: "AUD",
          entity: "Global Branch AU",
          country: "AU",
          period: "2025-11",
          tenantId: "tenant-002"
        }
      ]);
      setLoading(false);
    }, 350);
  }, []);
  const filtered = useMemo(
    () =>
      rows.filter(
        row =>
          row.vendor.toLowerCase().includes(filter.toLowerCase()) ||
          row.entity.toLowerCase().includes(filter.toLowerCase()) ||
          row.bill.toLowerCase().includes(filter.toLowerCase())
      ),
    [rows, filter]
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Deferred Expenses Report</CardTitle>
        <CardDescription>
          Amortization/capitalized expense analysis, by period and entity.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Filter by vendor/entity/bill..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8"/>
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => setFilter('')}/>}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex py-14 justify-center"><Loader2 className="h-10 w-10 animate-spin"/></div>
        ) : (
          <ScrollArea className="h-80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Bill</TableHead>
                  <TableHead>Recognized</TableHead>
                  <TableHead>Unrecognized</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Period</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0
                  ? <TableRow><TableCell colSpan={10}>No entries found.</TableCell></TableRow>
                  : filtered.map(row => (
                    <TableRow key={row.id}>
                      <TableCell>{row.vendor}</TableCell>
                      <TableCell>{row.bill}</TableCell>
                      <TableCell>{row.recognized.toLocaleString()} {row.currency}</TableCell>
                      <TableCell>{row.unrecognized.toLocaleString()} {row.currency}</TableCell>
                      <TableCell>{row.startDate}</TableCell>
                      <TableCell>{row.endDate}</TableCell>
                      <TableCell>{row.currency}</TableCell>
                      <TableCell>{row.entity}</TableCell>
                      <TableCell>{row.country}</TableCell>
                      <TableCell>{row.period}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}