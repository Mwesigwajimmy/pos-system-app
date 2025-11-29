'use client';

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CycleCountEntry {
  id: string;
  warehouse: string;
  product: string;
  sku: string;
  scheduledDate: string;
  countedBy: string;
  countedQty: number;
  recordedQty: number;
  variance: number;
  status: "scheduled" | "done" | "reconciled";
  notes?: string;
  entity: string;
  country: string;
  tenantId: string;
}

export default function CycleCountProgram() {
  const [counts, setCounts] = useState<CycleCountEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setCounts([
        {
          id: "ccp-001",
          warehouse: "Central Depot",
          product: "ACME Widget",
          sku: "SKU-77832",
          scheduledDate: "2025-11-22",
          countedBy: "warehouse@main.co",
          countedQty: 402,
          recordedQty: 403,
          variance: -1,
          status: "done",
          entity: "Main Comp Ltd.",
          country: "UG",
          tenantId: "tenant-001"
        },
        {
          id: "ccp-002",
          warehouse: "Sydney Fulfillment",
          product: "UltraWidget",
          sku: "SKU-11011",
          scheduledDate: "2025-11-20",
          countedBy: "logistics@global.com",
          countedQty: 287,
          recordedQty: 287,
          variance: 0,
          status: "reconciled",
          entity: "Global Branch AU",
          country: "AU",
          tenantId: "tenant-002"
        }
      ]);
      setLoading(false);
    }, 350);
  }, []);
  const filtered = useMemo(
    () => counts.filter(
      c =>
        c.product.toLowerCase().includes(filter.toLowerCase()) ||
        c.sku.toLowerCase().includes(filter.toLowerCase()) ||
        c.warehouse.toLowerCase().includes(filter.toLowerCase())
    ),
    [counts, filter]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cycle Count Program</CardTitle>
        <CardDescription>
          Modern cycle counting with variance, by warehouse/product/entity.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Filter by product/SKU/warehouse..." value={filter} onChange={e=>setFilter(e.target.value)} className="pl-8"/>
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={()=>setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="flex py-10 justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
          : <ScrollArea className="h-56">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Counted By</TableHead>
                    <TableHead>Counted</TableHead>
                    <TableHead>System</TableHead>
                    <TableHead>Variance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Country</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0
                    ? <TableRow><TableCell colSpan={12}>No cycle counts found.</TableCell></TableRow>
                    : filtered.map(c => (
                        <TableRow key={c.id}>
                          <TableCell>{c.warehouse}</TableCell>
                          <TableCell>{c.product}</TableCell>
                          <TableCell>{c.sku}</TableCell>
                          <TableCell>{c.scheduledDate}</TableCell>
                          <TableCell>{c.countedBy}</TableCell>
                          <TableCell>{c.countedQty}</TableCell>
                          <TableCell>{c.recordedQty}</TableCell>
                          <TableCell>{c.variance}</TableCell>
                          <TableCell>{c.status}</TableCell>
                          <TableCell>{c.notes || ""}</TableCell>
                          <TableCell>{c.entity}</TableCell>
                          <TableCell>{c.country}</TableCell>
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