'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client'; // Client-side client for Storage/Realtime
import toast from 'react-hot-toast';

// Import Server Actions
import {
  fetchTechPerformance, fetchRequiredDocs, addDocument, fetchContracts, addContract,
  captureFeedback, fetchRequests, createRequest, fetchHistory, fetchCycles, scheduleMaintenance,
  fetchWorkOrders, updateWorkOrderLifecycle, fetchPartsUsage, addPartUsage, optimizeRouteAction,
  fetchPhotos, deletePhoto, uploadSignatureAction
} from '@/lib/actions/field-service';

interface TenantContext { tenantId: string; currency: string; country: string; }

// --- 1. Technician Performance Dashboard ---
export function TechnicianPerformanceDashboard({ tenant }: { tenant: TenantContext }) {
  const { data, isLoading } = useQuery({
    queryKey: ['tech-kpi', tenant.tenantId],
    queryFn: () => fetchTechPerformance(tenant.tenantId),
  });

  if (isLoading) return <Loader2 className="animate-spin" />;

  return (
    <Card>
      <CardHeader><CardTitle>Technician Performance</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Technician</TableHead>
              <TableHead>Jobs</TableHead>
              <TableHead>Utilization</TableHead>
              <TableHead>NPS</TableHead>
              <TableHead>FTF %</TableHead>
              <TableHead>Cost/Job</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((r: any) => (
              <TableRow key={r.tech}>
                <TableCell className="font-medium">{r.tech}</TableCell>
                <TableCell>{r.jobs}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${r.utilization}%` }} />
                    </div>
                    {r.utilization}%
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={r.nps > 50 ? 'default' : 'destructive'}>{r.nps}</Badge>
                </TableCell>
                <TableCell>{r.ftf}%</TableCell>
                <TableCell>{tenant.currency} {r.cost_per_job}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// --- 2. Regulatory Manager ---
export function RegulatoryComplianceManager({ workOrderId, tenant }: { workOrderId: number; tenant: TenantContext }) {
  const queryClient = useQueryClient();
  const { data: docs } = useQuery({
    queryKey: ['regul-docs', workOrderId],
    queryFn: () => fetchRequiredDocs(workOrderId, tenant.tenantId),
  });

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const mutation = useMutation({
    mutationFn: () => addDocument({ work_order_id: workOrderId, title, content, tenant_id: tenant.tenantId }),
    onSuccess: () => {
      toast.success('Document attached');
      setTitle(''); setContent('');
      queryClient.invalidateQueries({ queryKey: ['regul-docs'] });
    }
  });

  return (
    <Card>
      <CardHeader><CardTitle>Compliance Documents</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Input placeholder="Document Title" value={title} onChange={e=>setTitle(e.target.value)} />
          <Textarea placeholder="Content / Permit Details" value={content} onChange={e=>setContent(e.target.value)} />
          <Button onClick={()=>mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Attach
          </Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Preview</TableHead></TableRow></TableHeader>
          <TableBody>
            {docs?.map((doc: any) => (
              <TableRow key={doc.id}>
                <TableCell>{doc.title}</TableCell>
                <TableCell className="text-muted-foreground">{doc.content?.slice(0, 50)}...</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// --- 3. Warranty Manager ---
export function WarrantyManager({ equipmentId, tenant }: { equipmentId: number; tenant: TenantContext }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['warranty', equipmentId],
    queryFn: () => fetchContracts(equipmentId, tenant.tenantId),
  });

  const [title, setTitle] = useState('');
  const mutation = useMutation({
    mutationFn: () => addContract({ equipment_id: equipmentId, title, active: true, tenant_id: tenant.tenantId }),
    onSuccess: () => {
      toast.success('Warranty Added');
      setTitle('');
      queryClient.invalidateQueries({ queryKey: ['warranty'] });
    }
  });

  return (
    <Card>
      <CardHeader><CardTitle>Warranty Contracts</CardTitle></CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input placeholder="Contract Title" value={title} onChange={e=>setTitle(e.target.value)} />
          <Button onClick={()=>mutation.mutate()}>Add</Button>
        </div>
        <div className="space-y-2">
          {data?.map((c: any) => (
            <div key={c.id} className="flex justify-between items-center p-2 border rounded">
              <span className="font-medium">{c.title}</span>
              <Badge variant={c.active ? 'default' : 'secondary'}>{c.active ? 'Active' : 'Expired'}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// --- 4. IoT Monitor (Realtime) ---
export function IoTDeviceMonitor({ equipmentId, tenant }: { equipmentId: number; tenant: TenantContext }) {
  const [telemetry, setTelemetry] = useState<any[]>([]);
  const [status, setStatus] = useState('Connecting...');

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`iot-equipment-${equipmentId}`)
      .on('broadcast', { event: 'telemetry' }, (payload) => {
        setTelemetry(prev => [payload.payload, ...prev].slice(0, 10));
      })
      .subscribe((status) => {
        setStatus(status === 'SUBSCRIBED' ? 'Live' : status);
      });

    return () => { supabase.removeChannel(channel); };
  }, [equipmentId]);

  return (
    <Card>
      <CardHeader><CardTitle>IoT Live Telemetry</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <div className={`h-3 w-3 rounded-full ${status === 'Live' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-sm font-medium">{status}</span>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Metric</TableHead><TableHead>Value</TableHead></TableRow></TableHeader>
          <TableBody>
            {telemetry.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Waiting for data...</TableCell></TableRow> : 
            telemetry.map((t, i) => (
              <TableRow key={i}>
                <TableCell>{new Date(t.ts).toLocaleTimeString()}</TableCell>
                <TableCell>{t.metric}</TableCell>
                <TableCell className="font-mono">{t.value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// --- 5. Route Optimization ---
export function RouteOptimization({ tenant }: { tenant: TenantContext }) {
  const [stops, setStops] = useState([
    { id: 101, address: 'Site A', lat: 40.71, lng: -74.00, order: 0 },
    { id: 102, address: 'Site B', lat: 40.75, lng: -73.98, order: 0 },
    { id: 103, address: 'Site C', lat: 40.73, lng: -74.05, order: 0 },
  ]);
  const [optimized, setOptimized] = useState(false);

  const handleOptimize = async () => {
    const res = await optimizeRouteAction('tech-1', stops, tenant.tenantId);
    setStops(res);
    setOptimized(true);
    toast.success('Route Optimized');
  };

  return (
    <Card>
      <CardHeader><CardTitle>Route Optimizer</CardTitle></CardHeader>
      <CardContent>
        <Button onClick={handleOptimize} className="mb-4">Optimize Route</Button>
        <div className="space-y-2">
          {stops.map((stop, index) => (
            <div key={stop.id} className="flex items-center p-3 border rounded bg-card">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-3 text-primary font-bold">
                {optimized ? index + 1 : '?'}
              </div>
              <div>
                <div className="font-semibold">WO-{stop.id}</div>
                <div className="text-sm text-muted-foreground">{stop.address}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// --- 6. Work Order Lifecycle Manager ---
export function WorkOrderLifecycleManager({ tenant, currentUser }: { tenant: TenantContext, currentUser: string }) {
  const queryClient = useQueryClient();
  const { data: orders, isLoading } = useQuery({
    queryKey: ['work-orders', tenant.tenantId],
    queryFn: () => fetchWorkOrders(tenant.tenantId),
  });

  const mutation = useMutation({
    mutationFn: ({ id, status, comment }: any) => updateWorkOrderLifecycle(id, status, currentUser, comment),
    onSuccess: () => {
      toast.success('Status Updated');
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
    },
    onError: (e:any) => toast.error(e.message)
  });

  if (isLoading) return <Loader2 className="animate-spin" />;

  return (
    <Card>
      <CardHeader><CardTitle>Work Order Lifecycle</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Technician</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders?.map((wo: any) => (
              <TableRow key={wo.id}>
                <TableCell className="font-medium">{wo.reference}</TableCell>
                <TableCell><Badge variant="outline">{wo.status}</Badge></TableCell>
                <TableCell>{wo.technician_name}</TableCell>
                <TableCell>
                  <Select onValueChange={(val) => mutation.mutate({ id: wo.id, status: val })}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Update..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Schedule</SelectItem>
                      <SelectItem value="in_progress">Start Work</SelectItem>
                      <SelectItem value="completed">Complete</SelectItem>
                      <SelectItem value="canceled">Cancel</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// --- 7. Signature Capture ---
export function SignatureCapture({ workOrderId, tenant }: { workOrderId: number; tenant: TenantContext }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDraw = (e: any) => {
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    if(ctx) {
      ctx.beginPath();
      ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    }
  };

  const draw = (e: any) => {
    if(!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if(ctx) {
      ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
      ctx.stroke();
    }
  };

  const save = async () => {
    if(!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], 'sig.png', { type: 'image/png' });
    
    // Upload to Supabase Storage
    const supabase = createClient();
    const path = `${tenant.tenantId}/wo/${workOrderId}/sig-${Date.now()}.png`;
    const { error } = await supabase.storage.from('signatures').upload(path, file);
    
    if(error) toast.error('Upload failed');
    else {
      const { data } = supabase.storage.from('signatures').getPublicUrl(path);
      await uploadSignatureAction(workOrderId, 'customer', data.publicUrl, tenant.tenantId);
      toast.success('Signature Saved');
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Customer Signature</CardTitle></CardHeader>
      <CardContent>
        <canvas 
          ref={canvasRef}
          width={400} height={150}
          className="border rounded bg-white cursor-crosshair touch-none"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={()=>setIsDrawing(false)}
        />
        <div className="mt-4 flex gap-2">
          <Button onClick={save}>Save Signature</Button>
          <Button variant="outline" onClick={()=>{
            const ctx = canvasRef.current?.getContext('2d');
            ctx?.clearRect(0,0,400,150);
          }}>Clear</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// --- 8. Offline Manager ---
export function OfflineManager() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const setOnline = () => setIsOnline(true);
    const setOffline = () => setIsOnline(false);
    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOffline);
    return () => {
      window.removeEventListener('online', setOnline);
      window.removeEventListener('offline', setOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <Alert variant="destructive" className="fixed bottom-4 right-4 w-96 shadow-lg z-50 bg-destructive text-destructive-foreground">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Offline Mode Active</AlertTitle>
      <AlertDescription>
        You are currently offline. Changes will be synced when connection is restored.
      </AlertDescription>
    </Alert>
  );
}