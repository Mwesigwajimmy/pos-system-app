'use client';

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle } from "lucide-react";

// Defined Interface for Type Safety
export interface CartAbandonmentEntry {
  id: string;
  sessionId: string;
  user: string; // Email or Customer Name
  timestamp: string;
  items: number;
  value: number;
  notified: boolean;
  region: string;
  tenantId: string;
}

interface CartAbandonmentAnalyticsProps {
  entries: CartAbandonmentEntry[];
}

export function CartAbandonmentAnalytics({ entries }: CartAbandonmentAnalyticsProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          Cart Abandonment Analytics
        </CardTitle>
        <CardDescription>
          View incomplete sessions, trigger reminder workflows, and isolate patterns by region.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Date/Time</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Region</TableHead>
                <TableHead className="text-center">Reminder Sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No abandoned carts found.
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.sessionId}</TableCell>
                    <TableCell>{c.user}</TableCell>
                    <TableCell className="text-muted-foreground">{c.timestamp}</TableCell>
                    <TableCell className="text-right">{c.items}</TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(c.value)}
                    </TableCell>
                    <TableCell>{c.region}</TableCell>
                    <TableCell className="text-center">
                      {c.notified ? (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                          No
                        </span>
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