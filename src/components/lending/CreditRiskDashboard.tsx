'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ShieldAlert, TrendingDown, Users, Activity } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface RiskMetrics {
  portfolio_score: number; // 0-100
  npl: number; // Percentage
  high_risk_count: number;
  segment_at_risk: string;
  total_exposure_at_risk: number;
}

async function fetchRisk(tenantId: string) {
  const db = createClient();
  const { data, error } = await db.rpc('credit_risk_dashboard', { tenant_id: tenantId });
  if (error) throw error;
  return data as RiskMetrics;
}

export function CreditRiskDashboard({ tenantId }: { tenantId: string }) {
  const { data, isLoading, isError } = useQuery({ 
    queryKey: ['credit-risk', tenantId], 
    queryFn: () => fetchRisk(tenantId) 
  });

  if (isLoading) return <div className="flex h-40 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  if (isError) return <div className="p-4 text-red-500 bg-red-50 rounded-md">System Error: Unable to calculate risk metrics.</div>;

  const nplColor = (data?.npl || 0) > 5 ? "text-red-600" : "text-green-600";
  const scoreColor = (data?.portfolio_score || 0) < 60 ? "bg-red-500" : "bg-blue-600";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Health Score</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.portfolio_score}/100</div>
            <Progress value={data?.portfolio_score} className={`h-2 mt-2 ${scoreColor}`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Non-Performing Loans (NPL)</CardTitle>
            <TrendingDown className={`h-4 w-4 ${nplColor}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${nplColor}`}>{data?.npl?.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">Threshold: 5.0%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Loans</CardTitle>
            <ShieldAlert className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.high_risk_count}</div>
            <p className="text-xs text-muted-foreground">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Segment at Risk</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">{data?.segment_at_risk || "None"}</div>
            <p className="text-xs text-muted-foreground">Highest default probability</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}