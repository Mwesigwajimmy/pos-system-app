"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from "@/components/ui/input";
import { Loader2, Search, X, TrendingDown, TrendingUp, Minus, AlertCircle } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { Badge } from "@/components/ui/badge";
import { format, isPast, parseISO } from 'date-fns';

interface PriceEntry {
  id: string;
  item_name: string;
  supplier_name: string;
  last_price: number | null;
  current_price: number;
  currency: string;
  valid_until: string | null;
  tenant_id: string;
}

interface Props {
  tenantId?: string;
}

export default function PriceListTable({ tenantId: propTenantId }: Props) {
  // 1. Context & Hooks
  const { data: tenant } = useTenant();
  const tenantId = propTenantId || tenant?.id;
  const supabase = createClient();

  // 2. State
  const [prices, setPrices] = useState<PriceEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // 3. Data Fetching
  useEffect(() => {
    if (!tenantId) return;

    const fetchPrices = async () => {
      try {
        const { data, error } = await supabase
          .from('procurement_supplier_prices') // Assuming table name based on context
          .select('*')
          .eq('tenant_id', tenantId)
          .order('item_name', { ascending: true });

        if (error) throw error;
        if (data) setPrices(data as unknown as PriceEntry[]);
      } catch (error) {
        console.error("Error fetching supplier prices:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
  }, [tenantId, supabase]);

  // 4. Filtering
  const filtered = useMemo(
    () =>
      prices.filter(
        p =>
          (p.item_name || '').toLowerCase().includes(filter.toLowerCase()) ||
          (p.supplier_name || '').toLowerCase().includes(filter.toLowerCase())
      ),
    [prices, filter]
  );

  // 5. Helpers
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getPriceTrend = (current: number, last: number | null) => {
    if (!last) return <span className="text-muted-foreground text-xs"><Minus className="h-3 w-3 inline" /> New</span>;
    if (current > last) {
      return (
        <span className="text-red-600 text-xs flex items-center">
          <TrendingUp className="h-3 w-3 mr-1" />
          {((current - last) / last * 100).toFixed(1)}%
        </span>
      );
    }
    if (current < last) {
      return (
        <span className="text-green-600 text-xs flex items-center">
          <TrendingDown className="h-3 w-3 mr-1" />
          {((last - current) / last * 100).toFixed(1)}%
        </span>
      );
    }
    return <span className="text-gray-500 text-xs flex items-center"><Minus className="h-3 w-3 mr-1" /> Same</span>;
  };

  // 6. Loading State
  if (loading && !prices.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Supplier Price List</CardTitle>
          <CardDescription>Loading price data...</CardDescription>
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
        <CardTitle>Supplier Price List</CardTitle>
        <CardDescription>
          Compare historical and contracted prices across suppliers to enhance negotiation leverage.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filter by item or supplier..." 
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
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Last Price</TableHead>
                <TableHead className="text-right">Current Price</TableHead>
                <TableHead className="text-right">Trend</TableHead>
                <TableHead className="text-center">Validity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No price list entries found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  const isExpired = p.valid_until ? isPast(parseISO(p.valid_until)) : false;
                  
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.item_name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.supplier_name}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {p.last_price ? formatCurrency(p.last_price, p.currency) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(p.current_price, p.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          {getPriceTrend(p.current_price, p.last_price)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {p.valid_until ? (
                          isExpired ? (
                            <Badge variant="destructive" className="text-xs">
                              Expired {format(parseISO(p.valid_until), 'MMM d')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                              Valid until {format(parseISO(p.valid_until), 'MMM d, yyyy')}
                            </Badge>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}