'use client';

import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { DollarSign, ShoppingBag, ArrowRightLeft, Percent } from "lucide-react";

// 1. Strict Type Definitions
export interface DashboardMetrics {
  totalOrders: number;
  grossSales: number;
  conversionRate: number; // percentage
  returnedItems: number;
  currency: string;
  period: string;
}

interface EcommerceDashboardProps {
  metrics: DashboardMetrics;
}

export function EcommerceDashboard({ metrics }: EcommerceDashboardProps) {
  // Utility: Currency Formatter
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: metrics.currency || 'USD',
      maximumFractionDigits: 0 
    }).format(value);

  // Utility: Number Formatter
  const formatNumber = (value: number) => 
    new Intl.NumberFormat('en-US').format(value);

  // Configuration for the 4 KPI Cards
  const kpiCards = [
    {
      label: "Total Orders",
      value: formatNumber(metrics.totalOrders),
      subtext: `${metrics.period} volume`,
      icon: ShoppingBag,
      color: "text-blue-600 dark:text-blue-400"
    },
    {
      label: "Gross Sales",
      value: formatCurrency(metrics.grossSales),
      subtext: `${metrics.period} revenue`,
      icon: DollarSign,
      color: "text-emerald-600 dark:text-emerald-400"
    },
    {
      label: "Conversion Rate",
      value: `${metrics.conversionRate.toFixed(2)}%`,
      subtext: "Visits to Order ratio",
      icon: Percent,
      color: "text-violet-600 dark:text-violet-400"
    },
    {
      label: "Returned Items",
      value: formatNumber(metrics.returnedItems),
      subtext: "Processed returns",
      icon: ArrowRightLeft,
      color: "text-orange-600 dark:text-orange-400"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpiCards.map((kpi, idx) => (
        <Card key={idx} className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {kpi.label}
            </CardTitle>
            <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpi.subtext}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}