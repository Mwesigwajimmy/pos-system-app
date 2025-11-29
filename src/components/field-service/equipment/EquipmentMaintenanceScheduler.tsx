'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, CalendarClock, AlertTriangle, CheckCircle, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchMaintenanceCycles, scheduleMaintenance, MaintenanceCycle } from '@/lib/actions/maintenance';

interface TenantContext {
  tenantId: string;
}

export default function EquipmentMaintenanceScheduler({ tenant }: { tenant: TenantContext }) {
  const queryClient = useQueryClient();
  
  // 1. Fetch Data
  const { data: cycles, isLoading } = useQuery({
    queryKey: ['equipment-maint-cycles', tenant.tenantId],
    queryFn: () => fetchMaintenanceCycles(tenant.tenantId),
  });

  // Local state to track which row is being edited
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nextDue, setNextDue] = useState('');

  // 2. Schedule Mutation
  const mutation = useMutation({
    mutationFn: ({ equipment_id, next_due }: { equipment_id: number, next_due: string }) => 
      scheduleMaintenance(equipment_id, next_due, tenant.tenantId),
    onSuccess: () => {
      toast.success('Maintenance scheduled successfully!');
      setEditingId(null);
      setNextDue('');
      // FIXED: Correct v5 syntax
      queryClient.invalidateQueries({ queryKey: ['equipment-maint-cycles', tenant.tenantId] });
    },
    onError: (e: Error) => toast.error(e.message || 'Scheduling failed'),
  });

  // Helper to render status badges
  const getStatusBadge = (status: string, date: string) => {
    const isOverdue = new Date(date) < new Date();
    
    if (status === 'overdue' || isOverdue) {
      return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Overdue</Badge>;
    }
    if (status === 'scheduled') {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800 flex items-center gap-1"><CalendarClock className="h-3 w-3" /> Scheduled</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  const handleQuickAdd = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setNextDue(date.toISOString().split('T')[0]);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" />
          Planned Maintenance (PM) Scheduler
        </CardTitle>
        <CardDescription>
          Track and schedule recurring maintenance for assets. Scheduling triggers automatic Work Order creation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Name</TableHead>
                <TableHead>Serial #</TableHead>
                <TableHead>Last Service</TableHead>
                <TableHead>Next Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && cycles?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No maintenance cycles configured.
                  </TableCell>
                </TableRow>
              )}

              {cycles?.map((cyc: MaintenanceCycle) => (
                <TableRow key={cyc.id} className={cyc.status === 'overdue' ? 'bg-red-50/50' : ''}>
                  <TableCell className="font-medium">{cyc.equipment_name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{cyc.equipment_serial || '—'}</TableCell>
                  <TableCell>
                    {cyc.last_service ? new Date(cyc.last_service).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell className="font-mono">
                    {new Date(cyc.next_due).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{getStatusBadge(cyc.status, cyc.next_due)}</TableCell>
                  <TableCell className="text-right">
                    {editingId === cyc.id ? (
                      <div className="flex items-center justify-end gap-2 animate-in slide-in-from-right-5 fade-in">
                        <Input 
                          type="date" 
                          value={nextDue} 
                          onChange={e => setNextDue(e.target.value)} 
                          className="w-[140px] h-8" 
                        />
                        <Button 
                          size="sm" 
                          onClick={() => mutation.mutate({ equipment_id: cyc.equipment_id, next_due: nextDue })}
                          disabled={mutation.isPending || !nextDue}
                        >
                          {mutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>X</Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => { setEditingId(cyc.id); setNextDue(cyc.next_due.split('T')[0]); }}>
                        Reschedule
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {/* Legend / Info Footer */}
        <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Badge variant="destructive" className="h-2 w-2 p-0 rounded-full" /> Overdue
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="h-2 w-2 p-0 rounded-full bg-blue-100" /> Scheduled
          </div>
          <span className="ml-auto">
            *Scheduling creates a linked Work Order automatically.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}