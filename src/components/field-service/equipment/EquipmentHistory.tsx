'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, History, AlertCircle } from 'lucide-react';
import { fetchEquipmentHistory } from '@/lib/actions/equipment'; // Import Server Action
import { Badge } from '@/components/ui/badge';

interface TenantContext {
  tenantId: string;
}

interface Event {
  id: number;
  event_type: string;
  timestamp: string;
  details: string;
  performed_by: string;
}

export default function EquipmentHistory({ equipmentId, tenant }: { equipmentId: number; tenant: TenantContext }) {
  const { data: events, isLoading } = useQuery({
    queryKey: ['eq-history', equipmentId, tenant.tenantId],
    queryFn: () => fetchEquipmentHistory(equipmentId, tenant.tenantId),
  });

  const getEventTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'repair': return <Badge variant="destructive">Repair</Badge>;
      case 'maintenance': return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Maintenance</Badge>;
      case 'install': return <Badge variant="outline" className="border-green-600 text-green-600">Install</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" /> Lifecycle History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && events?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-4 w-4" /> No history recorded yet.
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {events?.map((ev: Event) => (
                <TableRow key={ev.id}>
                  <TableCell>{getEventTypeBadge(ev.event_type)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(ev.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium">{ev.performed_by || 'System'}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={ev.details}>
                    {ev.details}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}