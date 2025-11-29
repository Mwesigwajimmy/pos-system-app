'use client';

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PayrollBatch {
  id: string;
  entity: string;
  country: string;
  processed: string;
  type: string;
  employees: number;
  period: string;
  total: number;
  status: "draft" | "completed" | "processing";
  currency: string;
  tenantId: string;
}

export default function PayrollManager() {
  const [batches, setBatches] = useState<PayrollBatch[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setBatches([
        {
          id: "pb-001",
          entity: "Main Comp Ltd.",
          country: "UG",
          processed: "2025-11-22",
          type: "Monthly Payroll",
          employees: 101,
          period: "Nov 2025",
          total: 39985600,
          status: "completed",
          currency: "UGX",
          tenantId: "tenant-001"
        },
        {
          id: "pb-002",
          entity: "Global Branch AU",
          country: "AU",
          processed: "2025-11-01",
          type: "Monthly Payroll",
          employees: 30,
          period: "Nov 2025",
          total: 121800,
          status: "processing",
          currency: "AUD",
          tenantId: "tenant-002"
        }
      ]);
      setLoading(false);
    }, 370);
  }, []);

  const filtered = useMemo(
    () =>
      batches.filter(
        b =>
          b.entity.toLowerCase().includes(filter.toLowerCase()) ||
          b.country.toLowerCase().includes(filter.toLowerCase()) ||
          b.type.toLowerCase().includes(filter.toLowerCase())
      ),
    [batches, filter]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payroll Manager</CardTitle>
        <CardDescription>
          Run, track, and export payroll by entity, period, country and currency.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Filter by entity/type..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8"/>
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={()=>setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="flex py-10 justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
          : <ScrollArea className="h-80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Processed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0
                    ? <TableRow><TableCell colSpan={9}>No payroll batches found.</TableCell></TableRow>
                    : filtered.map(b => (
                        <TableRow key={b.id}>
                          <TableCell>
                            {b.status === "completed" && <span className="text-green-800 font-bold">Completed</span>}
                            {b.status === "draft" && <span className="text-neutral-800">Draft</span>}
                            {b.status === "processing" && <span className="text-blue-700 tracking-tight">Processing</span>}
                          </TableCell>
                          <TableCell>{b.type}</TableCell>
                          <TableCell>{b.period}</TableCell>
                          <TableCell>{b.entity}</TableCell>
                          <TableCell>{b.country}</TableCell>
                          <TableCell>{b.employees}</TableCell>
                          <TableCell>{b.total.toLocaleString()}</TableCell>
                          <TableCell>{b.currency}</TableCell>
                          <TableCell>{b.processed}</TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </ScrollArea>
        }
      </CardContent>
    </Card>
  );
}