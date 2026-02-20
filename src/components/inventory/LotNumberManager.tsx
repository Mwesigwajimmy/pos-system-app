'use client';

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  Calendar, 
  AlertTriangle, 
  Activity, 
  ShieldCheck, 
  FlaskConical 
} from "lucide-react";

// FIX: Export 'LotEntry' with all upgrades for fractional/medical logic
export interface LotEntry {
  id: string;
  lotCode: string; // Standardized name
  productName?: string;
  expiryDate?: string | null;
  quantity: number;
  status: string;
  // --- UPGRADES FOR GLOBAL FRACTIONAL & MEDICAL LOGIC ---
  unitName?: string;          // e.g. "Tablets", "Vials", "Grams"
  departmentName?: string;    // e.g. "Psychiatry", "Laboratory", "General"
  isVerified?: boolean;       // Sovereign Robotic Seal
  isQuarantined?: boolean;    // Safety Logic for faulty batches
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

  // Robotic Warning Logic: Check if expiry is within 30 days
  const isNearExpiry = (dateString?: string | null) => {
    if (!dateString) return false;
    const today = new Date();
    const expiry = new Date(dateString);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30;
  };

  return (
    <Card className="w-full border-slate-200 shadow-sm">
      <CardHeader className="bg-slate-50/50 border-b">
        <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
          <Package className="h-5 w-5 text-blue-600" />
          Sovereign Lot Registry
        </CardTitle>
        <CardDescription>
          Robotic batch monitoring, fractional drug tracking, and departmental isolation.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50">
              <TableHead className="font-bold">Lot ID & Dept</TableHead>
              {data.some(d => d.productName) && <TableHead className="font-bold">Product</TableHead>}
              <TableHead className="font-bold">Quantity (Fractional)</TableHead>
              <TableHead className="font-bold">Global Expiry</TableHead>
              <TableHead className="text-right font-bold">Health Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLots.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">
                  No sovereign lot numbers recorded in this jurisdiction.
                </TableCell>
              </TableRow>
            ) : (
              sortedLots.map((lot) => {
                const expired = isExpired(lot.expiryDate);
                const nearExpiry = isNearExpiry(lot.expiryDate);
                
                return (
                  <TableRow 
                    key={lot.id} 
                    className={expired ? "bg-red-50/50" : nearExpiry ? "bg-amber-50/30" : ""}
                  >
                    <TableCell className="font-mono">
                      <div className="flex flex-col">
                        <span className="font-bold text-blue-700">{lot.lotCode}</span>
                        {lot.departmentName && (
                          <span className="text-[9px] uppercase font-bold flex items-center gap-1 text-slate-500">
                            <Activity className="w-2 h-2"/> {lot.departmentName}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    {data.some(d => d.productName) && (
                      <TableCell className="font-medium text-slate-700">
                        {lot.productName}
                      </TableCell>
                    )}
                    {/* UPGRADE: Fractional Quantity Support */}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-bold">{lot.quantity}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">{lot.unitName || 'Units'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {lot.expiryDate ? (
                        <div className={`flex items-center gap-2 text-sm ${expired ? "text-red-600 font-bold" : nearExpiry ? "text-amber-600" : "text-slate-600"}`}>
                          <Calendar className="w-3 h-3" />
                          {new Date(lot.expiryDate).toLocaleDateString()}
                          {nearExpiry && !expired && <AlertTriangle className="w-3 h-3 animate-bounce" />}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-2">
                        {expired ? (
                          <Badge variant="destructive" className="flex w-fit items-center gap-1 shadow-sm">
                            <AlertTriangle className="w-3 h-3" /> EXPIRED
                          </Badge>
                        ) : lot.isQuarantined ? (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                            QUARANTINE
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50 shadow-sm font-bold">
                            VALID
                          </Badge>
                        )}
                        {/* UPGRADE: Robotic Verification Seal */}
                        {lot.isVerified && <ShieldCheck className="h-4 w-4 text-blue-500" title="Sovereign Verified" />}
                      </div>
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