'use client';

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from "@/components/ui/input";
import { Loader2, Thermometer, Search, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ColdChainEntry {
  id: string;
  vehicle: string;
  driver: string;
  region: string;
  date: string;
  minTemp: number;
  maxTemp: number;
  status: "ok" | "alert";
  entity: string;
  country: string;
  tenantId: string;
}

export default function ColdChainMonitor() {
  const [entries, setEntries] = useState<ColdChainEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setTimeout(() => {
      setEntries([
        {
          id: "ccm-001",
          vehicle: "UAY 299F",
          driver: "Maria Kaggwa",
          region: "Northern",
          date: "2025-11-22",
          minTemp: 3.2,
          maxTemp: 5.9,
          status: "ok",
          entity: "Main Comp Ltd.",
          country: "UG",
          tenantId: "tenant-001"
        },
        {
          id: "ccm-002",
          vehicle: "AUS 22 KQ",
          driver: "Peter Zhao",
          region: "Victoria",
          date: "2025-11-09",
          minTemp: 1.7,
          maxTemp: 9.2,
          status: "alert",
          entity: "Global Branch AU",
          country: "AU",
          tenantId: "tenant-002"
        }
      ]);
      setLoading(false);
    }, 380);
  }, []);

  const filtered = useMemo(
    () => entries.filter(
      c =>
        c.driver.toLowerCase().includes(filter.toLowerCase()) ||
        c.vehicle.toLowerCase().includes(filter.toLowerCase()) ||
        c.entity.toLowerCase().includes(filter.toLowerCase()) ||
        c.region.toLowerCase().includes(filter.toLowerCase())
    ),
    [entries, filter]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cold Chain Monitor</CardTitle>
        <CardDescription>
          End-to-end temperature tracking for vans, vehicles, and deliveries—alerts for breaches.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Filter driver/vehicle/region..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8"/>
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={()=>setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin"/></div> :
          <ScrollArea className="h-52">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Min Temp</TableHead>
                  <TableHead>Max Temp</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Country</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0
                  ? <TableRow><TableCell colSpan={9}>No cold chain records found.</TableCell></TableRow>
                  : filtered.map(c => (
                      <TableRow key={c.id}>
                        <TableCell>{c.vehicle}</TableCell>
                        <TableCell>{c.driver}</TableCell>
                        <TableCell>{c.region}</TableCell>
                        <TableCell>{c.date}</TableCell>
                        <TableCell>{c.minTemp.toFixed(1)}°C</TableCell>
                        <TableCell>{c.maxTemp.toFixed(1)}°C</TableCell>
                        <TableCell>
                          {c.status === "ok"
                            ? <span className="text-green-800 flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/>OK</span>
                            : <span className="text-red-800 flex items-center gap-1"><AlertTriangle className="w-4 h-4"/>ALERT</span>
                          }
                        </TableCell>
                        <TableCell>{c.entity}</TableCell>
                        <TableCell>{c.country}</TableCell>
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