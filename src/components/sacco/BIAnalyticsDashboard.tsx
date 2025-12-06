'use client';

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Users, Wallet, Briefcase, TrendingUp, AlertTriangle, Activity } from "lucide-react";

interface BIStats {
    active_members: number;
    total_deposits: number;
    total_loans: number;
    delinquency_rate: number;
    portfolio_at_risk: number;
    staff_productivity_score: number;
    reporting_currency: string; // Enterprise: API tells us the currency
}

async function fetchBI(tenantId: string) {
  const db = createClient();
  const { data, error } = await db.rpc('get_sacco_analytics', { p_tenant_id: tenantId });
  if (error) throw new Error("Failed to load analytics");
  return data as BIStats; 
}

const StatCard = ({ title, value, icon: Icon, color, subtext }: any) => (
    <div className="p-4 bg-white rounded-xl border shadow-sm flex items-start space-x-4 transition-all hover:shadow-md">
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

export default function BIAnalyticsDashboard({ tenantId }: { tenantId: string }) {
  const { data, isLoading, isError } = useQuery({ 
      queryKey: ['bi-dashboard', tenantId], 
      queryFn: () => fetchBI(tenantId),
      staleTime: 60000 // Cache 1 min
  });

  if (isLoading) return <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400"/></div>;
  if (isError) return <div className="p-4 text-red-500 bg-red-50 rounded">System Metrics Unavailable. Please check connection.</div>;

  const currency = data?.reporting_currency || 'USD';
  const formatMoney = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(val);

  return (
    <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Performance Overview ({currency})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard title="Active Members" value={data?.active_members || 0} icon={Users} color="bg-blue-600" subtext="KYC Verified" />
            <StatCard title="Total Deposits" value={formatMoney(data?.total_deposits || 0)} icon={Wallet} color="bg-green-600" subtext="Across all products" />
            <StatCard title="Loan Portfolio" value={formatMoney(data?.total_loans || 0)} icon={Briefcase} color="bg-indigo-600" subtext="Principal Outstanding" />
            <StatCard title="Delinquency Rate" value={`${data?.delinquency_rate || 0}%`} icon={AlertTriangle} color={(data?.delinquency_rate || 0) > 5 ? "bg-red-600" : "bg-amber-500"} subtext="Loans > 30 days due" />
            <StatCard title="Portfolio at Risk" value={formatMoney(data?.portfolio_at_risk || 0)} icon={TrendingUp} color="bg-orange-600" subtext="Value at risk" />
            <StatCard title="Staff Efficiency" value={data?.staff_productivity_score || 0} icon={Activity} color="bg-cyan-600" subtext="Clients / Officer" />
        </div>
    </div>
  )
}