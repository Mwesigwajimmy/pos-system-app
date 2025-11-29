'use client';

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Loader2, TrendingUp, AlertTriangle, Users, Globe } from "lucide-react";

interface BIAnalytics {
  active_loans: number;
  yield: number;
  default_rate: number;
  avg_disbursement_time: number;
  risk_country_summary: Record<string, number>;
  top_products: string[];
}

async function fetchBI(tenantId: string) {
  const db = createClient();
  const { data, error } = await db.rpc('lending_bi_analytics', { tenant_id: tenantId });
  if (error) throw error;
  return data as BIAnalytics;
}

export function BIAnalyticsDashboard({ tenantId }: { tenantId: string }) {
  const { data, isLoading, isError } = useQuery({ 
    queryKey: ['lending-bi', tenantId], 
    queryFn: () => fetchBI(tenantId) 
  });

  if (isLoading) return <div className="flex h-40 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  if (isError || !data) return <div className="p-4 text-red-500">Failed to load analytics.</div>;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.active_loans.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Current active portfolio</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Portfolio Yield</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.yield}%</div>
          <p className="text-xs text-muted-foreground">Annualized Return</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Default Rate (NPL)</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.default_rate}%</div>
          {/* FIX: Escaped the greater-than symbol */}
          <p className="text-xs text-muted-foreground">Loans &gt; 90 days overdue</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg. Disburse Time</CardTitle>
          <Globe className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.avg_disbursement_time} Days</div>
          <p className="text-xs text-muted-foreground">Application to Funding</p>
        </CardContent>
      </Card>
    </div>
  );
}