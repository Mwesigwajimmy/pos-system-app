'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Loader2, Search, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ReturnClaim {
  id: string;
  orderNumber: string;
  customer: string;
  region: string;
  reason: string;
  date: string;
  status: "open" | "in review" | "approved" | "rejected";
  handledBy: string;
  entity: string;
  country: string;
  tenantId: string;
}

export default function ReturnsClaimsManager() {
  const [claims, setClaims] = useState<ReturnClaim[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setClaims([
        {
          id: "rcm-001",
          orderNumber: "ORD-UG-990",
          customer: "JK Distributors",
          region: "West",
          reason: "Product damage",
          date: "2025-11-16",
          status: "open",
          handledBy: "cs@main.co",
          entity: "Main Comp Ltd.",
          country: "UG",
          tenantId: "tenant-001"
        },
        {
          id: "rcm-002",
          orderNumber: "ORD-AU-1556",
          customer: "EasternTech",
          region: "NSW",
          reason: "Missing items",
          date: "2025-11-10",
          status: "approved",
          handledBy: "dispatch@global.com",
          entity: "Global Branch AU",
          country: "AU",
          tenantId: "tenant-002"
        }
      ]);
      setLoading(false);
    }, 390);
  }, []);

  const filtered = useMemo(
    () => claims.filter(
      c =>
        c.customer.toLowerCase().includes(filter.toLowerCase()) ||
        c.orderNumber.toLowerCase().includes(filter.toLowerCase()) ||
        c.region.toLowerCase().includes(filter.toLowerCase()) ||
        c.entity.toLowerCase().includes(filter.toLowerCase())
    ),
    [claims, filter]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Returns & Claims Manager</CardTitle>
        <CardDescription>
          Track product returns, reverse logistics, and delivery claims per region/entity.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Filter by customer/order/..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8"/>
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={()=>setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin"/></div>
          : <ScrollArea className="h-52">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Handled By</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Country</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0
                    ? <TableRow><TableCell colSpan={9}>No claims found.</TableCell></TableRow>
                    : filtered.map(c => (
                        <TableRow key={c.id}>
                          <TableCell>{c.orderNumber}</TableCell>
                          <TableCell>{c.customer}</TableCell>
                          <TableCell>{c.region}</TableCell>
                          <TableCell>{c.reason}</TableCell>
                          <TableCell>{c.date}</TableCell>
                          <TableCell>
                            {c.status === "approved"
                              ? <span className="text-green-800 flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/>Approved</span>
                              : c.status === "open"
                                ? <span className="text-yellow-800">Open</span>
                                : c.status === "in review"
                                  ? <span className="text-blue-800">In Review</span>
                                  : <span className="text-red-800 flex items-center gap-1"><AlertCircle className="w-4 h-4"/>Rejected</span>
                            }
                          </TableCell>
                          <TableCell>{c.handledBy}</TableCell>
                          <TableCell>{c.entity}</TableCell>
                          <TableCell>{c.country}</TableCell>
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