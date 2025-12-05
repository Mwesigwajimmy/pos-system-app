"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from "@/components/ui/input";
import { Loader2, Search, X, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from '@/lib/supabase/client';
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

// FIX: Interface matches the parent component
interface Props {
  businessId: string;
}

// FIX: Destructure businessId directly
export default function PriceListTable({ businessId }: Props) {
  const supabase = createClient();

  // 2. State
  const [prices, setPrices] = useState<PriceEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // 3. Data Fetching
  useEffect(() => {
    if (!businessId) return;

    const fetchPrices = async () => {
      try {
        const { data, error } = await supabase
          .from('procurement_supplier_prices') // Assuming table name based on context
          .select('*')
          // FIX: Use businessId to query
          .eq('tenant_id', businessId)
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
  }, [businessId, supabase]);

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
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0 pt-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <CardTitle>Supplier Price List</CardTitle>
                <CardDescription>
                Compare historical and contracted prices across suppliers.
                </CardDescription>
            </div>
            
            <div className="relative w-full max-w-xs">
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
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <div className="rounded-md border">
            <ScrollArea className="h-[400px]">
            <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
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
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        No price list entries found.
                    </TableCell>
                    </TableRow>
                ) : (
                    filtered.map((p) => {
                    const isExpired = p.valid_until ? isPast(parseISO(p.valid_until)) : false;
                    
                    return (
                        <TableRow key={p.id} className="hover:bg-muted/50">
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
        </div>
      </CardContent>
    </Card>
  );
}