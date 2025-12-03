'use client';

import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShoppingCart, AlertTriangle, CheckCircle2, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ProductReorderEntry {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  vendorName: string;
  vendorLeadTime: number;
  status: string;
}

interface StockReplenishmentListProps {
  initialData: ProductReorderEntry[];
}

export default function StockReplenishmentList({ initialData }: StockReplenishmentListProps) {
  const [products] = useState<ProductReorderEntry[]>(initialData || []);
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => 
    products.filter(p => 
      p.name.toLowerCase().includes(filter.toLowerCase()) || 
      p.sku.toLowerCase().includes(filter.toLowerCase())
    ), 
  [products, filter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Replenishment</CardTitle>
        <CardDescription>Products below reorder point requiring action.</CardDescription>
        <div className="mt-2">
          <Input 
            placeholder="Search products..." 
            value={filter} 
            onChange={e => setFilter(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">ROP</TableHead>
                <TableHead className="text-right">Order Qty</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell>
                     {p.status === 'low_stock' ? 
                       <Badge variant="destructive" className="flex w-fit gap-1"><AlertTriangle className="w-3 h-3"/> Low</Badge> : 
                       <Badge variant="outline" className="flex w-fit gap-1 text-green-600 border-green-200"><CheckCircle2 className="w-3 h-3"/> OK</Badge>
                     }
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.sku}</div>
                  </TableCell>
                  <TableCell className="text-right">{p.currentStock}</TableCell>
                  <TableCell className="text-right">{p.reorderPoint}</TableCell>
                  <TableCell className="text-right">{p.reorderQuantity}</TableCell>
                  <TableCell>{p.vendorName}</TableCell>
                  <TableCell>
                    {p.status === 'low_stock' && (
                      <Button size="sm" className="gap-2"><ShoppingCart className="w-4 h-4" /> Order</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}