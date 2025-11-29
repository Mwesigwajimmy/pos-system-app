'use client';

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WorkCenterEntry {
  id: string;
  workCenter: string;
  session: string;
  product: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: "planned" | "running" | "stopped" | "finished";
  machineOperator: string;
  entity: string;
  country: string;
  tenantId: string;
}

export default function WorkCenterSchedule() {
  const [schedule, setSchedule] = useState<WorkCenterEntry[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setSchedule([
        {
          id: "wc-001",
          workCenter: "Plant A",
          session: "Morning Shift (MS-91)",
          product: "ACME Widget",
          scheduledStart: "2025-12-01T08:00",
          scheduledEnd: "2025-12-01T16:00",
          status: "planned",
          machineOperator: "Peter John",
          entity: "Main Comp Ltd.",
          country: "UG",
          tenantId: "tenant-001"
        },
        {
          id: "wc-002",
          workCenter: "Sydney Plant",
          session: "Afternoon Shift (MS-31)",
          product: "UltraWidget",
          scheduledStart: "2025-11-16T12:00",
          scheduledEnd: "2025-11-16T20:00",
          status: "finished",
          machineOperator: "Alice Thomson",
          entity: "Global Branch AU",
          country: "AU",
          tenantId: "tenant-002"
        }
      ]);
      setLoading(false);
    }, 355);
  }, []);

  const filtered = useMemo(
    () => schedule.filter(
      s =>
        s.workCenter.toLowerCase().includes(filter.toLowerCase()) ||
        s.product.toLowerCase().includes(filter.toLowerCase()) ||
        s.entity.toLowerCase().includes(filter.toLowerCase())
    ),
    [schedule, filter]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Work Center Schedule</CardTitle>
        <CardDescription>
          Organize & supervise all production/operations sessions per plant/machine globally.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Filter by center/product..." value={filter} onChange={e=>setFilter(e.target.value)} className="pl-8"/>
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={()=>setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="flex justify-center py-9"><Loader2 className="h-7 w-7 animate-spin" /></div>
          : <ScrollArea className="h-56">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Work Center</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Operator</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Country</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0
                    ? <TableRow><TableCell colSpan={9}>No scheduled production found.</TableCell></TableRow>
                    : filtered.map(s => (
                        <TableRow key={s.id}>
                          <TableCell>{s.workCenter}</TableCell>
                          <TableCell>{s.session}</TableCell>
                          <TableCell>{s.product}</TableCell>
                          <TableCell>{s.status}</TableCell>
                          <TableCell>{s.machineOperator}</TableCell>
                          <TableCell>{s.scheduledStart.replace("T"," ")}</TableCell>
                          <TableCell>{s.scheduledEnd.replace("T"," ")}</TableCell>
                          <TableCell>{s.entity}</TableCell>
                          <TableCell>{s.country}</TableCell>
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