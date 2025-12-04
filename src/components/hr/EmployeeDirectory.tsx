'use client';

import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X, BadgeCheck, Home, Globe2 } from "lucide-react";

// Shared interface
export interface Employee {
  id: string;
  name: string;
  email: string;
  job: string;
  location: string;
  country: string;
  entity: string;
  status: "active" | "on leave" | "terminated";
  contractType: "permanent" | "contract" | "remote";
  joined: string;
  avatarUrl: string;
}

interface EmployeeDirectoryProps {
    staff: Employee[];
}

export default function EmployeeDirectory({ staff }: EmployeeDirectoryProps) {
  const [filter, setFilter] = useState("");

  const filtered = useMemo(
    () => staff.filter(
      s =>
        s.name.toLowerCase().includes(filter.toLowerCase()) ||
        s.job.toLowerCase().includes(filter.toLowerCase()) ||
        s.entity.toLowerCase().includes(filter.toLowerCase()) ||
        s.country.toLowerCase().includes(filter.toLowerCase())
    ),
    [staff, filter]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Directory</CardTitle>
        <CardDescription>
          Search, view and filter all global staff.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Filter by name/job/entity..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8"/>
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={()=>setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
          <ScrollArea className="h-80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead colSpan={2}>Name</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contract</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0
                  ? <TableRow><TableCell colSpan={9}>No employees found.</TableCell></TableRow>
                  : filtered.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="p-2">
                          <img src={s.avatarUrl || "https://ui-avatars.com/api/?name=" + s.name} alt={s.name} className="w-8 h-8 rounded-full"/>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold">{s.name}</div>
                          <div className="text-xs text-muted-foreground">{s.email}</div>
                        </TableCell>
                        <TableCell>{s.job}</TableCell>
                        <TableCell>{s.location}</TableCell>
                        <TableCell>
                          {s.contractType === "permanent" ? <BadgeCheck className="w-4 h-4 text-green-700 inline" /> : null}
                          {s.contractType === "contract" ? <Globe2 className="w-4 h-4 text-yellow-600 inline" /> : null}
                          {s.contractType === "remote" ? <Home className="w-4 h-4 text-blue-600 inline" /> : null}
                          <span className="ml-1 capitalize">{s.contractType}</span>
                        </TableCell>
                        <TableCell>
                          <span className={
                              s.status === 'active' ? 'text-green-800 capitalize' : 
                              s.status === 'on leave' ? 'text-yellow-800 capitalize' : 'text-red-800 capitalize'
                          }>
                              {s.status}
                          </span>
                        </TableCell>
                        <TableCell>{s.entity}</TableCell>
                        <TableCell>{s.country}</TableCell>
                        <TableCell>{new Date(s.joined).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </ScrollArea>
      </CardContent>
    </Card>
  );
}