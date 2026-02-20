'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, FilePen, Trash2, AlertCircle, Fingerprint, Zap } from 'lucide-react'; // Upgrade: Added Forensic Icons
import { cn } from '@/lib/utils';

// --- TYPES ---
interface AuditStats {
  high_risk_actions_24h: number;
  updates_today: number;
  deletions_this_week: number;
  forensic_anomalies_24h?: number; // Upgrade: Added Parity for SQL Trigger output
}

interface KpiCardProps {
  title: string;
  value: number | undefined;
  description: string;
  icon: React.ElementType;
  valueClassName?: string;
  isAutonomous?: boolean; // Upgrade: Visual flag for Trigger-based data
}

// --- API FUNCTION ---
async function fetchAuditStats(): Promise<AuditStats> {
  const supabase = createClient();
  
  // 1. Fetch original Administrative stats from your RPC
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_audit_log_stats').single();
  
  if (rpcError) {
    console.error('Error fetching audit stats:', rpcError);
    throw new Error('Could not retrieve audit statistics.');
  }

  // 2. Upgrade: Fetch real-time count from your Forensic Guard Invention
  // This looks at the 'sovereign_audit_anomalies' table populated by your trg_ledger_forensics
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: anomalyCount } = await supabase
    .from('sovereign_audit_anomalies')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', twentyFourHoursAgo);

  return {
    ...(rpcData as AuditStats),
    forensic_anomalies_24h: anomalyCount || 0
  };
}

// --- KPI CARD COMPONENT ---
const KpiCard = ({ title, value, description, icon: Icon, valueClassName, isAutonomous }: KpiCardProps) => (
  <Card className={cn(isAutonomous && "border-primary/20 bg-primary/[0.02] shadow-md shadow-primary/5")}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div className="flex items-center gap-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {isAutonomous && <Zap className="h-3 w-3 text-primary animate-pulse fill-current" />}
      </div>
      <Icon className={cn("h-4 w-4", isAutonomous ? "text-primary" : "text-muted-foreground")} />
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
    refetchInterval: 60 * 1000, // Upgrade: Faster polling (1m) to catch Forensic Triggers
  });

  const kpiConfig = [
    // NEW UPGRADE: Forensic Guard Status
    {
      title: "Forensic Anomalies (24h)",
      value: data?.forensic_anomalies_24h,
      description: "Autonomous ledger fraud indicators.",
      icon: Fingerprint,
      valueClassName: cn("text-primary", (data?.forensic_anomalies_24h || 0) > 0 && "text-red-600 animate-pulse"),
      isAutonomous: true
    },
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
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"> {/* Upgrade: Layout expanded to 4 cols */}
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