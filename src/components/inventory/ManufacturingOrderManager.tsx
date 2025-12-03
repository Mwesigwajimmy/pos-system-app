'use client';

import React, { useState, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, X, Factory } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export interface ManufacturingOrder {
  id: string;
  moNumber: string;
  outputSku: string;
  productName: string;
  quantity: number;
  plannedStart: string;
  plannedFinish: string;
  status: string;
  workCenter: string;
  entity: string;
  country: string;
  tenantId: string;
}

interface ManufacturingOrderManagerProps {
  initialData: ManufacturingOrder[];
}

export default function ManufacturingOrderManager({ initialData }: ManufacturingOrderManagerProps) {
  const [orders] = useState<ManufacturingOrder[]>(initialData || []);
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() =>
    orders.filter(
      o =>
        o.productName.toLowerCase().includes(filter.toLowerCase()) ||
        o.moNumber.toLowerCase().includes(filter.toLowerCase()) ||
        o.entity.toLowerCase().includes(filter.toLowerCase())
    ),
    [orders, filter]
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Factory className="h-5 w-5" />
          Manufacturing Order Manager
        </CardTitle>
        <CardDescription>Real-time production tracking and order status.</CardDescription>
        <div className="relative mt-3 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search orders by MO#, product, or entity..." 
            value={filter} 
            onChange={e => setFilter(e.target.value)} 
            className="pl-8"
          />
          {filter && (
            <X 
              className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" 
              onClick={() => setFilter("")}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>MO #</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Work Center</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>Finish</TableHead>
                <TableHead>Entity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No active manufacturing orders found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono font-medium">{o.moNumber}</TableCell>
                    <TableCell>{o.productName}</TableCell>
                    <TableCell>{o.quantity}</TableCell>
                    <TableCell>
                      <Badge variant={o.status === 'complete' || o.status === 'finished' ? 'default' : 'secondary'}>
                        {o.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{o.workCenter}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(o.plannedStart).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(o.plannedFinish).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{o.entity}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}