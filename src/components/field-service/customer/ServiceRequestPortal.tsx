'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchRequests, createRequest, ServiceRequest } from '@/lib/actions/service-requests'; // Import Server Actions

interface TenantContext { 
  tenantId: string; 
  country: string;
}

export default function ServiceRequestPortal({
  customerId,
  tenant,
}: {
  customerId: string;
  tenant: TenantContext;
}) {
  const queryClient = useQueryClient();
  
  // 1. Fetching Data
  const { data: requests, isLoading } = useQuery({
    queryKey: ['my-service-requests', customerId, tenant.tenantId],
    queryFn: () => fetchRequests(customerId, tenant.tenantId),
  });

  // 2. Form State
  const [desc, setDesc] = useState('');
  const [site, setSite] = useState('');
  const [urgent, setUrgent] = useState(false);

  // 3. Create Mutation
  const mutation = useMutation({
    mutationFn: () => createRequest({
      customer_id: customerId, 
      description: desc, 
      site, 
      urgent, 
      tenant_id: tenant.tenantId
    }),
    onSuccess: () => {
      toast.success('Service request submitted successfully');
      setDesc(''); 
      setSite(''); 
      setUrgent(false);
      // FIXED: v5 Syntax
      queryClient.invalidateQueries({ queryKey: ['my-service-requests', customerId, tenant.tenantId] });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to submit request'),
  });

  const getStatusBadge = (status: string) => {
    switch(status.toLowerCase()) {
      case 'new': return <Badge>New</Badge>;
      case 'in_progress': return <Badge variant="secondary" className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'completed': return <Badge variant="outline" className="text-green-600 border-green-600">Resolved</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
      {/* Create Request Form */}
      <Card className="lg:col-span-1 h-fit">
        <CardHeader>
          <CardTitle>New Service Request</CardTitle>
          <CardDescription>Report an issue or request maintenance.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="site">Site / Location</Label>
            <Input 
              id="site" 
              placeholder="e.g. Main Lobby AC" 
              value={site} 
              onChange={e=>setSite(e.target.value)} 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="desc">Description of Issue</Label>
            <Textarea 
              id="desc" 
              placeholder="Describe the problem in detail..." 
              value={desc} 
              onChange={e=>setDesc(e.target.value)} 
              className="min-h-[100px]"
            />
          </div>

          <div className="flex items-center space-x-2 border p-3 rounded-md bg-muted/30">
            <Switch 
              id="urgent" 
              checked={urgent} 
              onCheckedChange={setUrgent} 
            />
            <Label htmlFor="urgent" className="font-medium cursor-pointer">Mark as Urgent Priority</Label>
          </div>

          <Button 
            onClick={() => mutation.mutate()} 
            disabled={mutation.isPending || !desc || !site} 
            className="w-full"
          >
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            Submit Request
          </Button>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Request History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead className="w-[40%]">Description</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && requests?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="h-5 w-5 opacity-50" />
                        No service requests found.
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {requests?.map((r: ServiceRequest) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(r.status)}
                        {r.urgent && <Badge variant="destructive" className="w-fit text-[10px] px-1 py-0 h-4">URGENT</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{r.site}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.description}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}