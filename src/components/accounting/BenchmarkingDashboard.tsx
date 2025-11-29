"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { Badge } from '@/components/ui/badge';

interface BenchmarkKPI {
  id: string;
  kpi_name: string;
  your_value: number;
  industry_median: number;
  peer_median: number;
  unit: string; // e.g., '%', 'Ratio', 'Days', 'USD'
  category: string; // e.g., 'Profitability', 'Liquidity'
  tenant_id: string;
}

interface Props {
  tenantId?: string;
}

export default function BenchmarkingDashboard({ tenantId: propTenantId }: Props) {
  // 1. Context & Hooks
  const { data: tenant } = useTenant();
  const tenantId = propTenantId || tenant?.id;
  const supabase = createClient();

  // 2. State
  const [metrics, setMetrics] = useState<BenchmarkKPI[]>([]);
  const [loading, setLoading] = useState(true);

  // 3. Data Fetching
  useEffect(() => {
    if (!tenantId) return;

    const fetchBenchmarks = async () => {
      try {
        // Fetching real benchmark data from the database
        const { data, error } = await supabase
          .from('accounting_benchmarks')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('category', { ascending: true });

        if (error) throw error;
        if (data) setMetrics(data as unknown as BenchmarkKPI[]);
      } catch (error) {
        console.error("Error fetching benchmark data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBenchmarks();
  }, [tenantId, supabase]);

  // 4. Helper for Formatting
  const formatValue = (value: number, unit: string) => {
    if (unit === '%') {
      return `${value.toFixed(2)}%`;
    }
    if (unit === 'USD' || unit === 'UGX' || unit === 'AUD') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: unit }).format(value);
    }
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  // 5. Loading State
  if (loading && !metrics.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Benchmarking Dashboard</CardTitle>
          <CardDescription>Loading industry comparisons...</CardDescription>
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
        <CardTitle>Benchmarking Dashboard</CardTitle>
        <CardDescription>
          Compare your KPIs to industry and peer medians—global, regional, by sector.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>KPI</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Your Value</TableHead>
              <TableHead className="text-right">Industry Median</TableHead>
              <TableHead className="text-right">Peer Median</TableHead>
              <TableHead className="text-center">Performance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No benchmark data available for this period.
                </TableCell>
              </TableRow>
            ) : (
              metrics.map((kpi) => {
                const diff = kpi.your_value - kpi.industry_median;
                const isPositive = diff > 0;
                const isNeutral = Math.abs(diff) < 0.1; // Tolerance for float equality

                return (
                  <TableRow key={kpi.id}>
                    <TableCell className="font-medium">{kpi.kpi_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal">
                        {kpi.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatValue(kpi.your_value, kpi.unit)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatValue(kpi.industry_median, kpi.unit)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatValue(kpi.peer_median, kpi.unit)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isNeutral ? (
                          <span className="text-gray-500 flex items-center text-sm font-medium">
                            <Minus className="w-4 h-4 mr-1" /> At Median
                          </span>
                        ) : isPositive ? (
                          <span className="text-green-600 flex items-center text-sm font-medium">
                            <TrendingUp className="w-4 h-4 mr-1" /> Above
                          </span>
                        ) : (
                          <span className="text-red-600 flex items-center text-sm font-medium">
                            <TrendingDown className="w-4 h-4 mr-1" /> Below
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}