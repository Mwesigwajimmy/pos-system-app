'use client';

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Search, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface AuditLogEntry {
  id: string;
  type: string;
  entity: string;
  country: string;
  description: string;
  user: string;
  fromValue: string;
  toValue: string;
  timestamp: string;
  tenantId: string;
}

export default function AuditTrailReport() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setLogs([
        {
          id: "auditrep-001",
          type: "Journal Edit",
          entity: "Main Comp Ltd.",
          country: "UG",
          description: "Inventory Correction",
          user: "financeuser@example.com",
          fromValue: "400,000",
          toValue: "345,000",
          timestamp: "2025-11-07T15:01:21Z",
          tenantId: "tenant-001"
        },
        {
          id: "auditrep-002",
          type: "Period Lock",
          entity: "Global Branch AU",
          country: "AU",
          description: "Locked September",
          user: "auditmgr@firm.com",
          fromValue: "Unlocked",
          toValue: "Locked",
          timestamp: "2025-10-12T08:27:41Z",
          tenantId: "tenant-002"
        }
      ]);
      setLoading(false);
    }, 350);
  }, []);

  const filtered = useMemo(
    () =>
      logs.filter(
        l =>
          l.type.toLowerCase().includes(filter.toLowerCase()) ||
          l.entity.toLowerCase().includes(filter.toLowerCase()) ||
          l.country.toLowerCase().includes(filter.toLowerCase()) ||
          l.description.toLowerCase().includes(filter.toLowerCase()) ||
          l.user.toLowerCase().includes(filter.toLowerCase())
      ),
    [logs, filter]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Trail Report</CardTitle>
        <CardDescription>
          Immutable, full historical record for every entity.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Filter by entity/type..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8" />
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => setFilter('')}/>}
        </div>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="flex py-14 justify-center"><Loader2 className="h-10 w-10 animate-spin"/></div>
          : (
            <ScrollArea className="h-80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>From Value</TableHead>
                    <TableHead>To Value</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Country</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0
                    ? <TableRow><TableCell colSpan={8}>No audit logs found.</TableCell></TableRow>
                    : filtered.map(l => (
                      <TableRow key={l.id}>
                        <TableCell>{l.type}</TableCell>
                        <TableCell>{l.description}</TableCell>
                        <TableCell>{l.user}</TableCell>
                        <TableCell>{l.fromValue}</TableCell>
                        <TableCell>{l.toValue}</TableCell>
                        <TableCell>{format(new Date(l.timestamp), "yyyy-MM-dd HH:mm")}</TableCell>
                        <TableCell>{l.entity}</TableCell>
                        <TableCell>{l.country}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
      </CardContent>
    </Card>
  );
}