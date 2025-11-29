'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, Search, X } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { ScrollArea } from "@/components/ui/scroll-area";

interface AgingRow {
  type: "Receivable" | "Payable";
  entity: string;
  country: string;
  currency: string;
  name: string;
  due_0_30: number;
  due_31_60: number;
  due_61_90: number;
  due_90_plus: number;
  total: number;
  tenantId: string;
}

export default function AgingReports() {
  const [rows, setRows] = useState<AgingRow[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setRows([
        { type: "Receivable", entity: "Main Comp Ltd.", country: "UG", currency: "UGX", name: "ABC Stores", due_0_30: 320000, due_31_60: 83000, due_61_90: 0, due_90_plus: 0, total: 403000, tenantId: "tenant-001" },
        { type: "Payable", entity: "Global Branch AU", country: "AU", currency: "AUD", name: "Acme Corp", due_0_30: 0, due_31_60: 1750, due_61_90: 500, due_90_plus: 0, total: 2250, tenantId: "tenant-002" }
      ]);
      setLoading(false);
    }, 400);
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter(
        r =>
          r.entity.toLowerCase().includes(filter.toLowerCase()) ||
          r.country.toLowerCase().includes(filter.toLowerCase()) ||
          r.name.toLowerCase().includes(filter.toLowerCase())
      ),
    [rows, filter]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aging (Aged Receivables & Payables)</CardTitle>
        <CardDescription>
          Days-outstanding analysis per entity, currency, and type.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Filter by entity/name..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8"/>
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => setFilter('')}/>}
        </div>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="flex py-12 justify-center"><Loader2 className="h-10 w-10 animate-spin"/></div>
          : (
            <ScrollArea className="h-72">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>0-30</TableHead>
                    <TableHead>31-60</TableHead>
                    <TableHead>61-90</TableHead>
                    <TableHead>90+</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0
                    ? <TableRow><TableCell colSpan={10}>No aging entries found.</TableCell></TableRow>
                    : filtered.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{row.type}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.entity}</TableCell>
                        <TableCell>{row.country}</TableCell>
                        <TableCell>{row.currency}</TableCell>
                        <TableCell>{row.due_0_30.toLocaleString()}</TableCell>
                        <TableCell>{row.due_31_60.toLocaleString()}</TableCell>
                        <TableCell>{row.due_61_90.toLocaleString()}</TableCell>
                        <TableCell>{row.due_90_plus.toLocaleString()}</TableCell>
                        <TableCell>{row.total.toLocaleString()}</TableCell>
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