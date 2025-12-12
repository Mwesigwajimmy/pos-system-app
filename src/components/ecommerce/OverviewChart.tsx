'use client';

import React from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, BarChart3 } from "lucide-react";

// 1. Strict Type Definition
export interface MonthlySalesData {
  name: string; // e.g., "Jan", "Feb"
  total: number; // The aggregated revenue
}

interface OverviewChartProps {
  data: MonthlySalesData[];
  currency?: string;
  year: number;
}

export function OverviewChart({ data, currency = 'USD', year }: OverviewChartProps) {
  
  // Utility: Format Axis Ticks
  const formatCurrencyAxis = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currency,
      notation: "compact", 
      compactDisplay: "short" 
    }).format(value);

  // Utility: Format Tooltip
  const formatTooltip = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currency 
    }).format(value);

  return (
    <Card className="col-span-4 h-full border-zinc-200 dark:border-zinc-800">
        <CardHeader>
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary"/>
                        Revenue Overview
                    </CardTitle>
                    <CardDescription>
                        Monthly financial performance for the year {year}.
                    </CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent className="pl-2">
            {data.length === 0 ? (
                <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                    <p>No sales data available for this period.</p>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={data}>
                        <XAxis
                            dataKey="name"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={formatCurrencyAxis}
                        />
                        <Tooltip 
                            cursor={{ fill: 'transparent' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                return (
                                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex flex-col">
                                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                    Month
                                                </span>
                                                <span className="font-bold text-muted-foreground">
                                                    {payload[0].payload.name}
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                    Revenue
                                                </span>
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                    {formatTooltip(payload[0].value as number)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                                }
                                return null;
                            }}
                        />
                        <Bar
                            dataKey="total"
                            fill="currentColor"
                            radius={[4, 4, 0, 0]}
                            className="fill-primary"
                            // Animation settings for smoother entry
                            animationDuration={1500}
                        />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </CardContent>
    </Card>
  );
}