"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, X, TrendingUp, AlertCircle } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from "@/components/ui/badge";
import { createClient } from '@/lib/supabase/client';
import { format } from "date-fns";

interface UpsellOpportunity {
  id: string;
  item_name: string;
  target_context: string; // e.g., "Subscription", "Retail Bundle"
  reason: string;
  potential_revenue: number;
  currency: string;
  status: 'open' | 'actioned' | 'closed' | 'dismissed';
  recommendation_source: string; // e.g., "AI Engine", "Inventory Rules"
  created_at: string;
  tenant_id: string;
}

// FIX: Ensure interface matches the props passed by the parent
interface Props {
  businessId: string;
}

// FIX: Destructure businessId directly from Props
export default function OrdersToUpsellTable({ businessId }: Props) {
  const supabase = createClient();

  // 2. State
  const [opportunities, setOpportunities] = useState<UpsellOpportunity[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // 3. Data Fetching
  useEffect(() => {
    if (!businessId) return;

    const fetchOpportunities = async () => {
      try {
        // Fetching from a table designed to hold AI or rule-based suggestions
        const { data, error } = await supabase
          .from('sales_upsell_opportunities') 
          .select('*')
          // FIX: Use businessId to query tenant_id
          .eq('tenant_id', businessId)
          .neq('status', 'dismissed') // Usually hide dismissed ones by default
          .order('potential_revenue', { ascending: false }); // High value items first

        if (error) throw error;
        if (data) setOpportunities(data as unknown as UpsellOpportunity[]);
      } catch (error) {
        console.error("Error fetching upsell opportunities:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOpportunities();
  }, [businessId, supabase]);

  // 4. Filtering
  const filtered = useMemo(
    () =>
      opportunities.filter(
        o =>
          (o.item_name || '').toLowerCase().includes(filter.toLowerCase()) ||
          (o.target_context || '').toLowerCase().includes(filter.toLowerCase()) ||
          (o.reason || '').toLowerCase().includes(filter.toLowerCase()) ||
          (o.recommendation_source || '').toLowerCase().includes(filter.toLowerCase())
      ),
    [opportunities, filter]
  );

  // 5. Helpers
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600 bg-yellow-50">Open</Badge>;
      case 'actioned':
        return <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">Actioned</Badge>;
      case 'closed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Won</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // 6. Loading State
  if (loading && !opportunities.length) {
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
            <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div>
                    <CardTitle>Orders To Upsell</CardTitle>
                    <CardDescription>
                    Proactive revenue opportunities.
                    </CardDescription>
                </div>
            </div>
            
            <div className="relative w-full max-w-xs">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Filter opportunities..." 
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
                    <TableHead>Suggested Item</TableHead>
                    <TableHead>Context / Target</TableHead>
                    <TableHead>Trigger Reason</TableHead>
                    <TableHead className="text-right">Potential Rev.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Date Identified</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filtered.length === 0 ? (
                    <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                            <TrendingUp className="h-8 w-8 opacity-20" />
                            <p>No upsell opportunities found at this time.</p>
                        </div>
                    </TableCell>
                    </TableRow>
                ) : (
                    filtered.map(o => (
                    <TableRow key={o.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{o.item_name}</TableCell>
                        <TableCell className="text-muted-foreground">{o.target_context}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={o.reason}>
                        {o.reason}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-green-700">
                        {formatCurrency(o.potential_revenue, o.currency)}
                        </TableCell>
                        <TableCell>{getStatusBadge(o.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                        {o.recommendation_source}
                        </TableCell>
                        <TableCell className="text-xs">
                        {o.created_at ? format(new Date(o.created_at), 'MMM d, yyyy') : '-'}
                        </TableCell>
                    </TableRow>
                    ))
                )}
                </TableBody>
            </Table>
            </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}