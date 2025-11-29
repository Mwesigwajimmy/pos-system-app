'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Fence {
  id: string;
  routeArea: string;
  country: string;
  assignedDriver: string;
  entity: string;
  boundaryType: "circle" | "polygon";
  radiusKm?: number;
  vertices?: number[][];
  lastBreach?: string;
  active: boolean;
}

export default function GeofencingDashboard() {
  const [fences, setFences] = useState<Fence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setFences([
        {
          id: "fence-001",
          routeArea: "CBD Kampala",
          country: "UG",
          assignedDriver: "James Okello",
          entity: "Main Comp Ltd.",
          boundaryType: "circle",
          radiusKm: 8,
          lastBreach: "2025-10-28 10:40",
          active: true
        },
        {
          id: "fence-002",
          routeArea: "Bondi/Sydney East",
          country: "AU",
          assignedDriver: "Sarah Lewis",
          entity: "Global Branch AU",
          boundaryType: "polygon",
          vertices: [[-33.891,151.276],[-33.892,151.278],[-33.900,151.280]],
          active: true
        }
      ]);
      setLoading(false);
    }, 340);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Geofencing Dashboard</CardTitle>
        <CardDescription>
          Monitor and map delivery boundaries—get breach alerts in real time for any driver or route.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="flex py-12 justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
          : (
            <div className="flex flex-col gap-4">
              {fences.length === 0
                ? <div className="py-8 text-muted-foreground text-center">No geofencing active.</div>
                : fences.map(f => (
                    <div key={f.id} className="border rounded px-3 py-2 flex items-center gap-4">
                      <MapPin className="w-7 h-7 text-primary" />
                      <div>
                        <div className="font-bold">{f.routeArea} - {f.country} ({f.entity})</div>
                        <div className="text-xs text-muted-foreground">Type: {f.boundaryType} {f.radiusKm? `– ${f.radiusKm}km radius`:''} Driver: {f.assignedDriver}</div>
                        {f.lastBreach &&
                          <div className="text-xs mt-1 text-yellow-800 flex items-center gap-1"><AlertCircle className="w-4 h-4"/>Last Breach: {f.lastBreach}</div>
                        }
                        {f.active && !f.lastBreach &&
                          <div className="text-xs mt-1 text-green-800 flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/>No Breaches</div>
                        }
                      </div>
                    </div>
                  ))}
            </div>
          )
        }
      </CardContent>
    </Card>
  );
}