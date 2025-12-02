import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import BenchmarkingReportClient, { BenchmarkData } from '@/components/reports/BenchmarkingReport';
import { createClient } from '@/lib/supabase/server';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Performance Benchmarking',
  description: 'Month-over-month performance comparison against historical baselines.',
};

export default async function BenchmarkingPage({ searchParams }: { searchParams: { date?: string } }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const dateParam = searchParams.date ? new Date(searchParams.date) : new Date();
  const start = startOfMonth(dateParam).toISOString();
  const end = endOfMonth(dateParam).toISOString();

  try {
    const { data, error } = await supabase.rpc('get_kpi_benchmarks', {
      p_start_date: start,
      p_end_date: end
    });

    if (error) {
      console.error("Supabase RPC Error:", error); // Log it for debugging
      throw new Error(error.message);
    }

    // --- FIX: DEFENSIVE CODING START ---
    // We use ?. (optional chaining) and ?? (default value)
    // This prevents the "Cannot read properties of undefined" error FOREVER.
    
    const safeData = data || {}; // Ensure data isn't null

    const calculateVariance = (curr: number, prev: number) => {
        if (prev === 0) return curr > 0 ? 100 : 0;
        return ((curr - prev) / prev) * 100;
    };

    // Safely extract values, defaulting to 0 if anything is missing
    const revCurr = Number(safeData?.revenue?.current ?? 0);
    const revPrev = Number(safeData?.revenue?.previous ?? 0);
    
    const txCurr = Number(safeData?.transactions?.current ?? 0);
    const txPrev = Number(safeData?.transactions?.previous ?? 0);

    const aovCurr = Number(safeData?.average_order_value?.current ?? 0);
    const aovPrev = Number(safeData?.average_order_value?.previous ?? 0);
    // --- FIX END ---

    const benchmarks: BenchmarkData[] = [
      {
        kpi: "Total Revenue",
        current_value: revCurr,
        previous_value: revPrev,
        variance_percent: calculateVariance(revCurr, revPrev),
        unit: "UGX",
        status: revCurr >= revPrev ? 'positive' : 'negative'
      },
      {
        kpi: "Transaction Volume",
        current_value: txCurr,
        previous_value: txPrev,
        variance_percent: calculateVariance(txCurr, txPrev),
        unit: "Txns",
        status: txCurr >= txPrev ? 'positive' : 'negative'
      },
      {
        kpi: "Average Order Value",
        current_value: aovCurr,
        previous_value: aovPrev,
        variance_percent: calculateVariance(aovCurr, aovPrev),
        unit: "UGX",
        status: aovCurr >= aovPrev ? 'positive' : 'neutral'
      }
    ];

    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-slate-50/50 min-h-screen">
        <BenchmarkingReportClient 
            data={benchmarks} 
            reportDate={format(dateParam, 'yyyy-MM-dd')}
        />
      </div>
    );

  } catch (error: any) {
    // This will now catch RPC errors gracefully
    return (
        <div className="p-8 border border-red-200 bg-red-50 rounded text-red-700">
            <h3 className="font-bold text-lg">Benchmark Load Failed</h3>
            <p className="mt-2 text-sm">{error.message || "Unknown error occurred"}</p>
            {/* Optional: Show what went wrong strictly for debugging */}
            <pre className="mt-2 text-xs opacity-50">{JSON.stringify(error, null, 2)}</pre>
        </div>
    );
  }
}