'use client';

import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  QrCode, 
  Calendar, 
  AlertTriangle, 
  ShieldCheck 
} from "lucide-react";

export interface SerialNumberEntry {
  id: string;
  serialCode: string;
  productName?: string;
  sku?: string;
  location?: string;
  status: string;
  // --- UPGRADES FOR GLOBAL MEDICAL/ROBOTIC SUPPORT ---
  expiryDate?: string;      // Critical for drugs/food
  batchCode?: string;       // Link to Laboratory/Manufacturing
  isCritical?: boolean;     // Robotic Anomaly Flag
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
      (item.productName && item.productName.toLowerCase().includes(filter.toLowerCase())) ||
      (item.batchCode && item.batchCode.toLowerCase().includes(filter.toLowerCase())) // UPGRADE: Search by Batch
    ), 
  [data, filter]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-blue-600" />
          Sovereign Serial Registry
        </CardTitle>
        <CardDescription>
          Individual unit tracking, batch monitoring, and global expiration control.
        </CardDescription>
        <div className="relative mt-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search serials or batch codes..." 
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
                <TableHead>Identity & Batch</TableHead>
                {/* Only show product column if productName exists in data */}
                {data.some(d => d.productName) && <TableHead>Product</TableHead>}
                <TableHead>Location</TableHead>
                <TableHead>Expiry / Health</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    No records found
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map(s => {
                  // Robotic Logic: Check if item is expired or critical
                  const isExpired = s.expiryDate && new Date(s.expiryDate) < new Date();

                  return (
                    <TableRow key={s.id} className={isExpired ? "bg-red-50/30" : ""}>
                      <TableCell className="font-mono">
                        <div className="flex flex-col">
                          <span className="font-bold">{s.serialCode}</span>
                          {s.batchCode && (
                            <span className="text-[10px] text-blue-500 font-bold uppercase">
                              LOT: {s.batchCode}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      {data.some(d => d.productName) && (
                        <TableCell>
                          <div className="font-medium text-sm">{s.productName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{s.sku}</div>
                        </TableCell>
                      )}
                      <TableCell className="text-xs">{s.location || "N/A"}</TableCell>
                      {/* UPGRADE: Medical Expiry Column */}
                      <TableCell>
                        {s.expiryDate ? (
                          <div className={`flex items-center gap-1 text-xs ${isExpired ? "text-red-600 font-bold" : "text-slate-600"}`}>
                            <Calendar className="h-3 w-3" />
                            {new Date(s.expiryDate).toLocaleDateString()}
                            {isExpired && <AlertTriangle className="h-3 w-3 animate-pulse" />}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-[10px]">No Expiry Set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={s.status === 'available' || s.status === 'IN_STOCK' ? 'outline' : 'secondary'}
                            className={s.status === 'available' || s.status === 'IN_STOCK' ? "border-green-200 text-green-700 bg-green-50" : ""}
                          >
                            {s.status}
                          </Badge>
                          {/* UPGRADE: Robotic Anomaly Shield */}
                          {s.isCritical && <ShieldCheck className="h-4 w-4 text-blue-500" title="Sovereign Verified" />}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}