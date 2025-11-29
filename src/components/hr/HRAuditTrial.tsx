'use client';

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Search, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface HrAuditRow {
  id: string;
  user: string;
  action: string;
  target: string;
  details: string;
  timestamp: string;
  entity: string;
  country: string;
  tenantId: string;
}

export default function HRAuditTrail() {
  const [rows, setRows] = useState<HrAuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    setTimeout(() => {
      setRows([
        {
          id: "hr-aud1",
          user: "larag@main.co",
          action: "created",
          target: "Job: Field Driver",
          details: "New job opening created for expansion.",
          timestamp: "2025-11-19T13:11:19Z",
          entity: "Main Comp Ltd.",
          country: "UG",
          tenantId: "tenant-001"
        },
        {
          id: "hr-aud2",
          user: "amos@main.co",
          action: "edited",
          target: "Employee: Maya Okoth",
          details: "Salary band updated after Q3 review.",
          timestamp: "2025-10-08T14:50:01Z",
          entity: "Main Comp Ltd.",
          country: "UG",
          tenantId: "tenant-001"
        }
      ]);
      setLoading(false);
    }, 320);
  }, []);

  const filtered = useMemo(
    () => rows.filter(
      row =>
        row.user.toLowerCase().includes(filter.toLowerCase()) ||
        row.target.toLowerCase().includes(filter.toLowerCase()) ||
        row.entity.toLowerCase().includes(filter.toLowerCase()) ||
        row.action.toLowerCase().includes(filter.toLowerCase())
    ),
    [rows, filter]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>HR Audit Trail</CardTitle>
        <CardDescription>
          Logs all changes in HR system—who did what/when/where, for international best practices.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Filter by user/target/action..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8"/>
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
        {loading ?
          <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
          : <ScrollArea className="h-72">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Country</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0
                  ? <TableRow><TableCell colSpan={7}>No HR changes found.</TableCell></TableRow>
                  : filtered.map(row => (
                      <TableRow key={row.id}>
                        <TableCell>{row.user}</TableCell>
                        <TableCell>{row.action}</TableCell>
                        <TableCell>{row.target}</TableCell>
                        <TableCell>{row.details}</TableCell>
                        <TableCell>{format(new Date(row.timestamp), "yyyy-MM-dd HH:mm")}</TableCell>
                        <TableCell>{row.entity}</TableCell>
                        <TableCell>{row.country}</TableCell>
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