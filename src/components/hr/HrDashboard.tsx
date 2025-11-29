'use client';

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface HrKpi {
  label: string;
  value: string | number;
  unit?: string;
  period: string;
}

export default function HrDashboard() {
  const [kpis, setKpis] = useState<HrKpi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setKpis([
        { label: "Total Employees", value: 133, period: "Current" },
        { label: "Turnover Rate", value: "5.1%", period: "Year-to-date" },
        { label: "Open Positions", value: 7, period: "Current" },
        { label: "Absence Rate", value: "2.7%", period: "Last Month" },
        { label: "Payroll Cost", value: 98000000, unit: "UGX", period: "Q3 2025" }
      ]);
      setLoading(false);
    }, 320);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>HR Dashboard</CardTitle>
        <CardDescription>
          KPIs for headcount, recruiting, payroll, and trends across all companies/entities.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-14 flex justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>
        ) : (
          <ul>
            {kpis.map((kpi, i) => (
              <li key={i} className="flex gap-3 items-center py-2 border-b">
                <span className="font-semibold">{kpi.label}</span>
                <span className="ml-auto font-mono text-lg">
                  {typeof kpi.value === "number"
                    ? (kpi.unit ? kpi.unit + " " : "") + (+kpi.value).toLocaleString()
                    : kpi.value}
                </span>
                <span className="ml-8 text-xs text-muted-foreground">{kpi.period}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}