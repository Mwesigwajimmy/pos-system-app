'use client';

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Loader2, Search, X, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface OrderReturn {
  id: string;
  returnNumber: string;
  orderNumber: string;
  customer: string;
  reason: string;
  requested: string;
  approvedBy: string;
  status: "pending" | "approved" | "rejected" | "completed";
  processedAt?: string;
  entity: string;
  region: string;
  tenantId: string;
}

export default function OrderReturnsWorkflow() {
  const [returns, setReturns] = useState<OrderReturn[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setReturns([
        {
          id: "ret-001",
          returnNumber: "RET-38872",
          orderNumber: "ORD-UG-712",
          customer: "ABC Stores",
          reason: "Wrong item shipped",
          requested: "2025-11-10",
          approvedBy: "cs@main.co",
          status: "approved",
          processedAt: "2025-11-12",
          entity: "Main Comp Ltd.",
          region: "UG",
          tenantId: "tenant-001"
        },
        {
          id: "ret-002",
          returnNumber: "RET-25817",
          orderNumber: "ORD-AU-3232",
          customer: "EasternTech",
          reason: "Faulty product",
          requested: "2025-11-04",
          approvedBy: "",
          status: "pending",
          entity: "Global Branch AU",
          region: "AU",
          tenantId: "tenant-002"
        }
      ]);
      setLoading(false);
    }, 320);
  }, []);

  const filtered = useMemo(
    () =>
      returns.filter(
        r =>
          r.customer.toLowerCase().includes(filter.toLowerCase()) ||
          r.orderNumber.toLowerCase().includes(filter.toLowerCase()) ||
          r.region.toLowerCase().includes(filter.toLowerCase())
      ),
    [returns, filter]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Returns Workflow</CardTitle>
        <CardDescription>
          Track returns, RMA requests, approvals and completions globally.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Filter by customer/order/region..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8"/>
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={()=>setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
        {loading ?
          <div className="flex py-10 justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
          : <ScrollArea className="h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Return #</TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Approved By</TableHead>
                    <TableHead>Processed</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Region</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0
                    ? <TableRow><TableCell colSpan={10}>No returns found.</TableCell></TableRow>
                    : filtered.map(r => (
                        <TableRow key={r.id}>
                          <TableCell>{r.returnNumber}</TableCell>
                          <TableCell>{r.orderNumber}</TableCell>
                          <TableCell>{r.customer}</TableCell>
                          <TableCell>{r.requested}</TableCell>
                          <TableCell>
                            {r.status === "completed" && <span className="text-green-800 font-bold">Completed</span>}
                            {r.status === "approved" && <span className="text-blue-700">{r.status}</span>}
                            {r.status === "pending" && <span className="text-yellow-800">{r.status}</span>}
                            {r.status === "rejected" && <span className="text-red-700">{r.status}</span>}
                          </TableCell>
                          <TableCell>{r.reason}</TableCell>
                          <TableCell>{r.approvedBy}</TableCell>
                          <TableCell>{r.processedAt || ""}</TableCell>
                          <TableCell>{r.entity}</TableCell>
                          <TableCell>{r.region}</TableCell>
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