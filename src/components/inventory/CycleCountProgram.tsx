'use client';

import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

// 1. Define the shape of the data
export interface CycleCountEntry {
  id: string;
  warehouse: string;
  product: string;
  sku: string;
  scheduledDate: string;
  countedBy: string;
  countedQty: number;
  recordedQty: number;
  variance: number;
  status: "scheduled" | "done" | "reconciled";
  notes?: string;
  entity: string;
  country: string;
  tenantId: string;
}

// 2. Define the props expected from the server page
interface CycleCountProgramProps {
  initialData: CycleCountEntry[];
}

export default function CycleCountProgram({ initialData }: CycleCountProgramProps) {
  // 3. Initialize state with the data passed from the server
  const [counts] = useState<CycleCountEntry[]>(initialData || []);
  const [filter, setFilter] = useState('');

  // 4. Client-side filtering logic
  const filtered = useMemo(
    () => counts.filter(
      c =>
        (c.product || "").toLowerCase().includes(filter.toLowerCase()) ||
        (c.sku || "").toLowerCase().includes(filter.toLowerCase()) ||
        (c.warehouse || "").toLowerCase().includes(filter.toLowerCase())
    ),
    [counts, filter]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cycle Count Program</CardTitle>
        <CardDescription>
          Modern cycle counting with variance, by warehouse/product/entity.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filter by product/SKU/warehouse..." 
            value={filter} 
            onChange={e => setFilter(e.target.value)} 
            className="pl-8"
          />
          {filter && (
            <X 
              className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" 
              onClick={() => setFilter("")}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Warehouse</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Counted By</TableHead>
                <TableHead>Counted</TableHead>
                <TableHead>System</TableHead>
                <TableHead>Variance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Country</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center h-24">
                    No cycle counts found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>{c.warehouse}</TableCell>
                    <TableCell className="font-medium">{c.product}</TableCell>
                    <TableCell>{c.sku}</TableCell>
                    <TableCell>{new Date(c.scheduledDate).toLocaleDateString()}</TableCell>
                    <TableCell>{c.countedBy}</TableCell>
                    <TableCell>{c.countedQty}</TableCell>
                    <TableCell>{c.recordedQty}</TableCell>
                    <TableCell className={c.variance !== 0 ? "text-red-500 font-bold" : "text-green-600"}>
                      {c.variance > 0 ? `+${c.variance}` : c.variance}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs capitalize border ${
                        c.status === 'done' ? 'bg-green-50 border-green-200 text-green-700' : 
                        c.status === 'reconciled' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                        'bg-gray-50 border-gray-200 text-gray-700'
                      }`}>
                        {c.status}
                      </span>
                    </TableCell>
                    <TableCell>{c.entity}</TableCell>
                    <TableCell>{c.country}</TableCell>
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