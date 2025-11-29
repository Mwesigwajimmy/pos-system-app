'use client';

import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Calendar, Navigation, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchTechnicianJobs, TechnicianJob, OfflineAction, syncOfflineChanges } from '@/lib/actions/technician';

interface TenantContext {
  tenantId: string;
  currency: string;
}

export default function MobileTechnicianDashboard({
  currentUser,
  tenant,
}: {
  currentUser: string;
  tenant: TenantContext;
}) {
  const queryClient = useQueryClient();

  // 1. Fetch Data
  const { data: jobs, isLoading, isError } = useQuery({
    queryKey: ['my-field-jobs', currentUser, tenant.tenantId],
    queryFn: () => fetchTechnicianJobs(currentUser, tenant.tenantId),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  // 2. Handle Status Change (The Smart Sync Logic)
  const handleStatusUpdate = async (jobId: number, newStatus: string) => {
    const isOffline = !navigator.onLine;

    if (isOffline) {
      // --- A. OFFLINE PATH ---
      const action: OfflineAction = {
        id: crypto.randomUUID(), // Generate ID for tracking
        operation: 'UPDATE_STATUS',
        timestamp: Date.now(),
        payload: {
          workOrderId: jobId,
          status: newStatus,
          // Capture current location if available (Enterprise requirement)
          lat: 0, 
          lng: 0 
        }
      };

      // Get current queue
      const existing = localStorage.getItem('field_service_sync_queue');
      const queue = existing ? JSON.parse(existing) : [];
      queue.push(action);
      
      // Save
      localStorage.setItem('field_service_sync_queue', JSON.stringify(queue));
      
      // Notify Sync Manager
      window.dispatchEvent(new Event('storage'));
      
      toast.success('Offline: Change saved to queue', { icon: '💾' });
      
      // Optimistic UI Update (Fake it for the user)
      queryClient.setQueryData(['my-field-jobs', currentUser, tenant.tenantId], (old: TechnicianJob[] | undefined) => {
        if (!old) return [];
        return old.map(j => j.id === jobId ? { ...j, status: newStatus } : j);
      });

    } else {
      // --- B. ONLINE PATH ---
      // In a real app, you might re-use syncOfflineChanges logic for consistency
      // or call a direct server action. Here we create a "queue of 1" to reuse logic.
      const action: OfflineAction = {
        id: crypto.randomUUID(),
        operation: 'UPDATE_STATUS',
        timestamp: Date.now(),
        payload: { workOrderId: jobId, status: newStatus, lat: 0, lng: 0 }
      };

      const results = await syncOfflineChanges([action], tenant.tenantId);
      
      if (results[0].success) {
        toast.success(`Job marked as ${newStatus}`);
        queryClient.invalidateQueries({ queryKey: ['my-field-jobs', currentUser, tenant.tenantId] });
      } else {
        toast.error('Update failed: ' + results[0].error);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'in_progress': return <Badge className="bg-blue-600 hover:bg-blue-700">In Progress</Badge>;
      case 'completed': return <Badge className="bg-green-600 hover:bg-green-700">Completed</Badge>;
      case 'en_route': return <Badge className="bg-amber-600 hover:bg-amber-700">En Route</Badge>;
      default: return <Badge variant="outline" className="capitalize">{status.replace('_', ' ')}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0 py-2">
          <CardTitle className="flex justify-between items-center text-xl">
            My Route
            {!isLoading && jobs && <Badge variant="secondary" className="ml-2">{jobs.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p>Loading schedule...</p>
            </div>
          )}

          {isError && (
            <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-lg text-destructive text-center">
              <AlertCircle className="h-6 w-6 mx-auto mb-2" />
              <p>Unable to load jobs. Check connection.</p>
            </div>
          )}

          {!isLoading && jobs?.length === 0 && (
            <div className="p-8 text-center border-2 border-dashed rounded-lg text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p>All caught up! No jobs assigned.</p>
            </div>
          )}

          {jobs?.map((job: TechnicianJob) => (
            <Card key={job.id} className="overflow-hidden transition-all hover:shadow-md border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold text-lg">{job.reference}</div>
                    <div className="text-sm font-medium text-muted-foreground">{job.customer_name}</div>
                  </div>
                  {getStatusBadge(job.status)}
                </div>

                <div className="grid grid-cols-1 gap-2 text-sm my-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium text-foreground">
                      {new Date(job.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                    </span>
                    <span>- {new Date(job.scheduled_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{job.address}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-3 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${job.lat},${job.lng}`, '_blank')}
                  >
                    <Navigation className="mr-2 h-4 w-4" /> Map
                  </Button>
                  
                  {job.status === 'scheduled' && (
                    <Button 
                      size="sm" 
                      className="flex-1" 
                      onClick={() => handleStatusUpdate(job.id, 'en_route')}
                    >
                      Start Travel
                    </Button>
                  )}
                  
                  {job.status === 'en_route' && (
                    <Button 
                      size="sm" 
                      className="flex-1 bg-blue-600 hover:bg-blue-700" 
                      onClick={() => handleStatusUpdate(job.id, 'in_progress')}
                    >
                      Start Job
                    </Button>
                  )}

                  {job.status === 'in_progress' && (
                    <Button 
                      size="sm" 
                      className="flex-1 bg-green-600 hover:bg-green-700" 
                      onClick={() => handleStatusUpdate(job.id, 'completed')} // In real app, this opens completion modal
                    >
                      Complete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}