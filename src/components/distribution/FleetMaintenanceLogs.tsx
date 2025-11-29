'use client';

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from "@/components/ui/input";
import { Loader2, Search, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MaintenanceLog {
  id: string;
  vehicle: string;
  issue: string;
  service: string;
  cost: number;
  servicedBy: string;
  servicedAt: string;
  nextDue: string;
  entity: string;
  country: string;
  tenantId: string;
}

export default function FleetMaintenanceLogs() {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setLogs([
        {
          id: "maint-001",
          vehicle: "UAV 332S",
          issue: "Tire wear",
          service: "Replaced rear tires",
          cost: 120000,
          servicedBy: "Ara Auto",
          servicedAt: "2025-09-20",
          nextDue: "2026-03-20",
          entity: "Main Comp Ltd.",
          country: "UG",
          tenantId: "tenant-001"
        },
        {
          id: "maint-002",
          vehicle: "AUS 11 KJ",
          issue: "Oil change",
          service: "Full oil & filter",
          cost: 325,
          servicedBy: "Sydney Auto",
          servicedAt: "2025-10-18",
          nextDue: "2026-04-18",
          entity: "Global Branch AU",
          country: "AU",
          tenantId: "tenant-002"
        }
      ]);
      setLoading(false);
    }, 380);
  }, []);

  const filtered = useMemo(
    () => logs.filter(
      l =>
        l.vehicle.toLowerCase().includes(filter.toLowerCase()) ||
        l.issue.toLowerCase().includes(filter.toLowerCase()) ||
        l.entity.toLowerCase().includes(filter.toLowerCase())
    ),
    [logs, filter]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fleet Maintenance Logs</CardTitle>
        <CardDescription>
          Track service, repairs, and total cost for vehicles—schedule next service per asset.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Filter by vehicle/issue..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8"/>
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={()=>setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
          : <ScrollArea className="h-60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Serviced By</TableHead>
                    <TableHead>Last Service</TableHead>
                    <TableHead>Next Due</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Country</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0
                    ? <TableRow><TableCell colSpan={9}>No maintenance records found.</TableCell></TableRow>
                    : filtered.map(l => (
                        <TableRow key={l.id}>
                          <TableCell>{l.vehicle}</TableCell>
                          <TableCell>{l.issue}</TableCell>
                          <TableCell>{l.service}</TableCell>
                          <TableCell>{l.cost.toLocaleString()}</TableCell>
                          <TableCell>{l.servicedBy}</TableCell>
                          <TableCell>{l.servicedAt}</TableCell>
                          <TableCell>{l.nextDue}</TableCell>
                          <TableCell>{l.entity}</TableCell>
                          <TableCell>{l.country}</TableCell>
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