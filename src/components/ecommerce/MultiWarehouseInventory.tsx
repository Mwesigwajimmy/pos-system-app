'use client';

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WarehouseStock {
  id: string;
  warehouse: string;
  region: string;
  country: string;
  sku: string;
  product: string;
  quantity: number;
  reserved: number;
  available: number;
  entity: string;
  tenantId: string;
}

export default function MultiWarehouseInventory() {
  const [stock, setStock] = useState<WarehouseStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    setTimeout(() => {
      setStock([
        {
          id: "wh-001",
          warehouse: "Central Depot",
          region: "Central",
          country: "UG",
          sku: "SKU-77832",
          product: "ACME Widget",
          quantity: 403,
          reserved: 55,
          available: 348,
          entity: "Main Comp Ltd.",
          tenantId: "tenant-001"
        },
        {
          id: "wh-002",
          warehouse: "Sydney Fulfillment",
          region: "New South Wales",
          country: "AU",
          sku: "SKU-11011",
          product: "UltraWidget",
          quantity: 287,
          reserved: 16,
          available: 271,
          entity: "Global Branch AU",
          tenantId: "tenant-002"
        }
      ]);
      setLoading(false);
    }, 340);
  }, []);
  const filtered = useMemo(
    () => stock.filter(
      w =>
        w.product.toLowerCase().includes(filter.toLowerCase()) ||
        w.sku.toLowerCase().includes(filter.toLowerCase()) ||
        w.warehouse.toLowerCase().includes(filter.toLowerCase()) ||
        w.region.toLowerCase().includes(filter.toLowerCase())
    ),
    [stock, filter]
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Multi-Warehouse Inventory</CardTitle>
        <CardDescription>
          View live inventory by warehouse, location, reserved/booked by pending order.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Filter product/SKU/warehouse..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8"/>
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={()=>setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="flex py-12 justify-center"><Loader2 className="h-10 w-10 animate-spin"/></div>
          : <ScrollArea className="h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Reserved</TableHead>
                    <TableHead>Available</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0
                    ? <TableRow><TableCell colSpan={8}>No inventory found.</TableCell></TableRow>
                    : filtered.map(s => (
                        <TableRow key={s.id}>
                          <TableCell>{s.warehouse}</TableCell>
                          <TableCell>{s.region}</TableCell>
                          <TableCell>{s.country}</TableCell>
                          <TableCell>{s.sku}</TableCell>
                          <TableCell>{s.product}</TableCell>
                          <TableCell>{s.quantity}</TableCell>
                          <TableCell>{s.reserved}</TableCell>
                          <TableCell>{s.available}</TableCell>
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