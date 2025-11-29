'use client';

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, X, Search, Wrench, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RepairTicket {
  id: string;
  asset: string;
  fault: string;
  reportedBy: string;
  openDate: string;
  country: string;
  entity: string;
  techAssigned: string;
  closeDate?: string;
  status: "open" | "in repair" | "closed";
  cost?: number;
  notes?: string;
  tenantId: string;
}

export default function RepairTicketManager() {
  const [tickets, setTickets] = useState<RepairTicket[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setTickets([
        {
          id: "rtm-001",
          asset: "Van UAX 229S",
          fault: "Starter motor failure",
          reportedBy: "fleet@global.com",
          openDate: "2025-11-18",
          country: "AU",
          entity: "Global Branch AU",
          techAssigned: "Peter Zhao",
          status: "in repair",
          notes: "Awaiting part shipment.",
          tenantId: "tenant-002"
        },
        {
          id: "rtm-002",
          asset: "Cold Room #3",
          fault: "Sensor alarm",
          reportedBy: "store@main.co",
          openDate: "2025-11-12",
          country: "UG",
          entity: "Main Comp Ltd.",
          techAssigned: "Tonny Lutaaya",
          closeDate: "2025-11-14",
          status: "closed",
          cost: 76000,
          notes: "Sensor recalibrated.",
          tenantId: "tenant-001"
        }
      ]);
      setLoading(false);
    }, 350);
  }, []);

  const filtered = useMemo(
    () => tickets.filter(t =>
      t.asset.toLowerCase().includes(filter.toLowerCase()) ||
      t.country.toLowerCase().includes(filter.toLowerCase()) ||
      t.entity.toLowerCase().includes(filter.toLowerCase()) ||
      t.fault.toLowerCase().includes(filter.toLowerCase()) ||
      t.techAssigned.toLowerCase().includes(filter.toLowerCase())
    ),
    [tickets, filter]
  );

  const closeTicket = (id: string) => {
    setTickets(ts =>
      ts.map(t =>
        t.id === id ? { ...t, status: "closed", closeDate: new Date().toISOString().slice(0, 10) } : t
      )
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Repair Ticket Manager</CardTitle>
        <CardDescription>
          Register, track and close repair tickets per asset, with location and cost trail.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Filter asset/tech/entity..." value={filter} onChange={e=>setFilter(e.target.value)} className="pl-8"/>
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={()=>setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="flex py-8 justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
          : <ScrollArea className="h-60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Fault</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Tech</TableHead>
                    <TableHead>Opened</TableHead>
                    <TableHead>Closed</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Close</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0
                    ? <TableRow><TableCell colSpan={11}>No repair tickets open/closed.</TableCell></TableRow>
                    : filtered.map(t => (
                        <TableRow key={t.id}>
                          <TableCell>
                            {t.status === "in repair"
                              ? <Wrench className="text-blue-700 w-4 h-4 inline"/> :
                              t.status === "closed"
                              ? <CheckCircle2 className="text-green-800 w-4 h-4 inline"/> :
                              "Open"}
                          </TableCell>
                          <TableCell>{t.asset}</TableCell>
                          <TableCell>{t.fault}</TableCell>
                          <TableCell>{t.country}</TableCell>
                          <TableCell>{t.entity}</TableCell>
                          <TableCell>{t.techAssigned}</TableCell>
                          <TableCell>{t.openDate}</TableCell>
                          <TableCell>{t.closeDate || "-"}</TableCell>
                          <TableCell>{t.cost?.toLocaleString() || ""}</TableCell>
                          <TableCell>{t.notes || ""}</TableCell>
                          <TableCell>
                            {t.status !== "closed" &&
                              <Button size="sm" variant="secondary" onClick={() => closeTicket(t.id)}>Close</Button>
                            }
                          </TableCell>
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