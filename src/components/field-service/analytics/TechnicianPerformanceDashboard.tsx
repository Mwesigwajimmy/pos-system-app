'use client';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';

interface TenantContext { tenantId: string; currency: string; }

async function fetchTechPerformance(tenantId: string) {
  return [
    { tech: 'Alice', jobs: 34, utilization: 87, overtime: 4, nps: 51, ftf: 91, cost_per_job: 44 },
    { tech: 'Bob', jobs: 41, utilization: 91, overtime: 13, nps: 62, ftf: 85, cost_per_job: 62 },
  ];
}

export default function TechnicianPerformanceDashboard({ tenant }: { tenant: TenantContext }) {
  const { data: rows, isLoading } = useQuery({
    queryKey: ['tech-kpi', tenant.tenantId],
    queryFn: () => fetchTechPerformance(tenant.tenantId),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Technician Performance Dashboard</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Technician</TableHead>
              <TableHead>Jobs</TableHead>
              <TableHead>Utilization %</TableHead>
              <TableHead>Overtime (h)</TableHead>
              <TableHead>Customer NPS</TableHead>
              <TableHead>First-Time Fix %</TableHead>
              <TableHead>Cost/Job</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ?
              <TableRow><TableCell colSpan={7}><Loader2 className="animate-spin" /></TableCell></TableRow> :
              rows?.map((r:any)=>(
                <TableRow key={r.tech}>
                  <TableCell>{r.tech}</TableCell>
                  <TableCell>{r.jobs}</TableCell>
                  <TableCell>{r.utilization}%</TableCell>
                  <TableCell>{r.overtime}</TableCell>
                  <TableCell>{r.nps}</TableCell>
                  <TableCell>{r.ftf}</TableCell>
                  <TableCell>{tenant.currency} {r.cost_per_job}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}