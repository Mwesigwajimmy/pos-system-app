'use client';

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Search, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TaxReportRow {
  id: string;
  entity: string;
  country: string;
  period: string;
  type: string;
  taxBase: number;
  taxDue: number;
  dueDate: string;
  status: string;
  currency: string;
  tenantId: string;
}

export default function TaxReport() {
  const [rows, setRows] = useState<TaxReportRow[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setTimeout(() => {
      setRows([
        {
          id: "tax-001",
          entity: "Main Comp Ltd.",
          country: "UG",
          period: "2025-10",
          type: "VAT",
          taxBase: 7500000,
          taxDue: 1350000,
          dueDate: "2025-11-15",
          status: "filed",
          currency: "UGX",
          tenantId: "tenant-001"
        },
        {
          id: "tax-002",
          entity: "Global Branch AU",
          country: "AU",
          period: "2025-10",
          type: "GST",
          taxBase: 25000,
          taxDue: 3000,
          dueDate: "2025-11-15",
          status: "pending",
          currency: "AUD",
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
          row.entity.toLowerCase().includes(filter.toLowerCase()) ||
          row.type.toLowerCase().includes(filter.toLowerCase()) ||
          row.country.toLowerCase().includes(filter.toLowerCase())
      ),
    [rows, filter]
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax Report</CardTitle>
        <CardDescription>
          VAT, GST, sales tax—filed and pending, per country, entity, and type.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Filter by entity/type..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8"/>
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => setFilter('')}/>}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex py-14 justify-center"><Loader2 className="h-10 w-10 animate-spin"/></div>
        : (
          <ScrollArea className="h-72">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Base</TableHead>
                  <TableHead>Tax Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0
                  ? <TableRow><TableCell colSpan={9}>No tax entries found.</TableCell></TableRow>
                  : filtered.map(row => (
                    <TableRow key={row.id}>
                      <TableCell>{row.entity}</TableCell>
                      <TableCell>{row.country}</TableCell>
                      <TableCell>{row.period}</TableCell>
                      <TableCell>{row.type}</TableCell>
                      <TableCell>{row.taxBase.toLocaleString()}</TableCell>
                      <TableCell>{row.taxDue.toLocaleString()}</TableCell>
                      <TableCell>{row.status}</TableCell>
                      <TableCell>{row.currency}</TableCell>
                      <TableCell>{row.dueDate}</TableCell>
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