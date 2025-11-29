'use client';

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface KPIRow {
  label: string;
  value: number | string;
  currency?: string;
  entity?: string;
  country?: string;
}
interface RatioRow {
  ratio: string;
  value: string | number;
  entity?: string;
  country?: string;
}

export default function ExecutiveSummaryReport() {
  const [kpis, setKpis] = useState<KPIRow[]>([]);
  const [ratios, setRatios] = useState<RatioRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setKpis([
        { label: "Total Assets", value: 53000000, currency: "UGX", entity: "Main Comp Ltd.", country: "UG" },
        { label: "Gross Profit", value: 14200000, currency: "UGX", entity: "Main Comp Ltd.", country: "UG" },
        { label: "Net Income", value: 8005000, currency: "UGX", entity: "Main Comp Ltd.", country: "UG" },
        { label: "Cash Reserves", value: 27400, currency: "AUD", entity: "Global Branch AU", country: "AU" }
      ]);
      setRatios([
        { ratio: "Gross Margin %", value: "31.6%", entity: "Main Comp Ltd.", country: "UG" },
        { ratio: "Current Ratio", value: 3.2, entity: "Main Comp Ltd.", country: "UG" },
        { ratio: "Debt/Equity", value: 0.47, entity: "Main Comp Ltd.", country: "UG" }
      ]);
      setLoading(false);
    }, 400);
  }, []);

  if (loading) return (
    <Card><CardHeader><CardTitle>Executive Summary</CardTitle></CardHeader>
    <CardContent className="py-14 flex justify-center"><Loader2 className="h-10 w-10 animate-spin"/></CardContent></Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Executive Financial Summary</CardTitle>
        <CardDescription>Key metrics and ratios by company, region, and currency.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-8">
          <section>
            <h2 className="font-bold text-lg mb-2">KPIs</h2>
            <ul>
              {kpis.map((row, i) => (
                <li key={i} className="flex py-1 border-b">
                  <span className="w-40">{row.label}</span>
                  <span className="ml-auto font-mono text-lg font-bold">
                    {typeof row.value === "number" ? `${row.currency || ""} ${parseFloat(String(row.value)).toLocaleString()}` : row.value}
                  </span>
                  <span className="ml-3 text-xs text-muted-foreground">{row.entity} • {row.country}</span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="font-bold text-lg mb-2">Financial Ratios</h2>
            <ul>
              {ratios.map((r, i) => (
                <li key={i} className="flex py-1 border-b">
                  <span className="w-32">{r.ratio}</span>
                  <span className="ml-auto font-mono text-lg">{r.value}</span>
                  <span className="ml-3 text-xs text-muted-foreground">{r.entity} • {r.country}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}