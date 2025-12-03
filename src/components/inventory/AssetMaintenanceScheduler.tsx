'use client';

import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { CalendarCheck2, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface MaintenanceSchedule {
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
  tenantId: string;
}

interface Props {
  initialData: MaintenanceSchedule[];
}

export default function AssetMaintenanceScheduler({ initialData }: Props) {
  const [schedules] = useState<MaintenanceSchedule[]>(initialData);
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => 
    schedules.filter(s => 
      s.asset.toLowerCase().includes(filter.toLowerCase()) || 
      s.location.toLowerCase().includes(filter.toLowerCase())
    ), 
  [schedules, filter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scheduled Maintenance</CardTitle>
        <CardDescription>Upcoming tasks for all assets</CardDescription>
        <Input placeholder="Filter by asset or location..." value={filter} onChange={e=>setFilter(e.target.value)} className="max-w-sm" />
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead>Next Due</TableHead>
                <TableHead>Frequency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(m => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {m.status === 'overdue' ? <AlertCircle className="text-red-500 w-4 h-4"/> : <CalendarCheck2 className="text-blue-500 w-4 h-4"/>}
                      <span className="capitalize">{m.status}</span>
                    </div>
                  </TableCell>
                  <TableCell>{m.asset}</TableCell>
                  <TableCell>{m.location}</TableCell>
                  <TableCell>{m.technician}</TableCell>
                  <TableCell>{new Date(m.nextDue).toLocaleDateString()}</TableCell>
                  <TableCell>{m.scheduleCron}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}