import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import FiscalReportClient, { FiscalRow } from '@/components/reports/FiscalReport';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Fiscal Report',
  description: 'Equity and profit analysis by period.',
};

export default async function FiscalReportPage({ 
  searchParams 
}: { 
  searchParams: { year?: string, month?: string } 
}) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  // Parse params
  const year = searchParams.year ? parseInt(searchParams.year) : new Date().getFullYear();
  // 0 means "Full Year", 1-12 means specific months
  const month = searchParams.month ? parseInt(searchParams.month) : 0; 

  try {
    // CALL THE NEW FUNCTION
    // Passing 0 or null for p_month triggers the "Full Year" logic in SQL
    const { data, error } = await supabase.rpc('get_fiscal_summary', { 
      p_year: year, 
      p_month: month === 0 ? null : month 
    });

    if (error) throw new Error(error.message);

    const openingEquity = Number(data?.opening_equity ?? 0);
    const netProfit = Number(data?.net_profit ?? 0);
    const dividends = Number(data?.dividends ?? 0);
    const currency = data?.currency || "UGX";
    const entityName = data?.entity_name || "My Organization";
    const countryCode = data?.country_code || "Global";
    const periodLabel = data?.period_label || String(year);

    const closingEquity = openingEquity + netProfit - dividends;

    const rows: FiscalRow[] = [
      {
        label: "Opening Equity",
        value: openingEquity,
        currency,
        entity: entityName,
        country: countryCode,
        period: periodLabel
      },
      {
        label: "Net Profit (Loss)",
        value: netProfit,
        currency,
        entity: entityName,
        country: countryCode,
        period: periodLabel
      },
      {
        label: "Dividends Declared",
        value: dividends,
        currency,
        entity: entityName,
        country: countryCode,
        period: periodLabel
      },
      {
        label: "Closing Equity",
        value: closingEquity,
        currency,
        entity: entityName,
        country: countryCode,
        period: periodLabel
      }
    ];

    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-slate-50/30 min-h-screen">
        <FiscalReportClient data={rows} year={year} month={month} />
      </div>
    );

  } catch (error: any) {
    return (
        <div className="flex items-center justify-center h-[50vh] p-6">
            <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-lg p-6 shadow-sm">
                <h3 className="font-bold text-red-800">Report Error</h3>
                <p className="text-sm text-red-600 mt-2">{error.message}</p>
            </div>
        </div>
    );
  }
}