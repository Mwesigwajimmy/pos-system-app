'use client';

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Users, Wallet, TrendingUp, AlertTriangle, Briefcase, Activity } from "lucide-react";

interface TenantContext { tenantId: string }

interface BIStats {
    active_members: number;
    total_deposits: number;
    total_loans: number;
    delinquency_rate: number;
    portfolio_at_risk: number;
    staff_productivity_score: number;
    currency: string;
}

async function fetchBI(tenantId: string) {
  const db = createClient();
  const { data, error } = await db.rpc('get_sacco_analytics', { p_tenant_id: tenantId });
  
  if (error) {
      console.error("BI Fetch Error:", error);
      throw new Error("Failed to load analytics");
  }
  return data as BIStats; // Ensure RPC returns single JSON object or row
}

// Sub-component for individual metric
const StatCard = ({ title, value, icon: Icon, color, subtext }: any) => (
    <div className="p-4 bg-white rounded-xl border shadow-sm flex items-start space-x-4">
        <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
            <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
            {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
        </div>
    </div>
);

export function BIAnalyticsDashboard({ tenantId }: { tenantId: string }) {
  const { data, isLoading, isError } = useQuery({ 
      queryKey: ['bi-dashboard', tenantId], 
      queryFn: () => fetchBI(tenantId),
      staleTime: 1000 * 60 * 5 // Cache for 5 mins
  });

  if (isLoading) return <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400"/></div>;
  if (isError || !data) return <div className="p-6 text-center text-red-500 border rounded bg-red-50">Analytics unavailable at this time.</div>;

  const formatMoney = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency || 'USD' }).format(val);

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
          <CardTitle className="text-2xl font-bold text-slate-900">Executive Insights</CardTitle>
          <CardDescription>Real-time performance metrics for the cooperative.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <StatCard 
                title="Active Membership" 
                value={data.active_members} 
                icon={Users} 
                color="bg-blue-600"
                subtext="Members with active accounts"
            />

            <StatCard 
                title="Total Deposits" 
                value={formatMoney(data.total_deposits)} 
                icon={Wallet} 
                color="bg-green-600"
                subtext="Current savings portfolio"
            />

            <StatCard 
                title="Loan Portfolio" 
                value={formatMoney(data.total_loans)} 
                icon={Briefcase} 
                color="bg-indigo-600"
                subtext="Total principal outstanding"
            />

            <StatCard 
                title="Delinquency Rate" 
                value={`${data.delinquency_rate}%`} 
                icon={AlertTriangle} 
                color={data.delinquency_rate > 5 ? "bg-red-600" : "bg-amber-500"}
                subtext="Loans past due > 30 days"
            />

            <StatCard 
                title="Portfolio at Risk (PAR)" 
                value={formatMoney(data.portfolio_at_risk)} 
                icon={TrendingUp} 
                color="bg-orange-600"
                subtext="Value of loans at risk"
            />

            <StatCard 
                title="Staff Productivity" 
                value={data.staff_productivity_score} 
                icon={Activity} 
                color="bg-cyan-600"
                subtext="Clients per loan officer"
            />

        </div>
      </CardContent>
    </Card>
  )
}