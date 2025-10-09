// src/components/audit/AuditKpiCards.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, FilePen, Trash2 } from 'lucide-react';

// Define the shape of the data we expect from our SQL function
interface AuditStats {
  high_risk_actions_24h: number;
  updates_today: number;
  deletions_this_week: number;
}

// The function that fetches the data from Supabase
async function fetchAuditStats(): Promise<AuditStats> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_audit_log_stats').single();
  
  if (error) {
    console.error('Error fetching audit stats:', error);
    throw new Error('Could not retrieve audit statistics.');
  }
  // FIXED: Use a type assertion to tell TypeScript the shape of the returned data.
  return data as AuditStats;
}

// The main component
export default function AuditKpiCards() {
  const { data, isLoading, isError, error } = useQuery<AuditStats>({
    queryKey: ['auditStats'],
    queryFn: fetchAuditStats,
  });

  if (isLoading) {
    return <KpiCardSkeleton />;
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive bg-red-50 p-4 text-center text-sm text-destructive">
        <p className="font-bold">Failed to load audit statistics</p>
        <p>{error.message}</p>
      </div>
    );
  }

  // A guard clause to handle cases where data might be nullish without an error
  if (!data) {
    return <KpiCardSkeleton />;
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            High-Risk Actions (24h)
          </CardTitle>
          <ShieldAlert className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {data.high_risk_actions_24h}
          </div>
          <p className="text-xs text-muted-foreground">
            Total record deletion events.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Records Updated Today</CardTitle>
          <FilePen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.updates_today}</div>
          <p className="text-xs text-muted-foreground">
            Total 'UPDATE' events since midnight.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Deletions This Week</CardTitle>
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.deletions_this_week}</div>
          <p className="text-xs text-muted-foreground">
            Total 'DELETE' events in the last 7 days.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// A dedicated skeleton component for a polished loading experience
const KpiCardSkeleton = () => (
  <div className="grid gap-6 md:grid-cols-3">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-12" />
        <Skeleton className="mt-2 h-3 w-24" />
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-12" />
        <Skeleton className="mt-2 h-3 w-32" />
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-12" />
        <Skeleton className="mt-2 h-3 w-28" />
      </CardContent>
    </Card>
  </div>
);