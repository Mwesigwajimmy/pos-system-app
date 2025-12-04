'use client';

import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface AttendanceEntry {
  id: string;
  employee: string;
  email: string;
  entity: string;
  status: "present" | "absent" | "late" | "remote";
  clockIn?: string;
  clockOut?: string;
  date: string;
  location: string;
  country: string;
}

interface TimeAttendanceTrackerProps {
    entries: AttendanceEntry[];
}

export default function TimeAttendanceTracker({ entries }: TimeAttendanceTrackerProps) {
  const [filter, setFilter] = useState('');

  const filtered = useMemo(
    () => entries.filter(
      e =>
        e.employee.toLowerCase().includes(filter.toLowerCase()) ||
        e.entity.toLowerCase().includes(filter.toLowerCase()) ||
        e.location.toLowerCase().includes(filter.toLowerCase())
    ),
    [entries, filter]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Time & Attendance Tracker</CardTitle>
        <CardDescription>
          Daily logs for your team.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Filter..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8"/>
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={()=>setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
          <ScrollArea className="h-72">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Country</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0
                    ? <TableRow><TableCell colSpan={8}>No attendance records found.</TableCell></TableRow>
                    : filtered.map(e => (
                        <TableRow key={e.id}>
                          <TableCell>
                            <div className="font-semibold">{e.employee}</div>
                            <div className="text-xs text-muted-foreground">{e.email}</div>
                          </TableCell>
                          <TableCell>
                            <span className={
                                e.status === "present" ? "text-green-800 font-medium" :
                                e.status === "remote" ? "text-blue-700 font-medium" :
                                e.status === "absent" ? "text-red-800 font-medium" : "text-yellow-800 font-medium"
                            }>
                                {e.status.toUpperCase()}
                            </span>
                          </TableCell>
                          <TableCell>{e.clockIn || "--:--"}</TableCell>
                          <TableCell>{e.clockOut || "--:--"}</TableCell>
                          <TableCell>{new Date(e.date).toLocaleDateString()}</TableCell>
                          <TableCell>{e.location}</TableCell>
                          <TableCell>{e.entity}</TableCell>
                          <TableCell>{e.country}</TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </ScrollArea>
      </CardContent>
    </Card>
  );
}