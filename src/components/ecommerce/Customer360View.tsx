'use client';

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  segment: string;
  ordersCount: number;
  lastOrder: string;
  totalSpent: number;
  region: string;
  entity: string;
  tenantId: string;
}

export default function Customer360View() {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setCustomers([
        {
          id: "cust-001",
          name: "Maya Okoth",
          email: "maya@southmail.com",
          segment: "VIP",
          ordersCount: 22,
          lastOrder: "2025-11-17",
          totalSpent: 432000,
          region: "UG",
          entity: "Main Comp Ltd.",
          tenantId: "tenant-001"
        },
        {
          id: "cust-002",
          name: "Liam Smith",
          email: "liam@ausmail.com",
          segment: "Regular",
          ordersCount: 6,
          lastOrder: "2025-11-10",
          totalSpent: 12000,
          region: "AU",
          entity: "Global Branch AU",
          tenantId: "tenant-002"
        }
      ]);
      setLoading(false);
    }, 380);
  }, []);

  const filtered = useMemo(
    () => customers.filter(
      c =>
        c.name.toLowerCase().includes(filter.toLowerCase()) ||
        c.email.toLowerCase().includes(filter.toLowerCase()) ||
        c.region.toLowerCase().includes(filter.toLowerCase())
    ),
    [customers, filter]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer 360° View</CardTitle>
        <CardDescription>
          Analyze every customer: orders, spend, status, and region/segment assignment.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Filter by name/email/region..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8"/>
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="flex py-10 justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>
          : <ScrollArea className="h-80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Last Order</TableHead>
                    <TableHead>Total Spent</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Entity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0
                    ? <TableRow><TableCell colSpan={8}>No customers found.</TableCell></TableRow>
                    : filtered.map(c => (
                        <TableRow key={c.id}>
                          <TableCell>{c.name}</TableCell>
                          <TableCell>{c.email}</TableCell>
                          <TableCell>{c.segment}</TableCell>
                          <TableCell>{c.ordersCount}</TableCell>
                          <TableCell>{c.lastOrder}</TableCell>
                          <TableCell>{c.totalSpent.toLocaleString()}</TableCell>
                          <TableCell>{c.region}</TableCell>
                          <TableCell>{c.entity}</TableCell>
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