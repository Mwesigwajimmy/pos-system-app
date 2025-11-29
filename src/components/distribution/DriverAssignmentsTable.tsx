'use client';

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2, Search, X, Plus, Trash2 } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

interface DriverAssignment {
  id: string;
  driverName: string;
  region: string;
  country: string;
  route: string;
  vehicle: string;
  assignedDate: string;
  entity: string;
  status: "active" | "inactive";
  tenantId: string;
}

export default function DriverAssignmentsTable() {
  const [assignments, setAssignments] = useState<DriverAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [driverName, setDriverName] = useState('');
  const [route, setRoute] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [region, setRegion] = useState('');
  const [entity, setEntity] = useState('');
  const [country, setCountry] = useState('');

  useEffect(() => {
    setTimeout(() => {
      setAssignments([
        {
          id: "drv-001",
          driverName: "James Okello",
          region: "Central",
          country: "UG",
          route: "Kampala CBD",
          vehicle: "UAV 332S",
          assignedDate: "2025-11-05",
          entity: "Main Comp Ltd.",
          status: "active",
          tenantId: "tenant-001"
        },
        {
          id: "drv-002",
          driverName: "Sarah Lewis",
          region: "New South Wales",
          country: "AU",
          route: "Sydney East",
          vehicle: "AUS 11 KJ",
          assignedDate: "2025-10-22",
          entity: "Global Branch AU",
          status: "active",
          tenantId: "tenant-002"
        }
      ]);
      setLoading(false);
    }, 400);
  }, []);

  const filtered = useMemo(
    () => assignments.filter(
      d =>
        d.driverName.toLowerCase().includes(filter.toLowerCase()) ||
        d.route.toLowerCase().includes(filter.toLowerCase()) ||
        d.region.toLowerCase().includes(filter.toLowerCase()) ||
        d.entity.toLowerCase().includes(filter.toLowerCase())
    ),
    [assignments, filter]
  );

  const addDriver = () => {
    if (!driverName || !route || !vehicle || !region || !entity || !country) return;
    setAssignments(a => [
      ...a,
      {
        id: Math.random().toString(36).slice(2),
        driverName, route, region, country, vehicle, assignedDate: new Date().toISOString().slice(0,10), entity, status: "active", tenantId: "tenant-add"
      }
    ]);
    setDriverName(""); setRoute(""); setVehicle(""); setRegion(""); setEntity(""); setCountry("");
  };

  const removeDriver = (id: string) => setAssignments(a => a.filter(d => d.id !== id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Driver Assignments</CardTitle>
        <CardDescription>
          Assign, manage and search distribution drivers by region, vehicle and route.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Filter by driver/route/region..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8"/>
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={()=>setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-3">
          <Input placeholder="Driver" value={driverName} onChange={e => setDriverName(e.target.value)}/>
          <Input placeholder="Route" value={route} onChange={e => setRoute(e.target.value)}/>
          <Input placeholder="Region" value={region} onChange={e => setRegion(e.target.value)}/>
          <Input placeholder="Country" value={country} onChange={e => setCountry(e.target.value)}/>
          <Input placeholder="Vehicle" value={vehicle} onChange={e => setVehicle(e.target.value)}/>
          <Input placeholder="Entity" value={entity} onChange={e => setEntity(e.target.value)}/>
          <button onClick={addDriver} className="px-3 py-1 bg-secondary rounded flex items-center gap-1"><Plus className="w-4 h-4"/></button>
        </div>
        {loading
          ? <div className="flex py-10 justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>
          : <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remove</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0
                  ? <TableRow><TableCell colSpan={9}>No drivers assigned.</TableCell></TableRow>
                  : filtered.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>{d.driverName}</TableCell>
                        <TableCell>{d.route}</TableCell>
                        <TableCell>{d.region}</TableCell>
                        <TableCell>{d.country}</TableCell>
                        <TableCell>{d.vehicle}</TableCell>
                        <TableCell>{d.assignedDate}</TableCell>
                        <TableCell>{d.entity}</TableCell>
                        <TableCell>{d.status}</TableCell>
                        <TableCell>
                          <button onClick={() => removeDriver(d.id)} className="p-1 text-red-500 rounded hover:bg-red-100">
                            <Trash2 className="w-4 h-4"/>
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
        }
      </CardContent>
    </Card>
  );
}