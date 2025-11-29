'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Loader2, Search, X } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DeliveryMetric {
  id: string;
  driver: string;
  route: string;
  region: string;
  country: string;
  totalDeliveries: number;
  onTime: number;
  late: number;
  failed: number;
  avgMinutesLate: number;
  entity: string;
  dateRange: string;
  tenantId: string;
}

export default function DeliveryPerformanceAnalytics() {
  const [metrics, setMetrics] = useState<DeliveryMetric[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setMetrics([
        {
          id: "dpa-001",
          driver: "James Okello",
          route: "Kampala CBD",
          region: "Central",
          country: "UG",
          totalDeliveries: 78,
          onTime: 74,
          late: 3,
          failed: 1,
          avgMinutesLate: 19,
          entity: "Main Comp Ltd.",
          dateRange: "2025-11-01 to 2025-11-14",
          tenantId: "tenant-001"
        },
        {
          id: "dpa-002",
          driver: "Sarah Lewis",
          route: "Sydney East",
          region: "New South Wales",
          country: "AU",
          totalDeliveries: 52,
          onTime: 50,
          late: 2,
          failed: 0,
          avgMinutesLate: 7,
          entity: "Global Branch AU",
          dateRange: "2025-11-05 to 2025-11-14",
          tenantId: "tenant-002"
        }
      ]);
      setLoading(false);
    }, 400);
  }, []);

  const filtered = useMemo(
    () =>
      metrics.filter(
        m =>
          m.driver.toLowerCase().includes(filter.toLowerCase()) ||
          m.route.toLowerCase().includes(filter.toLowerCase()) ||
          m.region.toLowerCase().includes(filter.toLowerCase()) ||
          m.country.toLowerCase().includes(filter.toLowerCase()) ||
          m.entity.toLowerCase().includes(filter.toLowerCase())
      ),
    [metrics, filter]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery Performance Analytics</CardTitle>
        <CardDescription>
          Analyze on-time, late, and failed deliveries across regions, drivers, and date ranges.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Filter by driver/route/region..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8"/>
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
          : <ScrollArea className="h-80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>On Time</TableHead>
                  <TableHead>Late</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Avg Min Late</TableHead>
                  <TableHead>Date Range</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0
                  ? <TableRow><TableCell colSpan={11}>No delivery analytics available.</TableCell></TableRow>
                  : filtered.map(d => (
                      <TableRow key={d.id}>
                        <TableCell>{d.driver}</TableCell>
                        <TableCell>{d.route}</TableCell>
                        <TableCell>{d.region}</TableCell>
                        <TableCell>{d.country}</TableCell>
                        <TableCell>{d.entity}</TableCell>
                        <TableCell>{d.onTime}</TableCell>
                        <TableCell>{d.late}</TableCell>
                        <TableCell>{d.failed}</TableCell>
                        <TableCell>{d.totalDeliveries}</TableCell>
                        <TableCell>{d.avgMinutesLate}</TableCell>
                        <TableCell>{d.dateRange}</TableCell>
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