'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// Import Logic and Types from the action file
import { fetchKPIData } from '@/lib/actions/analytics';

interface TenantContext { 
  tenantId: string; 
  currency: string; 
}

export default function WorkOrderKPIDashboard({ tenant }: { tenant: TenantContext }) {
  // Enterprise Grade: Caching configured via staleTime
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['wo-kpi', tenant.tenantId],
    queryFn: () => fetchKPIData(tenant.tenantId),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 2
  });

  // 1. Loading State
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Work Order KPI Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-40">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </CardContent>
      </Card>
    );
  }

  // 2. Error State (Solves 'undefined' crash)
  if (isError || !data) {
    return (
      <Card className="w-full border-destructive/50">
        <CardHeader>
          <CardTitle>Work Order KPI Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Data</AlertTitle>
            <AlertDescription>
              {(error as Error)?.message || 'Unable to fetch analytics data.'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // 3. Success State (Safe Render)
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Work Order KPI Dashboard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SLA Met</TableHead>
                <TableHead>First Time Fix</TableHead>
                <TableHead>Avg. Time (hr)</TableHead>
                <TableHead>On Time Arrival</TableHead>
                <TableHead>Cancel Rate</TableHead>
                <TableHead>Travel/Labor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                {/* Safe access using Optional Chaining (?.) and Null Coalescing (??) */}
                <TableCell>{data.slaMet?.toFixed(2) ?? '0.00'}%</TableCell>
                <TableCell>{data.firstTimeFixRate?.toFixed(1) ?? '0.0'}%</TableCell>
                <TableCell>{data.averageTimeToClose?.toFixed(1) ?? '0.0'}</TableCell>
                <TableCell>{data.onTimeArrivals?.toFixed(1) ?? '0.0'}%</TableCell>
                <TableCell>{data.cancelRate?.toFixed(1) ?? '0.0'}%</TableCell>
                <TableCell>{data.travelVsLabor?.toFixed(2) ?? '0.00'}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Jobs By Type
          </h3>
          {data.jobsByType && data.jobsByType.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {data.jobsByType.map((jt) => (
                <div key={jt.type} className="flex justify-between p-3 bg-muted/50 rounded-md">
                  <span className="font-medium text-sm">{jt.type}</span>
                  <span className="font-bold text-sm">{jt.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No job breakdown available.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}