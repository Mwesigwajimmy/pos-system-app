'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from "@/components/ui/card";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  Activity, 
  Wallet, 
  AlertTriangle,
  CheckCircle2,
  Info
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  Tooltip as UiTooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

// --- Types ---
interface Metrics {
  revenue: number;
  expenses: number;
  net_income: number;
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
}

interface Ratios {
  current_ratio: number;
  net_profit_margin: number;
  debt_to_equity: number;
  return_on_assets: number;
}

interface TrendData {
  period_label: string;
  revenue: number;
  expenses: number;
  net_income: number;
}

interface Props {
  metrics: Metrics;
  ratios: Ratios;
  trends: TrendData[];
  dateRange: DateRange;
}

export default function ExecutiveSummaryReportClient({ metrics, ratios, trends, dateRange }: Props) {
  const router = useRouter();

  // --- Date Handler ---
  const handleDateChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      const fromStr = format(range.from, 'yyyy-MM-dd');
      const toStr = format(range.to, 'yyyy-MM-dd');
      router.push(`?from=${fromStr}&to=${toStr}`);
    }
  };

  // --- Formatters ---
  const formatMoney = (val: number) => 
    new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'UGX', 
        notation: "compact", 
        maximumFractionDigits: 1 
    }).format(val);

  const formatPercent = (val: number) => 
    `${val.toFixed(2)}%`;

  // --- Insight Logic (Real-time Analysis) ---
  const generateInsights = () => {
    const insights = [];
    
    // Profitability Check
    if (ratios.net_profit_margin > 15) {
        insights.push({ type: 'good', msg: "Strong profitability margin exceeding 15%." });
    } else if (ratios.net_profit_margin < 0) {
        insights.push({ type: 'bad', msg: "Business is currently operating at a net loss." });
    } else {
        insights.push({ type: 'neutral', msg: "Profit margins are tight (0-15%). Monitor expenses." });
    }

    // Liquidity Check
    if (ratios.current_ratio > 1.5) {
        insights.push({ type: 'good', msg: "Healthy liquidity. Sufficient assets to cover short-term debts." });
    } else if (ratios.current_ratio < 1.0) {
        insights.push({ type: 'bad', msg: "Liquidity Warning: Current assets are less than liabilities." });
    }

    // Leverage Check
    if (ratios.debt_to_equity > 2.0) {
        insights.push({ type: 'bad', msg: "High leverage detected. Debt is more than 2x equity." });
    }

    return insights;
  };

  const insights = generateInsights();

  return (
    <div className="space-y-8">
      
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Executive Summary</h1>
          <p className="text-slate-500 mt-1">
            Financial position snapshot for <span className="font-semibold text-slate-700">{dateRange.from ? format(dateRange.from, "MMM dd, yyyy") : '...'}</span> to <span className="font-semibold text-slate-700">{dateRange.to ? format(dateRange.to, "MMM dd, yyyy") : '...'}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
           <DatePickerWithRange date={dateRange} setDate={handleDateChange} />
        </div>
      </div>

      {/* 2. Primary KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Revenue */}
        <Card className="shadow-sm border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{formatMoney(metrics.revenue)}</div>
            <p className="text-xs text-slate-500 mt-1">Gross income from operations</p>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card className="shadow-sm border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Expenses</CardTitle>
            <Activity className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{formatMoney(metrics.expenses)}</div>
            <p className="text-xs text-slate-500 mt-1">OpEx + COGS</p>
          </CardContent>
        </Card>

        {/* Net Income */}
        <Card className={`shadow-sm border-l-4 ${metrics.net_income >= 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Net Income</CardTitle>
            <PieChart className={`h-4 w-4 ${metrics.net_income >= 0 ? 'text-green-500' : 'text-red-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.net_income >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatMoney(metrics.net_income)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Bottom line performance</p>
          </CardContent>
        </Card>

        {/* Equity */}
        <Card className="shadow-sm border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Equity</CardTitle>
            <Wallet className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{formatMoney(metrics.total_equity)}</div>
            <p className="text-xs text-slate-500 mt-1">Assets - Liabilities</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Charts & Detailed Analysis */}
      <div className="grid gap-6 md:grid-cols-7">
        
        {/* Trend Chart (Takes up 4 columns) */}
        <Card className="md:col-span-4 shadow-sm">
            <CardHeader>
                <CardTitle>Financial Performance Trend</CardTitle>
                <CardDescription>Trailing 12-month Revenue vs Expenses comparison</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="period_label" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <Tooltip 
                            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                            formatter={(value: number) => formatMoney(value)}
                        />
                        <Legend />
                        <Area 
                            type="monotone" 
                            dataKey="revenue" 
                            name="Revenue" 
                            stroke="#3b82f6" 
                            fillOpacity={1} 
                            fill="url(#colorRev)" 
                        />
                        <Area 
                            type="monotone" 
                            dataKey="expenses" 
                            name="Expenses" 
                            stroke="#f97316" 
                            fillOpacity={1} 
                            fill="url(#colorExp)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>

        {/* Ratios & Insights (Takes up 3 columns) */}
        <div className="md:col-span-3 space-y-6">
            
            {/* Financial Ratios Table */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>Key Financial Ratios</CardTitle>
                    <CardDescription>Efficiency & Leverage indicators</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <TooltipProvider>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-slate-700">Net Profit Margin</span>
                                <TooltipTrigger>
                                    <Info className="h-3 w-3 text-slate-400 cursor-help"/>
                                </TooltipTrigger>
                                <TooltipContent><p>Percentage of revenue retained as profit.</p></TooltipContent>
                            </div>
                            <span className={`font-mono font-bold ${ratios.net_profit_margin > 15 ? 'text-green-600' : 'text-slate-800'}`}>
                                {formatPercent(ratios.net_profit_margin)}
                            </span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-slate-700">Current Ratio</span>
                                <TooltipTrigger>
                                    <Info className="h-3 w-3 text-slate-400 cursor-help"/>
                                </TooltipTrigger>
                                <TooltipContent><p>Ability to pay short-term debts (Assets/Liabilities).</p></TooltipContent>
                            </div>
                            <span className={`font-mono font-bold ${ratios.current_ratio > 1.5 ? 'text-green-600' : ratios.current_ratio < 1 ? 'text-red-600' : 'text-slate-800'}`}>
                                {ratios.current_ratio.toFixed(2)}
                            </span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-slate-700">Debt-to-Equity</span>
                                <TooltipTrigger>
                                    <Info className="h-3 w-3 text-slate-400 cursor-help"/>
                                </TooltipTrigger>
                                <TooltipContent><p>Degree of leverage used to finance the company.</p></TooltipContent>
                            </div>
                            <span className={`font-mono font-bold ${ratios.debt_to_equity > 2 ? 'text-red-600' : 'text-slate-800'}`}>
                                {ratios.debt_to_equity.toFixed(2)}
                            </span>
                        </div>
                    </TooltipProvider>
                </CardContent>
            </Card>

            {/* Automated Insights Panel */}
            <Card className="shadow-sm bg-slate-900 border-slate-800">
                <CardHeader className="pb-3">
                    <CardTitle className="text-white flex items-center gap-2">
                        <Activity className="h-5 w-5 text-indigo-400"/> 
                        System Analysis
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {insights.length === 0 ? (
                        <p className="text-slate-400 text-sm">No significant anomalies detected in current data.</p>
                    ) : (
                        insights.map((insight, idx) => (
                            <div key={idx} className="flex gap-3 items-start p-3 rounded bg-slate-800/50 border border-slate-700">
                                {insight.type === 'good' && <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />}
                                {insight.type === 'bad' && <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />}
                                {insight.type === 'neutral' && <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />}
                                
                                <p className="text-sm text-slate-200 leading-snug">
                                    {insight.msg}
                                </p>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}