'use client';

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ValuationRow {
  id: string;
  product: string;
  sku: string;
  warehouse: string;
  valuationMethod: "Standard" | "FIFO" | "LIFO" | "Moving Average";
  quantity: number;
  unitCost: number;
  totalValue: number;
  entity: string;
  country: string;
  tenantId: string;
}

export default function InventoryValuationReport() {
  const [rows, setRows] = useState<ValuationRow[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setRows([
        {
          id: "val-001",
          product: "ACME Widget",
          sku: "SKU-77832",
          warehouse: "Central Depot",
          valuationMethod: "Moving Average",
          quantity: 348,
          unitCost: 8000,
          totalValue: 2784000,
          entity: "Main Comp Ltd.",
          country: "UG",
          tenantId: "tenant-001"
        },
        {
          id: "val-002",
          product: "UltraWidget",
          sku: "SKU-11011",
          warehouse: "Sydney Fulfillment",
          valuationMethod: "FIFO",
          quantity: 271,
          unitCost: 900,
          totalValue: 243900,
          entity: "Global Branch AU",
          country: "AU",
          tenantId: "tenant-002"
        }
      ]);
      setLoading(false);
    }, 380);
  }, []);

  const filtered = useMemo(
    () => rows.filter(
      r =>
        r.product.toLowerCase().includes(filter.toLowerCase()) ||
        r.sku.toLowerCase().includes(filter.toLowerCase()) ||
        r.entity.toLowerCase().includes(filter.toLowerCase())
    ),
    [rows, filter]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Valuation Report</CardTitle>
        <CardDescription>
          Track inventory value by product, warehouse, and valuation method. Ready for IFRS, US GAAP, tax.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Filter by product/SKU/entity..." value={filter} onChange={e=>setFilter(e.target.value)} className="pl-8"/>
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
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Valuation</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Country</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0
                    ? <TableRow><TableCell colSpan={9}>No inventory valuation data found.</TableCell></TableRow>
                    : filtered.map(r => (
                        <TableRow key={r.id}>
                          <TableCell>{r.product}</TableCell>
                          <TableCell>{r.sku}</TableCell>
                          <TableCell>{r.warehouse}</TableCell>
                          <TableCell>{r.valuationMethod}</TableCell>
                          <TableCell>{r.quantity}</TableCell>
                          <TableCell>{r.unitCost.toLocaleString()}</TableCell>
                          <TableCell>{r.totalValue.toLocaleString()}</TableCell>
                          <TableCell>{r.entity}</TableCell>
                          <TableCell>{r.country}</TableCell>
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