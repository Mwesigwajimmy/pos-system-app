'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { 
  Loader2, 
  Wallet, 
  TrendingDown, 
  PieChart, 
  Activity, 
  AlertCircle, 
  Briefcase,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// --- Types ---
interface TenantContext { 
  tenantId: string; 
  currency: string; 
}

interface ExecutiveMetrics {
  total_revenue: number;
  total_expenses: number;
  billable_utilization: number;
  pipeline_value: number;
  open_ar: number;
  open_projects: number;
}

// --- Data Fetching ---
async function fetchExecMetrics(tenantId: string): Promise<ExecutiveMetrics | null> {
  const db = createClient();
  
  // We use .maybeSingle() to gracefully handle cases where no metrics exist yet
  const { data, error } = await db
    .from('executive_metrics') // Assumes a view or table aggregating these stats
    .select(`
      total_revenue, 
      total_expenses, 
      billable_utilization, 
      pipeline_value, 
      open_ar, 
      open_projects
    `)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    console.error("Supabase Error:", error);
    throw new Error(error.message);
  }

  // Return defaults if no data found (avoids undefined crashes)
  if (!data) {
    return {
      total_revenue: 0,
      total_expenses: 0,
      billable_utilization: 0,
      pipeline_value: 0,
      open_ar: 0,
      open_projects: 0
    };
  }

  return data as ExecutiveMetrics;
}

// --- Sub-Component: Metric Card ---
// A reusable micro-component to keep the main code clean
const MetricItem = ({ 
  label, 
  value, 
  icon: Icon, 
  colorClass 
}: { 
  label: string; 
  value: React.ReactNode; 
  icon: any; 
  colorClass: string;
}) => (
  <div className="flex items-start space-x-3 p-3 rounded-lg border bg-slate-50/50 hover:bg-slate-50 transition-colors">
    <div className={`p-2 rounded-md ${colorClass} bg-opacity-10 border shadow-sm`}>
      <Icon className={`w-4 h-4 ${colorClass.replace('bg-', 'text-')}`} />
    </div>
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-slate-900">{value}</p>
    </div>
  </div>
);

// --- Main Component ---
export default function ExecutiveDashboard({ tenant }: { tenant: TenantContext }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["exec-dash", tenant.tenantId],
    queryFn: () => fetchExecMetrics(tenant.tenantId),
    retry: 2,
    staleTime: 1000 * 60 * 5, // Cache for 5 mins
  });

  // Helper for currency formatting
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: tenant.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="h-full w-full border-t-4 border-t-blue-600 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600"/> Executive Overview
        </CardTitle>
        <CardDescription>High-level financial performance and operational health.</CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-sm">Aggregating real-time metrics...</span>
          </div>
        ) : isError ? (
          <Alert variant="destructive" className="my-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unable to load dashboard</AlertTitle>
            <AlertDescription className="flex flex-col gap-2 mt-2">
              <span>{error?.message || "Data unavailable."}</span>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="w-fit h-7 text-xs bg-white">
                Retry Connection
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. Revenue */}
            <MetricItem 
              label="Total Revenue" 
              // FIX: Safe access using nullish coalescing (?? 0)
              value={formatMoney(data?.total_revenue ?? 0)}
              icon={Wallet}
              colorClass="bg-emerald-600 text-emerald-600"
            />

            {/* 2. Expenses */}
            <MetricItem 
              label="Total Expenses" 
              value={formatMoney(data?.total_expenses ?? 0)}
              icon={TrendingDown}
              colorClass="bg-red-600 text-red-600"
            />

            {/* 3. Pipeline */}
            <MetricItem 
              label="Pipeline Value" 
              value={formatMoney(data?.pipeline_value ?? 0)}
              icon={Activity}
              colorClass="bg-indigo-600 text-indigo-600"
            />

            {/* 4. Open A/R */}
            <MetricItem 
              label="Outstanding A/R" 
              value={formatMoney(data?.open_ar ?? 0)}
              icon={AlertCircle}
              colorClass="bg-amber-600 text-amber-600"
            />

            {/* 5. Utilization */}
            <MetricItem 
              label="Billable Utilization" 
              value={`${data?.billable_utilization ?? 0}%`}
              icon={PieChart}
              colorClass="bg-blue-600 text-blue-600"
            />

            {/* 6. Active Projects */}
            <MetricItem 
              label="Active Projects" 
              value={data?.open_projects ?? 0}
              icon={Briefcase}
              colorClass="bg-slate-700 text-slate-700"
            />

          </div>
        )}
      </CardContent>
    </Card>
  );
}