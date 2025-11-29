'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchTechniciansWithLocation, fetchUnassignedWorkOrders, assignWorkOrder, Technician, WorkOrderLocation } from '@/lib/actions/scheduler';

interface TenantContext {
  tenantId: string;
}

// Haversine formula to calculate distance in KM
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
  const R = 6371; // Radius of earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function SmartScheduler({ tenant }: { tenant: TenantContext }) {
  const queryClient = useQueryClient();
  const [selectedWO, setSelectedWO] = useState<number | null>(null);

  // 1. Fetch Real Data
  const { data: technicians, isLoading: loadingTechs } = useQuery({ 
    queryKey: ['fs-techs', tenant.tenantId], 
    queryFn: () => fetchTechniciansWithLocation(tenant.tenantId) 
  });
  
  const { data: openWOs, isLoading: loadingWOs } = useQuery({ 
    queryKey: ['wo-unassigned', tenant.tenantId], 
    queryFn: () => fetchUnassignedWorkOrders(tenant.tenantId) 
  });

  // 2. AI/Smart Logic (Client Side Calculation on Real Data)
  const techRanking = useMemo(() => {
    if (!selectedWO || !openWOs || !technicians) return [];
    
    const targetJob = openWOs.find((wo) => wo.id === selectedWO);
    if (!targetJob) return [];

    return technicians
      .map((t) => ({
        ...t,
        distance: calculateDistance(t.lat, t.lng, targetJob.lat, targetJob.lng),
        // Simple scoring: Distance (lower is better) + Load (lower is better)
        score: calculateDistance(t.lat, t.lng, targetJob.lat, targetJob.lng) + (t.current_job_count * 5)
      }))
      .sort((a, b) => a.score - b.score); // Sort by best score (lowest)
  }, [selectedWO, technicians, openWOs]);

  // 3. Assignment Mutation
  const mutation = useMutation({
    mutationFn: ({ woId, techId }: { woId: number; techId: string }) => 
      assignWorkOrder(woId, techId, tenant.tenantId),
    onSuccess: () => {
      toast.success('Work order assigned successfully');
      setSelectedWO(null);
      // FIXED: v5 Syntax
      queryClient.invalidateQueries({ queryKey: ['wo-unassigned', tenant.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['fs-techs', tenant.tenantId] });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to assign'),
  });

  if (loadingTechs || loadingWOs) return <Loader2 className="animate-spin mx-auto mt-10" />;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" /> Smart Dispatch
        </CardTitle>
        <CardDescription>Select a pending job to see the best available technicians based on location and workload.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <label className="text-sm font-medium mb-1 block">Pending Work Orders</label>
          <select 
            className="w-full border rounded-md p-2 bg-background" 
            value={selectedWO ?? ''} 
            onChange={e => setSelectedWO(Number(e.target.value))}
          >
            <option value="">-- Select a Job to Assign --</option>
            {openWOs?.map((wo: WorkOrderLocation) => (
              <option key={wo.id} value={wo.id}>
                {wo.reference} - {wo.address}
              </option>
            ))}
          </select>
        </div>

        {selectedWO && (
          <div className="rounded-md border animate-in slide-in-from-bottom-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Technician</TableHead>
                  <TableHead>Current Load</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Recommendation</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {techRanking.map((t, index) => (
                  <TableRow key={t.id} className={index === 0 ? "bg-green-50/50" : ""}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{t.current_job_count} active jobs</TableCell>
                    <TableCell>{t.distance.toFixed(1)} km</TableCell>
                    <TableCell>
                        {index === 0 && <Badge className="bg-green-600">Best Match</Badge>}
                        {index === 1 && <Badge variant="secondary">Good</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        onClick={() => mutation.mutate({ woId: selectedWO, techId: t.id })} 
                        disabled={mutation.isPending}
                      >
                        {mutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Assign"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}