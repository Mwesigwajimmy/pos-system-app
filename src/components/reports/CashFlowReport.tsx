'use client';

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface CashFlowRow {
  label: string;
  value: number;
  entity: string;
  currency: string;
  period: string;
  tenantId: string;
}

export default function CashFlowReport() {
  const [rows, setRows] = useState<CashFlowRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setTimeout(() => {
      setRows([
        { label: "Net Cash from Operations", value: 14225000, entity: "Main Comp Ltd.", currency: "UGX", period: "2025-Q3", tenantId: "tenant-001" },
        { label: "Net Cash from Investing", value: -4050000, entity: "Main Comp Ltd.", currency: "UGX", period: "2025-Q3", tenantId: "tenant-001" },
        { label: "Net Cash from Financing", value: 2200000, entity: "Main Comp Ltd.", currency: "UGX", period: "2025-Q3", tenantId: "tenant-001" },
        { label: "Net Change in Cash", value: 12375000, entity: "Main Comp Ltd.", currency: "UGX", period: "2025-Q3", tenantId: "tenant-001" }
      ]);
      setLoading(false);
    }, 400);
  }, []);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Flow Report</CardTitle>
        <CardDescription>
          Direct/indirect cash flow by company, currency, and period; critical global compliance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-14"><Loader2 className="w-10 h-10 animate-spin"/></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>{row.label}</TableCell>
                  <TableCell>{row.entity}</TableCell>
                  <TableCell>{row.period}</TableCell>
                  <TableCell>{row.currency}</TableCell>
                  <TableCell>{row.value.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}