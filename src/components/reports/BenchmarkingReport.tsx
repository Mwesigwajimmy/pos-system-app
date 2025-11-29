'use client';

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown, Equal } from 'lucide-react';

interface BenchmarkKPI {
  label: string;
  yourValue: number;
  industry: number;
  peer: number;
  currency: string;
}

export default function BenchmarkingReport() {
  const [metrics, setMetrics] = useState<BenchmarkKPI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setMetrics([
        { label: "Net Margin %", yourValue: 8.9, industry: 10.5, peer: 8.3, currency: "%" },
        { label: "Return on Assets", yourValue: 5.7, industry: 6.4, peer: 5.2, currency: "%" },
        { label: "Inventory Turnover", yourValue: 50, industry: 48, peer: 43, currency: "" }
      ]);
      setLoading(false);
    }, 350);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Benchmarking Report</CardTitle>
        <CardDescription>
          Compare your KPIs to industry and peer medians—global, regional, by sector.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex py-20 justify-center"><Loader2 className="animate-spin w-10 h-10" /></div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-2">KPI</th>
                <th className="text-right py-2">Your Value</th>
                <th className="text-right py-2">Industry Median</th>
                <th className="text-right py-2">Peer Median</th>
                <th className="text-center py-2">Performance</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((kpi, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2">{kpi.label}</td>
                  <td className="text-right py-2">{kpi.yourValue.toLocaleString()} {kpi.currency}</td>
                  <td className="text-right py-2">{kpi.industry.toLocaleString()} {kpi.currency}</td>
                  <td className="text-right py-2">{kpi.peer.toLocaleString()} {kpi.currency}</td>
                  <td className="text-center py-2">
                    {kpi.yourValue > kpi.industry
                      ? <span className="text-green-700 flex items-center justify-center"><TrendingUp className="w-4 h-4 mr-1" />Above</span>
                      : kpi.yourValue < kpi.industry
                      ? <span className="text-red-700 flex items-center justify-center"><TrendingDown className="w-4 h-4 mr-1" />Below</span>
                      : <span className="text-neutral-700 flex items-center justify-center"><Equal className="w-4 h-4 mr-1" />At Median</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}