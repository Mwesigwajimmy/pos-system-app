'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, FilePen, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- TYPES ---
interface AuditStats {
  high_risk_actions_24h: number;
  updates_today: number;
  deletions_this_week: number;
}
interface KpiCardProps {
  title: string;
  value: number | undefined;
  description: string;
  icon: React.ElementType;
  valueClassName?: string;
}

// --- API FUNCTION ---
async function fetchAuditStats(): Promise<AuditStats> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_audit_log_stats').single();
  if (error) {
    console.error('Error fetching audit stats:', error);
    throw new Error('Could not retrieve audit statistics.');
  }
  return data as AuditStats;
}

// --- KPI CARD COMPONENT ---
const KpiCard = ({ title, value, description, icon: Icon, valueClassName }: KpiCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className={cn("text-2xl font-bold", valueClassName)}>
        {value !== undefined ? value.toLocaleString() : <Skeleton className="h-8 w-12" />}
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

export const KpiCardSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-4 rounded-full" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-12" />
      <Skeleton className="mt-2 h-3 w-24" />
    </CardContent>
  </Card>
);

KpiCard.Error = ({ title, icon: Icon }: { title: string; icon: React.ElementType }) => (
    <Card className="border-destructive">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">{title}</CardTitle>
            <Icon className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold text-destructive/80">-</div>
            <p className="text-xs text-destructive/80">Could not load data</p>
        </CardContent>
    </Card>
);

// --- MAIN COMPONENT ---
export default function AuditKpiCards() {
  const { data, isLoading, isError } = useQuery<AuditStats>({
    queryKey: ['auditStats'],
    queryFn: fetchAuditStats,
    refetchInterval: 5 * 60 * 1000, 
  });

  const kpiConfig = [
    {
      title: "High-Risk Actions (24h)",
      value: data?.high_risk_actions_24h,
      description: "Total record deletion events.",
      icon: ShieldAlert,
      valueClassName: "text-destructive"
    },
    {
      title: "Records Updated Today",
      value: data?.updates_today,
      description: "Total 'UPDATE' events since midnight.",
      icon: FilePen,
    },
    {
      title: "Deletions This Week",
      value: data?.deletions_this_week,
      description: "Total 'DELETE' events in the last 7 days.",
      icon: Trash2,
    }
  ];

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {isLoading ? (
        kpiConfig.map(config => <KpiCardSkeleton key={config.title} />)
      ) : isError ? (
        kpiConfig.map(config => <KpiCard.Error key={config.title} title={config.title} icon={config.icon} />)
      ) : (
        kpiConfig.map(config => <KpiCard key={config.title} {...config} />)
      )}
    </div>
  );
}