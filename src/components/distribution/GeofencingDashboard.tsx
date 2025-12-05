'use client';

import React, { useState, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin, AlertCircle, CheckCircle2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { addGeofenceAction } from '@/lib/actions/distribution';

export interface Fence {
  id: string;
  name: string;
  country_code: string;
  driver_name: string;
  boundary_type: "circle" | "polygon";
  radius_km?: number;
  last_breach_at?: string;
  active: boolean;
}

interface Props {
  initialFences: Fence[];
}

export default function GeofencingDashboard({ initialFences }: Props) {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({ name: '', driver: '', country: '', radius: '5' });

  const handleAdd = () => {
    if (!formData.name || !formData.country) {
        toast.error("Name and Country are required");
        return;
    }
    startTransition(async () => {
        const form = new FormData();
        form.append('name', formData.name);
        form.append('driver', formData.driver);
        form.append('country', formData.country);
        form.append('radius', formData.radius);
        form.append('type', 'circle'); // Defaulting to circle for quick add

        const res = await addGeofenceAction(form);
        if (res.success) {
            toast.success(res.message);
            setFormData({ name: '', driver: '', country: '', radius: '5' });
        } else {
            toast.error(res.message);
        }
    });
  };

  return (
    <Card className="border-t-4 border-t-purple-500 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MapPin className="text-purple-500"/> Geofencing Dashboard</CardTitle>
        <CardDescription>Monitor delivery boundaries and breaches.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Simple Add */}
        <div className="flex flex-wrap gap-2 mb-6 p-4 bg-muted/10 rounded-lg border border-dashed items-end">
            <div className="w-32"><span className="text-xs text-muted-foreground">Zone Name</span><Input value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} className="h-8 bg-white"/></div>
            <div className="w-32"><span className="text-xs text-muted-foreground">Driver</span><Input value={formData.driver} onChange={e=>setFormData({...formData, driver:e.target.value})} className="h-8 bg-white"/></div>
            <div className="w-20"><span className="text-xs text-muted-foreground">Country</span><Input value={formData.country} onChange={e=>setFormData({...formData, country:e.target.value})} className="h-8 bg-white"/></div>
            <div className="w-20"><span className="text-xs text-muted-foreground">Radius (km)</span><Input type="number" value={formData.radius} onChange={e=>setFormData({...formData, radius:e.target.value})} className="h-8 bg-white"/></div>
            <button onClick={handleAdd} disabled={isPending} className="h-8 px-4 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>} Add Zone
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {initialFences.length === 0 ? <div className="col-span-3 text-center text-muted-foreground py-10">No active geofences.</div> : 
             initialFences.map(f => (
                <div key={f.id} className="border rounded-lg p-4 flex items-start gap-4 hover:shadow-md transition-shadow bg-card">
                  <div className={`p-2 rounded-full ${f.last_breach_at ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between">
                        <span className="font-bold">{f.name}</span>
                        <span className="text-xs font-mono bg-muted px-2 rounded">{f.country_code}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">Driver: {f.driver_name || 'Unassigned'}</div>
                    <div className="text-xs text-muted-foreground">
                        Type: {f.boundary_type} {f.radius_km ? `(${f.radius_km} km)` : ''}
                    </div>
                    
                    {f.last_breach_at ? (
                      <div className="mt-2 text-xs text-red-700 bg-red-50 p-2 rounded flex items-center gap-1">
                        <AlertCircle className="w-4 h-4"/> Breach: {new Date(f.last_breach_at).toLocaleString()}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-green-700 bg-green-50 p-2 rounded flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4"/> Status: Secure
                      </div>
                    )}
                  </div>
                </div>
              ))}
        </div>
      </CardContent>
    </Card>
  );
}