'use client';

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CalendarCheck2, AlertCircle, Plus, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MaintenanceSchedule {
  id: string;
  asset: string;
  assetId: string;
  entity: string;
  country: string;
  location: string;
  scheduleCron: string;
  nextDue: string;
  technician: string;
  status: "scheduled" | "in-progress" | "complete" | "overdue";
  lastComplete?: string;
  tenantId: string;
}

export default function AssetMaintenanceScheduler() {
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [asset, setAsset] = useState('');
  const [entity, setEntity] = useState('');
  const [country, setCountry] = useState('');
  const [location, setLocation] = useState('');
  const [scheduleCron, setScheduleCron] = useState('');
  const [technician, setTechnician] = useState('');
  const [nextDue, setNextDue] = useState('');

  useEffect(() => {
    setTimeout(() => {
      setSchedules([
        {
          id: "m1",
          asset: "Cold Room #3",
          assetId: "INV-00032",
          entity: "Main Comp Ltd.",
          country: "UG",
          location: "Kampala",
          scheduleCron: "Monthly",
          nextDue: "2025-12-20",
          technician: "engineer@main.co",
          status: "scheduled",
          lastComplete: "2025-11-20",
          tenantId: "tenant-001"
        },
        {
          id: "m2",
          asset: "Van UAX 229S",
          assetId: "INV-00922",
          entity: "Global Branch AU",
          country: "AU",
          location: "Sydney Depot",
          scheduleCron: "Quarterly",
          nextDue: "2025-12-01",
          technician: "fleet@global.com",
          status: "in-progress",
          lastComplete: "2025-09-13",
          tenantId: "tenant-002"
        }
      ]);
      setLoading(false);
    }, 340);
  }, []);

  const filtered = useMemo(
    () => schedules.filter(
      s =>
        s.asset.toLowerCase().includes(filter.toLowerCase()) ||
        s.entity.toLowerCase().includes(filter.toLowerCase()) ||
        s.country.toLowerCase().includes(filter.toLowerCase()) ||
        s.location.toLowerCase().includes(filter.toLowerCase())
    ),
    [schedules, filter]
  );

  const addSchedule = () => {
    if (!asset || !entity || !country || !location || !scheduleCron || !technician || !nextDue) return;
    setSchedules(ss => [
      ...ss,
      {
        id: Math.random().toString(36).slice(2),
        asset,
        assetId: "INV-" + Math.floor(Math.random() * 100000),
        entity,
        country,
        location,
        scheduleCron,
        nextDue,
        technician,
        status: "scheduled",
        tenantId: "tenant-custom"
      }
    ]);
    setAsset(""); setEntity(""); setCountry(""); setLocation(""); setScheduleCron(""); setTechnician(""); setNextDue("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Maintenance Scheduler</CardTitle>
        <CardDescription>
          Schedule, manage, and track recurring and ad-hoc maintenance for assets globally.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Input placeholder="Filter by asset/entity/location..." value={filter} onChange={e=>setFilter(e.target.value)} />
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={()=>setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-3 flex-wrap">
          <Input placeholder="Asset" value={asset} onChange={e=>setAsset(e.target.value)} />
          <Input placeholder="Entity" value={entity} onChange={e=>setEntity(e.target.value)} />
          <Input placeholder="Country" value={country} onChange={e=>setCountry(e.target.value)} />
          <Input placeholder="Location" value={location} onChange={e=>setLocation(e.target.value)} />
          <Input placeholder="Schedule (e.g. Monthly)" value={scheduleCron} onChange={e=>setScheduleCron(e.target.value)} />
          <Input placeholder="Next Due Date" type="date" value={nextDue} onChange={e=>setNextDue(e.target.value)} />
          <Input placeholder="Technician" value={technician} onChange={e=>setTechnician(e.target.value)} />
          <Button variant="secondary" onClick={addSchedule}><Plus className="w-4 h-4"/></Button>
        </div>
        {loading
          ? <div className="flex py-12 justify-center"><Loader2 className="h-7 w-7 animate-spin"/></div>
          : <ScrollArea className="h-72">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Technician</TableHead>
                    <TableHead>Next Due</TableHead>
                    <TableHead>Last Complete</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Country</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0
                    ? <TableRow><TableCell colSpan={9}>No scheduled maintenance found.</TableCell></TableRow>
                    : filtered.map(m => (
                        <TableRow key={m.id}>
                          <TableCell>
                            {m.status === "scheduled" && <span className="text-blue-900 flex items-center"><CalendarCheck2 className="h-4 w-4 mr-1"/>Scheduled</span>}
                            {m.status === "in-progress" && <span className="text-yellow-900">In Progress</span>}
                            {m.status === "complete" && <span className="text-green-900">Complete</span>}
                            {m.status === "overdue" && <span className="text-red-900 flex items-center"><AlertCircle className="h-4 w-4 mr-1"/>Overdue</span>}
                          </TableCell>
                          <TableCell>{m.asset}</TableCell>
                          <TableCell>{m.location}</TableCell>
                          <TableCell>{m.technician}</TableCell>
                          <TableCell>{m.nextDue}</TableCell>
                          <TableCell>{m.lastComplete || ""}</TableCell>
                          <TableCell>{m.scheduleCron}</TableCell>
                          <TableCell>{m.entity}</TableCell>
                          <TableCell>{m.country}</TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </ScrollArea>
        }
      </CardContent>
    </Card>
  );
}