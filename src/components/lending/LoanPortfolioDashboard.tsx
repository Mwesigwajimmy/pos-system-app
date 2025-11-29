'use client';

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Wallet, PiggyBank, PieChart, AlertOctagon } from "lucide-react";

interface PortfolioMetrics {
  disbursed: number;
  outstanding: number;
  repaid: number;
  npl_ratio: number;
  activeLoans: number;
  dpd_30plus: number;
}

async function fetchPortfolio(tenantId: string) {
  const db = createClient();
  const { data, error } = await db.rpc('loan_portfolio_metrics', { tenant_id: tenantId });
  if (error) throw error; 
  return data as PortfolioMetrics;
}

const formatMoney = (amount: number) => new Intl.NumberFormat('en-US').format(amount);

export function LoanPortfolioDashboard({ tenantId }: { tenantId: string }) {
  const { data, isLoading } = useQuery({ 
    queryKey: ['portfolio', tenantId], 
    queryFn: () => fetchPortfolio(tenantId) 
  });

  if (isLoading) return <div className="p-4 text-muted-foreground">Loading portfolio data...</div>;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Disbursed</CardTitle>
          <Wallet className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">UGX {formatMoney(data?.disbursed || 0)}</div>
          <p className="text-xs text-muted-foreground">Lifetime volume</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Outstanding Principal</CardTitle>
          <PieChart className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">UGX {formatMoney(data?.outstanding || 0)}</div>
          <p className="text-xs text-muted-foreground">{data?.activeLoans} Active Loans</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Portfolio At Risk (30+)</CardTitle>
          <AlertOctagon className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data?.dpd_30plus} Loans</div>
          <p className="text-xs text-muted-foreground">NPL Ratio: {data?.npl_ratio?.toFixed(2)}%</p>
        </CardContent>
      </Card>
    </div>
  );
}