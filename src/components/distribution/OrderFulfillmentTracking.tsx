'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Loader2, Search, X, Package, Truck, CheckCircle, AlertOctagon } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from '@/components/ui/badge';

async function fetchFulfillment() {
  const { data, error } = await createClient().rpc('get_fulfillment_orders');
  if (error) throw error;
  return data;
}

export default function OrderFulfillmentTracking() {
  const [filter, setFilter] = useState('');
  const { data: orders, isLoading } = useQuery({ queryKey: ['fulfillmentOrders'], queryFn: fetchFulfillment });

  const filtered = useMemo(() => {
    if (!orders) return [];
    return orders.filter((f: any) =>
      (f.customer_name?.toLowerCase() || '').includes(filter.toLowerCase()) ||
      (f.order_number?.toLowerCase() || '').includes(filter.toLowerCase())
    );
  }, [orders, filter]);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'delivered': return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200"><CheckCircle className="w-3 h-3 mr-1"/> Delivered</Badge>;
      case 'in_transit': return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200"><Truck className="w-3 h-3 mr-1"/> In Transit</Badge>;
      case 'failed': return <Badge variant="destructive"><AlertOctagon className="w-3 h-3 mr-1"/> Failed</Badge>;
      default: return <Badge variant="secondary"><Package className="w-3 h-3 mr-1"/> Pending</Badge>;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Order Fulfillment Tracking</CardTitle>
        <CardDescription>Live tracking of orders from warehouse to customer.</CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Search Order # or Customer..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8"/>
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 cursor-pointer text-muted-foreground" onClick={()=>setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Delivered At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center h-24">No orders matching criteria.</TableCell></TableRow>
                ) : (
                  filtered.map((f: any) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono text-xs font-bold">{f.order_number}</TableCell>
                      <TableCell>{f.customer_name}</TableCell>
                      <TableCell>{getStatusBadge(f.status)}</TableCell>
                      <TableCell>{f.driver_name || 'Unassigned'}</TableCell>
                      <TableCell>{f.country_code}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {f.delivered_at ? new Date(f.delivered_at).toLocaleString() : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}