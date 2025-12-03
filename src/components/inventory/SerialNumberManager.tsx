'use client';

import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, QrCode } from "lucide-react";

export interface SerialNumberEntry {
  id: string;
  serialCode: string;
  productName?: string;
  sku?: string;
  location?: string;
  status: string;
}

interface SerialNumberManagerProps {
  data: SerialNumberEntry[]; // Generic 'data' prop to accept any list
}

// Named Export
export function SerialNumberManager({ data }: SerialNumberManagerProps) {
  const [filter, setFilter] = useState("");

  const filteredData = useMemo(() => 
    data.filter(item => 
      item.serialCode.toLowerCase().includes(filter.toLowerCase()) ||
      (item.productName && item.productName.toLowerCase().includes(filter.toLowerCase()))
    ), 
  [data, filter]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Serial Number Registry
        </CardTitle>
        <CardDescription>Individual unit tracking and location.</CardDescription>
        <div className="relative mt-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search serials..." 
            value={filter} 
            onChange={e => setFilter(e.target.value)} 
            className="pl-8 max-w-sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serial #</TableHead>
                {/* Only show product column if productName exists in data */}
                {data.some(d => d.productName) && <TableHead>Product</TableHead>}
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No records found</TableCell></TableRow>
              ) : (
                filteredData.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono">{s.serialCode}</TableCell>
                    {data.some(d => d.productName) && (
                      <TableCell>
                        <div className="font-medium">{s.productName}</div>
                        <div className="text-xs text-muted-foreground">{s.sku}</div>
                      </TableCell>
                    )}
                    <TableCell>{s.location || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === 'available' ? 'outline' : 'secondary'}>{s.status}</Badge>
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