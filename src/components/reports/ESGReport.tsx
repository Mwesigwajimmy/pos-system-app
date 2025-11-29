'use client';

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

interface ESGRow {
  label: string;
  value: string | number;
  unit: string;
  entity: string;
  country: string;
  period: string;
  tenantId: string;
}

export default function ESGReport() {
  const [rows, setRows] = useState<ESGRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setRows([
        { label: "Carbon Emissions", value: 58, unit: "tons CO2", entity: "Main Comp Ltd.", country: "UG", period: "2025-10", tenantId: "tenant-001" },
        { label: "Diversity Index (%)", value: 41.2, unit: "%", entity: "Main Comp Ltd.", country: "UG", period: "2025-10", tenantId: "tenant-001" },
        { label: "Community Investment", value: 900000, unit: "UGX", entity: "Main Comp Ltd.", country: "UG", period: "2025-10", tenantId: "tenant-001" }
      ]);
      setLoading(false);
    }, 400);
  }, []);
  return (
    <Card>
      <CardHeader>
        <CardTitle>ESG (Sustainability) Report</CardTitle>
        <CardDescription>
          Environmental, social and governance KPIs—global standards, ready for export.
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
                  <TableHead>Unit</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Period</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row.label}</TableCell>
                    <TableCell>{row.value}</TableCell>
                    <TableCell>{row.unit}</TableCell>
                    <TableCell>{row.entity}</TableCell>
                    <TableCell>{row.country}</TableCell>
                    <TableCell>{row.period}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </CardContent>
    </Card>
  );
}