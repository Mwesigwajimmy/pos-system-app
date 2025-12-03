'use client';

import React, { useState, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search, Wrench, CheckCircle2, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

// 1. Export the Interface so page.tsx can import it
export interface RepairTicket {
  id: string;
  asset: string;
  fault: string;
  reportedBy: string;
  openDate: string; // ISO String expected
  country: string;
  entity: string;
  techAssigned: string;
  closeDate?: string | null;
  status: "open" | "in_repair" | "closed" | string; // Flexible string to match DB enums
  cost?: number;
  notes?: string;
  tenantId: string;
}

// 2. Define Props Interface
interface RepairTicketManagerProps {
  initialData: RepairTicket[];
}

export default function RepairTicketManager({ initialData }: RepairTicketManagerProps) {
  // 3. Initialize state directly from Server Props (No loading state needed)
  const [tickets, setTickets] = useState<RepairTicket[]>(initialData || []);
  const [filter, setFilter] = useState('');

  // 4. Client-side filtering
  const filtered = useMemo(
    () => tickets.filter(t =>
      (t.asset || "").toLowerCase().includes(filter.toLowerCase()) ||
      (t.country || "").toLowerCase().includes(filter.toLowerCase()) ||
      (t.entity || "").toLowerCase().includes(filter.toLowerCase()) ||
      (t.fault || "").toLowerCase().includes(filter.toLowerCase()) ||
      (t.techAssigned || "").toLowerCase().includes(filter.toLowerCase())
    ),
    [tickets, filter]
  );

  // Optimistic UI update (In a real app, this would also trigger a Server Action)
  const closeTicket = (id: string) => {
    setTickets(ts =>
      ts.map(t =>
        t.id === id 
          ? { ...t, status: "closed", closeDate: new Date().toISOString() } 
          : t
      )
    );
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'closed' || s === 'resolved') {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1"/> Closed</Badge>;
    }
    if (s === 'in_repair' || s === 'in repair' || s === 'in_progress') {
      return <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200"><Wrench className="w-3 h-3 mr-1"/> In Repair</Badge>;
    }
    return <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200"><AlertCircle className="w-3 h-3 mr-1"/> Open</Badge>;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Repair Ticket Manager</CardTitle>
        <CardDescription>
          Register, track and close repair tickets per asset, with location and cost trail.
        </CardDescription>
        <div className="relative mt-3 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filter asset/tech/entity..." 
            value={filter} 
            onChange={e => setFilter(e.target.value)} 
            className="pl-8"
          />
          {filter && (
            <X 
              className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" 
              onClick={() => setFilter("")}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Fault</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Tech Assigned</TableHead>
                <TableHead>Opened</TableHead>
                <TableHead>Closed</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead className="w-[100px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    No repair tickets found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>{getStatusBadge(t.status)}</TableCell>
                    <TableCell className="font-medium">
                      {t.asset}
                      <div className="text-xs text-muted-foreground">{t.entity}</div>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate" title={t.fault}>
                      {t.fault}
                    </TableCell>
                    <TableCell>{t.country}</TableCell>
                    <TableCell>
                      {t.techAssigned || <span className="text-muted-foreground italic">Unassigned</span>}
                    </TableCell>
                    <TableCell>{new Date(t.openDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {t.closeDate ? new Date(t.closeDate).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell>
                      {t.cost ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(t.cost) : "-"}
                    </TableCell>
                    <TableCell>
                      {t.status !== "closed" && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => closeTicket(t.id)}
                          className="h-8 text-xs"
                        >
                          Close Ticket
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}