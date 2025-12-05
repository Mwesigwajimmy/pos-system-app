'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Loader2, Search, X, AlertTriangle } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

async function fetchAnalytics() {
  const { data, error } = await createClient().rpc('get_delivery_analytics');
  if (error) throw error;
  return data;
}

export default function DeliveryPerformanceAnalytics() {
  const [filter, setFilter] = useState('');
  const { data: metrics, isLoading, isError } = useQuery({ 
    queryKey: ['deliveryAnalytics'], 
    queryFn: fetchAnalytics 
  });

  const filtered = useMemo(() => {
    if (!metrics) return [];
    return metrics.filter((m: any) =>
      (m.driver?.toLowerCase() || '').includes(filter.toLowerCase()) ||
      (m.route?.toLowerCase() || '').includes(filter.toLowerCase()) ||
      (m.region?.toLowerCase() || '').includes(filter.toLowerCase())
    );
  }, [metrics, filter]);

  if (isError) return <div className="p-6 text-red-500 flex items-center gap-2"><AlertTriangle/> Failed to load analytics.</div>;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Delivery Performance Analytics</CardTitle>
        <CardDescription>Real-time insights on driver efficiency and delivery success rates.</CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input 
            placeholder="Filter driver, route..." 
            value={filter} 
            onChange={e => setFilter(e.target.value)} 
            className="pl-8"
          />
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <ScrollArea className="h-[400px] border rounded-md">
            <Table>
              <TableHeader className="bg-muted/40 sticky top-0">
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">On Time</TableHead>
                  <TableHead className="text-right">Late</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead className="text-right">Avg Delay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center h-24">No data found.</TableCell></TableRow>
                ) : (
                  filtered.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.driver}</TableCell>
                      <TableCell>{d.route}</TableCell>
                      <TableCell>{d.region}</TableCell>
                      <TableCell>{d.country}</TableCell>
                      <TableCell className="text-right text-green-600 font-bold">{d.on_time}</TableCell>
                      <TableCell className="text-right text-yellow-600">{d.late}</TableCell>
                      <TableCell className="text-right text-red-600">{d.failed}</TableCell>
                      <TableCell className="text-right">{d.avg_minutes_late ? Math.round(d.avg_minutes_late) : 0} min</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}