'use client';

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Search, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface AuditTrailRow {
  id: string;
  type: string;
  entity: string;
  country: string;
  user: string;
  description: string;
  objectType: string;
  objectId: string;
  timestamp: string;
  before: string;
  after: string;
  tenantId: string;
}

export default function AuditTrailViewer() {
  const [rows, setRows] = useState<AuditTrailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    setTimeout(() => {
      setRows([
        {
          id: "auditview-001",
          type: "Journal Entry",
          entity: "Main Comp Ltd.",
          country: "UG",
          user: "financeuser@example.com",
          description: "Inventory value adjustment",
          objectType: "Journal",
          objectId: "JRN-432",
          timestamp: "2025-11-17T16:01:00Z",
          before: "440,000",
          after: "445,000",
          tenantId: "tenant-001"
        },
        {
          id: "auditview-002",
          type: "Bill Approval",
          entity: "Global Branch AU",
          country: "AU",
          user: "admin@acme.com",
          description: "Bill approval step",
          objectType: "Bill",
          objectId: "BILL-AU-021",
          timestamp: "2025-11-19T12:33:00Z",
          before: "Submitted",
          after: "Approved",
          tenantId: "tenant-002"
        }
      ]);
      setLoading(false);
    }, 380);
  }, []);

  const filtered = useMemo(
    () => rows.filter(
      row =>
        row.user.toLowerCase().includes(filter.toLowerCase()) ||
        row.entity.toLowerCase().includes(filter.toLowerCase()) ||
        row.description.toLowerCase().includes(filter.toLowerCase()) ||
        row.objectId.toLowerCase().includes(filter.toLowerCase())
    ),
    [rows, filter]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Trail Viewer</CardTitle>
        <CardDescription>
          Drill down: view per-record, per-action change history anywhere in the system. Global, per-tenant.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Filter by user/entity/record..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8"/>
          {filter && (
            <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer"
               onClick={() => setFilter('')} />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="flex justify-center py-12"><Loader2 className="h-9 w-9 animate-spin"/></div>
          : <ScrollArea className="h-80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Object</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Before</TableHead>
                    <TableHead>After</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Country</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0
                    ? <TableRow><TableCell colSpan={9}>No trail entries found.</TableCell></TableRow>
                    : filtered.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.objectType} <b>{r.objectId}</b></TableCell>
                        <TableCell>{r.type}</TableCell>
                        <TableCell>{r.user}</TableCell>
                        <TableCell>{r.description}</TableCell>
                        <TableCell>{r.before}</TableCell>
                        <TableCell>{r.after}</TableCell>
                        <TableCell>{format(new Date(r.timestamp), "yyyy-MM-dd HH:mm")}</TableCell>
                        <TableCell>{r.entity}</TableCell>
                        <TableCell>{r.country}</TableCell>
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