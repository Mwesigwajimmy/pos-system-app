'use client';

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DeferredRevenueRow {
  id: string;
  customer: string;
  invoice: string;
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

export default function DeferredRevenueReport() {
  const [rows, setRows] = useState<DeferredRevenueRow[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setRows([
        {
          id: "defrevrep-001",
          customer: "JKL Solutions",
          invoice: "2025-UG-14",
          recognized: 4500000,
          unrecognized: 13500000,
          startDate: "2025-10-01",
          endDate: "2026-09-30",
          currency: "UGX",
          entity: "Main Comp Ltd.",
          country: "UG",
          period: "2025-11",
          tenantId: "tenant-001"
        },
        {
          id: "defrevrep-002",
          customer: "GreenTech Pty",
          invoice: "2025-AU-11",
          recognized: 1925,
          unrecognized: 5775,
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
          row.customer.toLowerCase().includes(filter.toLowerCase()) ||
          row.entity.toLowerCase().includes(filter.toLowerCase()) ||
          row.invoice.toLowerCase().includes(filter.toLowerCase())
      ),
    [rows, filter]
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Deferred Revenue Report</CardTitle>
        <CardDescription>
          Recognition status for all deferred revenues, by period and entity.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Filter by customer/entity/invoice..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8"/>
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
                  <TableHead>Customer</TableHead>
                  <TableHead>Invoice</TableHead>
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
                      <TableCell>{row.customer}</TableCell>
                      <TableCell>{row.invoice}</TableCell>
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