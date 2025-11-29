'use client';

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, X, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ManufacturingOrder {
  id: string;
  moNumber: string;
  outputSku: string;
  productName: string;
  quantity: number;
  plannedStart: string;
  plannedFinish: string;
  status: "planned" | "in progress" | "complete" | "cancelled";
  workCenter: string;
  entity: string;
  country: string;
  tenantId: string;
}

export default function ManufacturingOrderManager() {
  const [orders, setOrders] = useState<ManufacturingOrder[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setTimeout(() => {
      setOrders([
        {
          id: "mo-001",
          moNumber: "MO-2025-1004",
          outputSku: "SKU-77832",
          productName: "ACME Widget",
          quantity: 200,
          plannedStart: "2025-12-01",
          plannedFinish: "2025-12-05",
          status: "planned",
          workCenter: "Plant A",
          entity: "Main Comp Ltd.",
          country: "UG",
          tenantId: "tenant-001"
        },
        {
          id: "mo-002",
          moNumber: "MO-2025-2001",
          outputSku: "SKU-11011",
          productName: "UltraWidget",
          quantity: 140,
          plannedStart: "2025-11-10",
          plannedFinish: "2025-11-16",
          status: "complete",
          workCenter: "Sydney Plant",
          entity: "Global Branch AU",
          country: "AU",
          tenantId: "tenant-002"
        }
      ]);
      setLoading(false);
    }, 390);
  }, []);
  const filtered = useMemo(
    () =>
      orders.filter(
        o =>
          o.productName.toLowerCase().includes(filter.toLowerCase()) ||
          o.moNumber.toLowerCase().includes(filter.toLowerCase()) ||
          o.entity.toLowerCase().includes(filter.toLowerCase())
      ),
    [orders, filter]
  );
  const closeOrder = (id: string) =>
    setOrders(os => os.map(o =>
      o.id === id ? { ...o, status: "complete" } : o
    ));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manufacturing Order Manager</CardTitle>
        <CardDescription>
          Create, track and complete MO/work orders, from BOM pick to finished goods—by plant, globally.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Filter by product/MO/plant..." value={filter} onChange={e=>setFilter(e.target.value)} className="pl-8"/>
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={()=>setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin"/></div>
          : <ScrollArea className="h-60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MO #</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>WorkCenter</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>Finish</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Close</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0
                    ? <TableRow><TableCell colSpan={10}>No manufacturing orders.</TableCell></TableRow>
                    : filtered.map(o => (
                        <TableRow key={o.id}>
                          <TableCell>{o.moNumber}</TableCell>
                          <TableCell>{o.productName}</TableCell>
                          <TableCell>{o.quantity}</TableCell>
                          <TableCell>
                            {o.status === "complete"
                              ? <span className="text-green-800 flex items-center gap-1"><CheckCircle2 className="h-4 w-4"/>Complete</span>
                              : o.status}
                          </TableCell>
                          <TableCell>{o.workCenter}</TableCell>
                          <TableCell>{o.plannedStart}</TableCell>
                          <TableCell>{o.plannedFinish}</TableCell>
                          <TableCell>{o.entity}</TableCell>
                          <TableCell>{o.country}</TableCell>
                          <TableCell>
                            {o.status !== "complete" &&
                              <Button size="sm" variant="secondary" onClick={()=>closeOrder(o.id)}>Complete</Button>
                            }
                          </TableCell>
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