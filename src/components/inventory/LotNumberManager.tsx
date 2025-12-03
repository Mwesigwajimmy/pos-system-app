'use client';

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, Calendar, AlertTriangle } from "lucide-react";

// FIX: Export 'LotEntry' (was named 'Lot') so imports work
export interface LotEntry {
  id: string;
  lotCode: string; // Standardized name
  productName?: string;
  expiryDate?: string | null;
  quantity: number;
  status: string;
}

// FIX: Use 'data' prop to be compatible with both Tracking Page and Product Page
interface LotNumberManagerProps {
  data: LotEntry[];
}

export function LotNumberManager({ data }: LotNumberManagerProps) {
  // Sort lots by expiry date (nearest first)
  const sortedLots = [...data].sort((a, b) => {
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
  });

  const isExpired = (dateString?: string | null) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Lot Numbers
        </CardTitle>
        <CardDescription>
          Manage batch numbers, expiry dates, and lot-specific quantities.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lot Number</TableHead>
              {data.some(d => d.productName) && <TableHead>Product</TableHead>}
              <TableHead>Quantity</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLots.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No lot numbers recorded.
                </TableCell>
              </TableRow>
            ) : (
              sortedLots.map((lot) => {
                const expired = isExpired(lot.expiryDate);
                return (
                  <TableRow key={lot.id}>
                    <TableCell className="font-mono font-medium">{lot.lotCode}</TableCell>
                    {data.some(d => d.productName) && <TableCell>{lot.productName}</TableCell>}
                    <TableCell>{lot.quantity}</TableCell>
                    <TableCell>
                      {lot.expiryDate ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          {new Date(lot.expiryDate).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {expired ? (
                        <Badge variant="destructive" className="flex w-fit items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Expired
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                          Valid
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}