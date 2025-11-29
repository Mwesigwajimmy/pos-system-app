'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2 } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

interface FiscalReportRow {
  label: string;
  value: number;
  currency: string;
  entity: string;
  country: string;
  year: number;
  tenantId: string;
}

export default function FiscalReport() {
  const [rows, setRows] = useState<FiscalReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setTimeout(() => {
      setRows([
        { label: "Opening Equity", value: 20400000, currency: "UGX", entity: "Main Comp Ltd.", country: "UG", year: 2025, tenantId: "tenant-001" },
        { label: "Net Profit", value: 8050000, currency: "UGX", entity: "Main Comp Ltd.", country: "UG", year: 2025, tenantId: "tenant-001" },
        { label: "Total Dividends", value: 1500000, currency: "UGX", entity: "Main Comp Ltd.", country: "UG", year: 2025, tenantId: "tenant-001" }
      ]);
      setLoading(false);
    }, 350);
  }, []);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fiscal Year Report</CardTitle>
        <CardDescription>
          Summarized annuals for board/auditor review.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="flex py-14 justify-center"><Loader2 className="w-10 h-10 animate-spin"/></div>
          : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Year</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row.label}</TableCell>
                    <TableCell>{row.value.toLocaleString()}</TableCell>
                    <TableCell>{row.currency}</TableCell>
                    <TableCell>{row.entity}</TableCell>
                    <TableCell>{row.country}</TableCell>
                    <TableCell>{row.year}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </CardContent>
    </Card>
  );
}