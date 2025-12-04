'use client';

import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, X, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

export interface OffboardingStep {
  id: string;
  employee: string;
  status: "step complete" | "pending" | "in review";
  step: string;
  responsible: string;
  due: string;
  completedAt?: string;
  entity: string;
  country: string;
}

interface OffboardingPortalProps {
    initialSteps: OffboardingStep[];
}

export default function OffboardingPortal({ initialSteps }: OffboardingPortalProps) {
  const [rows, setRows] = useState<OffboardingStep[]>(initialSteps);
  const [filter, setFilter] = useState('');

  const filtered = useMemo(
    () => rows.filter(
      row =>
        row.employee.toLowerCase().includes(filter.toLowerCase()) ||
        row.entity.toLowerCase().includes(filter.toLowerCase()) ||
        row.country.toLowerCase().includes(filter.toLowerCase())
    ),
    [rows, filter]
  );

  // In a real app, this should be a Server Action, but for now we update local state
  const markComplete = (id: string) => {
    setRows(rs =>
      rs.map(r =>
        r.id === id
          ? { ...r, status: "step complete", completedAt: new Date().toISOString().slice(0, 10) }
          : r
      )
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Offboarding Portal</CardTitle>
        <CardDescription>
          Track, assign, and complete all exit, clearance and handover steps.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Filter by name/entity..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8"/>
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={()=>setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
          <ScrollArea className="h-60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Step</TableHead>
                    <TableHead>Responsible</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Mark As Complete</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0
                    ? <TableRow><TableCell colSpan={9}>No offboarding steps found.</TableCell></TableRow>
                    : filtered.map(row => (
                        <TableRow key={row.id}>
                          <TableCell>{row.employee}</TableCell>
                          <TableCell>
                            {row.status === "step complete"
                              ? <span className="text-green-800 flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/>Done</span>
                              : <span className="text-yellow-800 capitalize">{row.status}</span>
                            }
                          </TableCell>
                          <TableCell>{row.step}</TableCell>
                          <TableCell>{row.responsible}</TableCell>
                          <TableCell>{row.due}</TableCell>
                          <TableCell>{row.completedAt || "-"}</TableCell>
                          <TableCell>{row.entity}</TableCell>
                          <TableCell>{row.country}</TableCell>
                          <TableCell>
                            {row.status !== "step complete"
                              ? <Button size="sm" onClick={() => markComplete(row.id)}>Complete</Button>
                              : null}
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </ScrollArea>
      </CardContent>
    </Card>
  );
}