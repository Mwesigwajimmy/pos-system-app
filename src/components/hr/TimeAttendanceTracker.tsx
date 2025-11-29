'use client';

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Search, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AttendanceEntry {
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
  tenantId: string;
}

export default function TimeAttendanceTracker() {
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setEntries([
        {
          id: "ta-001",
          employee: "Maya Okoth",
          email: "maya@southmail.com",
          entity: "Main Comp Ltd.",
          status: "present",
          clockIn: "08:13",
          clockOut: "17:01",
          date: "2025-11-22",
          location: "Kampala HQ",
          country: "UG",
          tenantId: "tenant-001"
        },
        {
          id: "ta-002",
          employee: "Liam Smith",
          email: "liam@ausmail.com",
          entity: "Global Branch AU",
          status: "remote",
          clockIn: "09:30",
          clockOut: "16:58",
          date: "2025-11-22",
          location: "Home",
          country: "AU",
          tenantId: "tenant-002"
        }
      ]);
      setLoading(false);
    }, 350);
  }, []);

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
          Log, search, and show clock times or presence — filter by entity, location, or day.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Filter by employee/entity/location..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8"/>
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={()=>setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="flex py-10 justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>
          : <ScrollArea className="h-72">
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
                            {e.status === "present"
                              ? <span className="text-green-800">Present</span>
                              : e.status === "remote"
                                ? <span className="text-blue-700">Remote</span>
                                : e.status === "absent"
                                  ? <span className="text-red-800">Absent</span>
                                  : <span className="text-yellow-800">Late</span>
                            }
                          </TableCell>
                          <TableCell>{e.clockIn || ""}</TableCell>
                          <TableCell>{e.clockOut || ""}</TableCell>
                          <TableCell>{e.date}</TableCell>
                          <TableCell>{e.location}</TableCell>
                          <TableCell>{e.entity}</TableCell>
                          <TableCell>{e.country}</TableCell>
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