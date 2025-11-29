"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, Search, X, Factory } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/useTenant';

interface ProductionOrder {
  id: string;
  item_name: string;
  quantity: number;
  requested_by: string;
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  due_date: string;
  tenant_id: string;
  created_at: string;
}

interface Props {
  tenantId?: string;
}

export default function OrdersToMakeTable({ tenantId: propTenantId }: Props) {
  // 1. Context & Hooks
  const { data: tenant } = useTenant();
  const tenantId = propTenantId || tenant?.id;
  const supabase = createClient();

  // 2. State
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 3. Data Fetching
  useEffect(() => {
    if (!tenantId) return;

    const fetchOrders = async () => {
      try {
        // Fetching internal production/manufacturing orders
        const { data, error } = await supabase
          .from('inventory_production_orders')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('due_date', { ascending: true });

        if (error) throw error;
        if (data) setOrders(data as unknown as ProductionOrder[]);
      } catch (error) {
        console.error("Error fetching production orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [tenantId, supabase]);

  // 4. Filtering
  const filtered = useMemo(() =>
    orders.filter(o =>
      (o.item_name || '').toLowerCase().includes(filter.toLowerCase()) ||
      (o.requested_by || '').toLowerCase().includes(filter.toLowerCase()) ||
      (o.status || '').toLowerCase().includes(filter.toLowerCase())
    ),
    [orders, filter]
  );

  // 5. Action Handlers
  const handleApprove = async (orderId: string) => {
    setProcessingId(orderId);
    try {
      const { error } = await supabase
        .from('inventory_production_orders')
        .update({ status: 'approved' })
        .eq('id', orderId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // Optimistic Update
      setOrders(prev => 
        prev.map(o => o.id === orderId ? { ...o, status: 'approved' } : o)
      );
    } catch (error) {
      console.error("Failed to approve order:", error);
      alert("Failed to approve order. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  // 6. Helpers
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'in_progress':
        return <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 capitalize">{status.replace('_', ' ')}</Badge>;
      case 'completed':
      case 'received':
        return <Badge variant="default" className="bg-green-600 hover:bg-green-700 capitalize">{status}</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50 capitalize">{status}</Badge>;
      default:
        return <Badge variant="secondary" className="capitalize">{status}</Badge>;
    }
  };

  // 7. Loading State
  if (loading && !orders.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Orders To Make</CardTitle>
          <CardDescription>Loading production queue...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Factory className="h-5 w-5 text-gray-500" />
          Orders To Make
        </CardTitle>
        <CardDescription>
          Track internal requisitions and production orders requiring approval.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filter orders..." 
            value={filter} 
            onChange={e => setFilter(e.target.value)} 
            className="pl-8" 
          />
          {filter && (
            <X 
              className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" 
              onClick={() => setFilter('')}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] border rounded-md">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No production orders found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.item_name}</TableCell>
                    <TableCell>{o.quantity}</TableCell>
                    <TableCell className="text-muted-foreground">{o.requested_by}</TableCell>
                    <TableCell>{getStatusBadge(o.status)}</TableCell>
                    <TableCell>
                      {o.due_date ? format(new Date(o.due_date), "MMM d, yyyy") : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {o.status === 'pending' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => handleApprove(o.id)}
                          disabled={processingId === o.id}
                        >
                          {processingId === o.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="mr-1 h-4 w-4" /> Approve
                            </>
                          )}
                        </Button>
                      )}
                    </TableCell>
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