'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
// Import Server Actions
import { fetchWorkOrders, updateWorkOrderLifecycle, WorkOrder, WorkOrderStatus } from '@/lib/actions/work-orders';

interface TenantContext {
  tenantId: string;
  country: string;
  currency: string;
}

export default function WorkOrderLifecycleManager({ tenant, currentUser }: { tenant: TenantContext, currentUser: string }) {
  const [comment, setComment] = useState('');
  const queryClient = useQueryClient();

  // 1. Fetch Data
  // FIX: Called without arguments because the Server Action derives tenant securely from session
  const { data: workOrders, isLoading, isError } = useQuery({
    queryKey: ['work-orders', tenant.tenantId],
    queryFn: () => fetchWorkOrders(), 
  });

  // 2. Lifecycle Mutation
  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: WorkOrderStatus }) =>
      updateWorkOrderLifecycle(id, status, currentUser, comment),
    onSuccess: (_, variables) => {
      toast.success(`Status updated to ${variables.status}`);
      setComment('');
      // FIXED: v5 Syntax
      queryClient.invalidateQueries({ queryKey: ['work-orders', tenant.tenantId] });
    },
    onError: (e: Error) => toast.error(e.message || "Workflow error"),
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'completed': return 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200';
      case 'canceled': return 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200';
      case 'scheduled': return 'bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Work Order Lifecycle Manager</CardTitle>
      </CardHeader>
      <CardContent>
        {isError && (
            <div className="flex items-center gap-2 p-4 text-red-600 bg-red-50 rounded-md mb-4 border border-red-100">
                <AlertCircle className="h-5 w-5" /> 
                <span className="text-sm font-medium">Failed to load work orders. Check permissions.</span>
            </div>
        )}
        
        <div className="rounded-md border shadow-sm">
            <Table>
            <TableHeader>
                <TableRow className="bg-muted/50">
                <TableHead className="w-[100px]">WO #</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead className="w-[280px]">Workflow Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <span className="text-sm">Loading workflow data...</span>
                        </div>
                    </TableCell>
                </TableRow>
                ) : (
                workOrders?.map((wo: WorkOrder) => (
                    <TableRow key={wo.id}>
                    <TableCell className="font-bold font-mono text-xs">{wo.work_order_uid || wo.id}</TableCell>
                    <TableCell>
                        <Badge variant="outline" className={getStatusColor(wo.status)}>
                            {wo.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{wo.technician_name}</TableCell>
                    <TableCell className="text-sm">{wo.customer_name}</TableCell>
                    <TableCell className="text-sm">
                        {wo.scheduled_at
                        ? new Date(wo.scheduled_at).toLocaleDateString()
                        : <span className="text-muted-foreground italic text-xs">Unscheduled</span>}
                    </TableCell>
                    <TableCell>
                        <div className="flex flex-col gap-2">
                            <Select 
                                disabled={mutation.isPending}
                                onValueChange={(val) => mutation.mutate({ id: wo.id, status: val as WorkOrderStatus })}
                            >
                                <SelectTrigger className="h-8 text-xs bg-background">
                                    <SelectValue placeholder="Change Status..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="scheduled">Schedule</SelectItem>
                                    <SelectItem value="en_route">En Route</SelectItem>
                                    <SelectItem value="in_progress">Start Work</SelectItem>
                                    <SelectItem value="paused">Pause Job</SelectItem>
                                    <SelectItem value="completed">Complete</SelectItem>
                                    <SelectItem value="canceled">Cancel</SelectItem>
                                </SelectContent>
                            </Select>
                            
                            {/* Conditional Comment Input for specific statuses */}
                            {(['paused', 'canceled', 'failed'].includes(wo.status) || mutation.isPending) && (
                                <Input 
                                    className="h-7 text-xs" 
                                    placeholder="Reason required..." 
                                    value={comment}
                                    onChange={e => setComment(e.target.value)}
                                    disabled={mutation.isPending}
                                />
                            )}
                        </div>
                    </TableCell>
                    </TableRow>
                ))
                )}
            </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}