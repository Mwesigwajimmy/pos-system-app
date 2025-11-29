'use client';

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface EcommerceKpi {
  label: string;
  value: string | number;
  currency?: string;
  period: string;
}

export default function EcommerceDashboard() {
  const [kpis, setKpis] = useState<EcommerceKpi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setKpis([
        { label: "Total Orders", value: 8210, period: "Current FY" },
        { label: "Gross Sales", value: 2173500, currency: "UGX", period: "Current FY" },
        { label: "Online Conversion Rate", value: "3.2%", period: "Current FY" },
        { label: "Returned Items", value: 331, period: "Current FY" }
      ]);
      setLoading(false);
    }, 350);
  }, []);
  return (
    <Card>
      <CardHeader>
        <CardTitle>E-Commerce Main Dashboard</CardTitle>
        <CardDescription>
          Executive KPIs for orders, sales, conversion & returns.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="py-14 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>
          : (
            <ul>
              {kpis.map((kpi, idx) => (
                <li key={idx} className="flex items-center gap-4 py-2 border-b">
                  <span className="font-semibold">{kpi.label}</span>
                  <span className="ml-auto font-mono text-lg">
                    {kpi.currency ? `${kpi.currency} ` : ""}
                    {typeof kpi.value === "number"
                      ? (+kpi.value).toLocaleString()
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