'use client';

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, X, BadgeCheck, Home, Globe2 } from "lucide-react";

interface Employee {
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
  tenantId: string;
}

export default function EmployeeDirectory() {
  const [staff, setStaff] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    setTimeout(() => {
      setStaff([
        {
          id: "emp001",
          name: "Maya Okoth",
          email: "maya@southmail.com",
          job: "Senior Accountant",
          location: "Kampala HQ",
          country: "UG",
          entity: "Main Comp Ltd.",
          status: "active",
          contractType: "permanent",
          joined: "2022-05-17",
          avatarUrl: "https://randomuser.me/api/portraits/women/37.jpg",
          tenantId: "tenant-001"
        },
        {
          id: "emp002",
          name: "Liam Smith",
          email: "liam@ausmail.com",
          job: "Field Driver",
          location: "Sydney Depot",
          country: "AU",
          entity: "Global Branch AU",
          status: "on leave",
          contractType: "remote",
          joined: "2023-08-08",
          avatarUrl: "https://randomuser.me/api/portraits/men/82.jpg",
          tenantId: "tenant-002"
        }
      ]);
      setLoading(false);
    }, 380);
  }, []);

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
          Search, view and filter all global staff—by contract/location/status/entity.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Filter by name/job/entity..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8"/>
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={()=>setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin"/></div>
        ) : (
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
                          <img src={s.avatarUrl} alt={s.name} className="w-8 h-8 rounded-full"/>
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
                          <span className="ml-1">{s.contractType}</span>
                        </TableCell>
                        <TableCell>
                          {s.status === "active"
                            ? <span className="text-green-800">Active</span>
                            : s.status === "on leave"
                              ? <span className="text-yellow-800">On Leave</span>
                              : <span className="text-red-800">Terminated</span>
                          }
                        </TableCell>
                        <TableCell>{s.entity}</TableCell>
                        <TableCell>{s.country}</TableCell>
                        <TableCell>{s.joined}</TableCell>
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