'use client';

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MaintenanceEntry {
  id: string;
  asset: string;
  action: string;
  performedBy: string;
  performedAt: string;
  outcome: string;
  cost: number;
  entity: string;
  country: string;
  notes?: string;
  tenantId: string;
}

export default function MaintenanceLogBook() {
  const [entries, setEntries] = useState<MaintenanceEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setEntries([
        {
          id: "mlb-001",
          asset: "Cold Room #3",
          action: "Refrigerant refill",
          performedBy: "engineer@main.co",
          performedAt: "2025-11-20",
          outcome: "Complete",
          cost: 170000,
          notes: "",
          entity: "Main Comp Ltd.",
          country: "UG",
          tenantId: "tenant-001"
        },
        {
          id: "mlb-002",
          asset: "Van UAX 229S",
          action: "Quarterly service",
          performedBy: "fleet@global.com",
          performedAt: "2025-09-13",
          outcome: "Brake pads replaced",
          cost: 192000,
          entity: "Global Branch AU",
          country: "AU",
          tenantId: "tenant-002"
        }
      ]);
      setLoading(false);
    }, 340);
  }, []);

  const filtered = useMemo(
    () => entries.filter(
      e =>
        e.asset.toLowerCase().includes(filter.toLowerCase()) ||
        e.performedBy.toLowerCase().includes(filter.toLowerCase()) ||
        e.entity.toLowerCase().includes(filter.toLowerCase())
    ),
    [entries, filter]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maintenance Log Book</CardTitle>
        <CardDescription>
          View and audit all service actions, costs, and outcomes for assets, globally traceable.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Filter asset/performer..." value={filter} onChange={e=>setFilter(e.target.value)} className="pl-8"/>
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={()=>setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="flex py-10 justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
          : <ScrollArea className="h-60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0
                    ? <TableRow><TableCell colSpan={9}>No maintenance entries found.</TableCell></TableRow>
                    : filtered.map(e => (
                        <TableRow key={e.id}>
                          <TableCell>{e.asset}</TableCell>
                          <TableCell>{e.action}</TableCell>
                          <TableCell>{e.outcome}</TableCell>
                          <TableCell>{e.performedBy}</TableCell>
                          <TableCell>{e.performedAt}</TableCell>
                          <TableCell>{e.cost.toLocaleString()}</TableCell>
                          <TableCell>{e.entity}</TableCell>
                          <TableCell>{e.country}</TableCell>
                          <TableCell>{e.notes || ""}</TableCell>
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