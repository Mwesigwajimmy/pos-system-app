'use client';

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Search, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TrialBalanceRow {
  id: string;
  account: string;
  entity: string;
  country: string;
  currency: string;
  opening: number;
  debit: number;
  credit: number;
  closing: number;
  tenantId: string;
  period: string;
}

export default function TrialBalanceReport() {
  const [rows, setRows] = useState<TrialBalanceRow[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setTimeout(() => {
      setRows([
        {
          id: "tbrow1", account: "Cash on Hand", entity: "Main Comp Ltd.", country: "UG",
          currency: "UGX", opening: 100000, debit: 600000, credit: 520000, closing: 180000,
          tenantId: "tenant-001", period: "2025-11"
        },
        {
          id: "tbrow2", account: "Sales Revenue", entity: "Global Branch AU", country: "AU",
          currency: "AUD", opening: 20000, debit: 0, credit: 48000, closing: -28000,
          tenantId: "tenant-002", period: "2025-11"
        }
      ]);
      setLoading(false);
    }, 350);
  }, []);
  const filtered = useMemo(
    () =>
      rows.filter(
        row =>
          row.account.toLowerCase().includes(filter.toLowerCase()) ||
          row.entity.toLowerCase().includes(filter.toLowerCase()) ||
          row.period.toLowerCase().includes(filter.toLowerCase())
      ),
    [rows, filter]
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trial Balance Report</CardTitle>
        <CardDescription>
          Multi-entity/country/currency trial balance for integrity and compliance at any close.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Filter by account/entity..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8"/>
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
                  <TableHead>Account</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Opening</TableHead>
                  <TableHead>Debit</TableHead>
                  <TableHead>Credit</TableHead>
                  <TableHead>Closing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0
                  ? <TableRow><TableCell colSpan={8}>No trial balance entries found.</TableCell></TableRow>
                  : filtered.map(row => (
                    <TableRow key={row.id}>
                      <TableCell>{row.account}</TableCell>
                      <TableCell>{row.entity}</TableCell>
                      <TableCell>{row.period}</TableCell>
                      <TableCell>{row.currency}</TableCell>
                      <TableCell>{row.opening.toLocaleString()}</TableCell>
                      <TableCell>{row.debit.toLocaleString()}</TableCell>
                      <TableCell>{row.credit.toLocaleString()}</TableCell>
                      <TableCell>{row.closing.toLocaleString()}</TableCell>
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