'use client';

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CartAbandonmentEntry {
  id: string;
  sessionId: string;
  user: string;
  timestamp: string;
  items: number;
  value: number;
  notified: boolean;
  region: string;
  tenantId: string;
}

export default function CartAbandonmentAnalytics() {
  const [entries, setEntries] = useState<CartAbandonmentEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setEntries([
        {
          id: "cart-001",
          sessionId: "sess-99821",
          user: "maya@southmail.com",
          timestamp: "2025-11-17 15:22",
          items: 3,
          value: 42000,
          notified: false,
          region: "UG",
          tenantId: "tenant-001"
        },
        {
          id: "cart-002",
          sessionId: "sess-13111",
          user: "liam@ausmail.com",
          timestamp: "2025-11-12 09:34",
          items: 5,
          value: 1975,
          notified: true,
          region: "AU",
          tenantId: "tenant-002"
        }
      ]);
      setLoading(false);
    }, 380);
  }, []);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cart Abandonment Analytics</CardTitle>
        <CardDescription>
          View incomplete sessions—trigger reminder workflows—isolate patterns by region.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <div className="py-14 flex justify-center"><Loader2 className="w-7 h-7 animate-spin"/></div>
        : <ScrollArea className="h-56">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Reminder Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0
                  ? <TableRow><TableCell colSpan={7}>No abandoned carts found.</TableCell></TableRow>
                  : entries.map(c => (
                      <TableRow key={c.id}>
                        <TableCell>{c.sessionId}</TableCell>
                        <TableCell>{c.user}</TableCell>
                        <TableCell>{c.timestamp}</TableCell>
                        <TableCell>{c.items}</TableCell>
                        <TableCell>{c.value.toLocaleString()}</TableCell>
                        <TableCell>{c.region}</TableCell>
                        <TableCell>
                          {c.notified
                            ? <span className="text-green-800">Yes</span>
                            : <span className="text-red-800">No</span>
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