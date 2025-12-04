'use client';

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export interface HrKpi {
  label: string;
  value: string | number;
  unit?: string;
  period: string;
}

interface HrDashboardProps {
  kpis: HrKpi[];
}

export default function HrDashboard({ kpis }: HrDashboardProps) {
  // No useEffect, no setTimeout. Data comes from the Server Page.
  return (
    <Card>
      <CardHeader>
        <CardTitle>HR Dashboard</CardTitle>
        <CardDescription>
          KPIs for headcount, recruiting, payroll, and trends.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}