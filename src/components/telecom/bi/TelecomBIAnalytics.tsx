'use client';

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Signal, Users, PhoneCall, AlertTriangle, TrendingUp } from "lucide-react";

interface TenantContext { tenantId: string }

interface TelecomStats {
    active_subscribers: number;
    churn_rate: number;
    network_utilization_pct: number;
    avg_revenue_per_user: number;
    dropped_call_rate: number;
    region_performance: Record<string, number>;
}

async function fetchBI(tenantId: string) {
  const db = createClient();
  const { data, error } = await db.rpc('get_telecom_analytics', { p_tenant_id: tenantId });
  
  if (error) {
      console.error("BI Error:", error);
      throw new Error("Failed to load telecom analytics");
  }
  return data as TelecomStats;
}

// Reusable Stat Card
const MetricCard = ({ title, value, icon: Icon, color, subtext }: any) => (
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

export function TelecomBIAnalytics({ tenantId }: { tenantId: string }) {
  const { data, isLoading, isError } = useQuery({ 
      queryKey: ['telecom-bi', tenantId], 
      queryFn: () => fetchBI(tenantId) 
  });

  if (isLoading) return <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400"/></div>;
  if (isError || !data) return <div className="p-6 text-center text-red-500 border rounded bg-red-50">Analytics unavailable.</div>;

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
          <CardTitle className="text-2xl font-bold text-slate-900">Network Operations Center</CardTitle>
          <CardDescription>Real-time performance metrics and subscriber insights.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <MetricCard 
                title="Active Subscribers" 
                value={data.active_subscribers.toLocaleString()} 
                icon={Users} 
                color="bg-blue-600"
                subtext="Current active MSISDNs"
            />

            <MetricCard 
                title="Network Utilization" 
                value={`${data.network_utilization_pct}%`} 
                icon={Signal} 
                color={data.network_utilization_pct > 80 ? "bg-red-600" : "bg-green-600"}
                subtext="Capacity usage load"
            />

            <MetricCard 
                title="Churn Rate" 
                value={`${data.churn_rate.toFixed(2)}%`} 
                icon={TrendingUp} 
                color="bg-orange-500"
                subtext="Monthly subscriber churn"
            />

            <MetricCard 
                title="Avg Revenue (ARPU)" 
                value={`$${data.avg_revenue_per_user.toFixed(2)}`} 
                icon={PhoneCall} 
                color="bg-purple-600"
                subtext="Per user monthly average"
            />

            <MetricCard 
                title="Dropped Call Rate" 
                value={`${data.dropped_call_rate}%`} 
                icon={AlertTriangle} 
                color={data.dropped_call_rate > 1 ? "bg-red-600" : "bg-green-600"}
                subtext="Quality of Service metric"
            />

        </div>
        
        {/* Regional Performance Placeholder */}
        <div className="mt-6 p-4 bg-slate-50 rounded-lg border">
            <h4 className="text-sm font-semibold mb-2">Regional Performance (ARPU)</h4>
            <div className="flex gap-4 flex-wrap">
                {Object.entries(data.region_performance || {}).map(([region, val]) => (
                    <div key={region} className="bg-white px-3 py-2 rounded shadow-sm text-sm border">
                        <span className="text-slate-500 mr-2">{region}:</span>
                        <span className="font-bold">${Number(val).toFixed(2)}</span>
                    </div>
                ))}
            </div>
        </div>

      </CardContent>
    </Card>
  )
}