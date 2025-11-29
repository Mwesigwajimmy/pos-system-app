'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchTechniciansWithLocation, fetchTechnicianRoute } from '@/lib/actions/scheduler';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TenantContext {
  tenantId: string;
}

interface Stop {
  work_order_id: number;
  address: string;
  lat: number;
  lng: number;
  reference: string;
}

export default function RouteOptimization({ tenant }: { tenant: TenantContext }) {
  const [selectedTech, setSelectedTech] = useState<string>('');
  const [optimizedRoute, setOptimizedRoute] = useState<Stop[]>([]);

  // 1. Fetch Technicians List
  const { data: technicians } = useQuery({ 
    queryKey: ['fs-techs', tenant.tenantId], 
    queryFn: () => fetchTechniciansWithLocation(tenant.tenantId) 
  });

  // 2. Fetch Selected Tech's Jobs
  const { data: currentStops, isLoading: loadingStops } = useQuery({
    queryKey: ['tech-route', selectedTech],
    queryFn: () => fetchTechnicianRoute(selectedTech, tenant.tenantId),
    enabled: !!selectedTech
  });

  // 3. Optimization Logic (Nearest Neighbor Algorithm)
  const handleOptimize = () => {
    if (!currentStops || currentStops.length < 2) {
      toast.error('Not enough jobs to optimize');
      return;
    }

    const stops = [...currentStops];
    // Assuming start point is the first job (or tech home base in a full implementation)
    const sorted: Stop[] = [stops[0]]; 
    const remaining = stops.slice(1);
    
    let current = stops[0];

    while (remaining.length > 0) {
      // Find closest to current
      remaining.sort((a, b) => {
        const distA = Math.hypot(a.lat - current.lat, a.lng - current.lng);
        const distB = Math.hypot(b.lat - current.lat, b.lng - current.lng);
        return distA - distB;
      });

      const next = remaining.shift()!;
      sorted.push(next);
      current = next;
    }

    setOptimizedRoute(sorted);
    toast.success(`Route optimized: ${sorted.length} stops`);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" /> Route Optimization
        </CardTitle>
        <CardDescription>Reorder a technician's daily stops for efficiency.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-6">
          <Select value={selectedTech} onValueChange={setSelectedTech}>
            <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Technician" />
            </SelectTrigger>
            <SelectContent>
                {technicians?.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
            </SelectContent>
          </Select>
          
          <Button onClick={handleOptimize} disabled={!selectedTech || loadingStops}>
            {loadingStops ? <Loader2 className="animate-spin h-4 w-4" /> : "Optimize Sequence"}
          </Button>
        </div>

        <div className="space-y-4">
          {(!optimizedRoute.length ? currentStops : optimizedRoute)?.map((s: Stop, i: number) => (
            <div key={s.work_order_id} className="flex items-start gap-3 p-3 border rounded-lg bg-muted/20">
               <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                 {i + 1}
               </div>
               <div>
                 <p className="font-medium text-sm">{s.reference}</p>
                 <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {s.address || "No address"}
                 </p>
               </div>
            </div>
          ))}
          
          {selectedTech && currentStops?.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No active jobs found for this technician.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}