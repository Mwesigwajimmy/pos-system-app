import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import ExecutiveSummaryReportClient from '@/components/reports/ExecutiveSummaryReport';
import { createClient } from '@/lib/supabase/server';
import { startOfYear, endOfMonth, subMonths } from 'date-fns';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Executive Summary | Business Intelligence',
  description: 'C-Level financial dashboard showing real-time KPIs, ratios, and performance trends.',
};

export interface KPIMetrics {
  revenue: number;
  expenses: number;
  net_income: number;
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
}

export interface TrendDataPoint {
  period_label: string;
  revenue: number;
  expenses: number;
  net_income: number;
}

export default async function ExecutiveSummaryPage({ searchParams }: { searchParams: { from?: string, to?: string } }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const today = new Date();
  const defaultFrom = startOfYear(today).toISOString();
  const defaultTo = endOfMonth(today).toISOString();

  const fromParam = searchParams.from || defaultFrom;
  const toParam = searchParams.to || defaultTo;

  try {
    const [metricsRes, trendsRes] = await Promise.all([
      supabase.rpc('get_real_financial_metrics', {
        p_start_date: fromParam,
        p_end_date: toParam
      }),
      supabase.rpc('get_monthly_financial_trend', {
        p_start_date: subMonths(new Date(toParam), 11).toISOString(),
        p_end_date: toParam
      })
    ]);

    if (metricsRes.error) console.error("Metrics RPC Error:", metricsRes.error);
    if (trendsRes.error) console.error("Trends RPC Error:", trendsRes.error);

    // --- FIX: DEFENSIVE CODING ---
    // Ensure we have an object, even if DB returns null
    const rawMetrics = metricsRes.data || {}; 
    const rawTrends = trendsRes.data || [];

    const metrics: KPIMetrics = {
      revenue: Number(rawMetrics?.revenue ?? 0),
      expenses: Number(rawMetrics?.expenses ?? 0),
      net_income: Number(rawMetrics?.net_income ?? 0),
      total_assets: Number(rawMetrics?.total_assets ?? 0),
      total_liabilities: Number(rawMetrics?.total_liabilities ?? 0),
      total_equity: Number(rawMetrics?.total_equity ?? 0),
    };

    const trends: TrendDataPoint[] = Array.isArray(rawTrends) 
      ? rawTrends.map((t: any) => ({
          period_label: t.period_label || 'Unknown',
          revenue: Number(t.revenue ?? 0),
          expenses: Number(t.expenses ?? 0),
          net_income: Number(t.net_income ?? 0)
        }))
      : [];

    const ratios = {
      current_ratio: metrics.total_liabilities > 0 
        ? metrics.total_assets / metrics.total_liabilities 
        : (metrics.total_assets > 0 ? 999 : 0),
      
      net_profit_margin: metrics.revenue > 0 
        ? (metrics.net_income / metrics.revenue) * 100 
        : 0,
      
      debt_to_equity: metrics.total_equity > 0 
        ? metrics.total_liabilities / metrics.total_equity 
        : 0,
      
      return_on_assets: metrics.total_assets > 0 
        ? (metrics.net_income / metrics.total_assets) * 100 
        : 0
    };

    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-slate-50/30 min-h-screen">
        <ExecutiveSummaryReportClient 
          metrics={metrics}
          ratios={ratios}
          trends={trends}
          dateRange={{ from: new Date(fromParam), to: new Date(toParam) }} 
        />
      </div>
    );

  } catch (error: any) {
    console.error("Executive Summary Load Failed:", error);
    return (
      <div className="flex items-center justify-center h-[50vh] p-6">
        <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold text-red-700 mb-2">Report Generation Failed</h2>
            <p className="text-sm text-red-600 mb-4">
                We couldn't load the Executive Summary.
            </p>
            <div className="bg-white p-3 rounded border border-red-100 font-mono text-xs text-red-500 break-words">
                {error.message || String(error)}
            </div>
        </div>
      </div>
    );
  }
}