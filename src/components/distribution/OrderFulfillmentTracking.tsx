'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Loader2, Search, X } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Fulfillment {
  id: string;
  orderNumber: string;
  customer: string;
  route: string;
  entity: string;
  country: string;
  status: "pending" | "in transit" | "delivered" | "failed";
  deliveredAt?: string;
  failedAt?: string;
  tenantId: string;
}

export default function OrderFulfillmentTracking() {
  const [fulfillments, setFulfillments] = useState<Fulfillment[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setFulfillments([
        {
          id: "ful-001",
          orderNumber: "ORD-UG-917",
          customer: "ABC Stores",
          route: "Kampala CBD",
          entity: "Main Comp Ltd.",
          country: "UG",
          status: "delivered",
          deliveredAt: "2025-11-14",
          tenantId: "tenant-001"
        },
        {
          id: "ful-002",
          orderNumber: "ORD-AU-1555",
          customer: "EasternTech",
          route: "Sydney East",
          entity: "Global Branch AU",
          country: "AU",
          status: "in transit",
          tenantId: "tenant-002"
        }
      ]);
      setLoading(false);
    }, 380);
  }, []);

  const filtered = useMemo(
    () =>
      fulfillments.filter(
        f =>
          f.customer.toLowerCase().includes(filter.toLowerCase()) ||
          f.orderNumber.toLowerCase().includes(filter.toLowerCase()) ||
          f.route.toLowerCase().includes(filter.toLowerCase()) ||
          f.entity.toLowerCase().includes(filter.toLowerCase())
      ),
    [fulfillments, filter]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Fulfillment Tracking</CardTitle>
        <CardDescription>
          Monitor every order’s status from packing to delivery, per route and entity.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Filter by customer/order/..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8"/>
          {filter && (
            <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer"
              onClick={()=>setFilter("")}/>)
          }
        </div>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
          : <ScrollArea className="h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Delivered</TableHead>
                    <TableHead>Failed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0
                    ? <TableRow><TableCell colSpan={8}>No orders found.</TableCell></TableRow>
                    : filtered.map(f => (
                        <TableRow key={f.id}>
                          <TableCell>{f.orderNumber}</TableCell>
                          <TableCell>{f.customer}</TableCell>
                          <TableCell>
                            {f.status === "delivered" && <span className="text-green-800 font-bold">Delivered</span>}
                            {f.status === "pending" && <span className="text-yellow-700">Pending</span>}
                            {f.status === "in transit" && <span className="text-blue-600">In Transit</span>}
                            {f.status === "failed" && <span className="text-red-700">Failed</span>}
                          </TableCell>
                          <TableCell>{f.route}</TableCell>
                          <TableCell>{f.entity}</TableCell>
                          <TableCell>{f.country}</TableCell>
                          <TableCell>{f.deliveredAt || ""}</TableCell>
                          <TableCell>{f.failedAt || ""}</TableCell>
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