import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import FiscalReportClient, { FiscalRow } from '@/components/reports/FiscalReport';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Annual Fiscal Report',
  description: 'Summarized equity and profit statements for board review.',
};

export default async function FiscalReportPage({ searchParams }: { searchParams: { year?: string } }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  // Default to current year if not specified
  const year = searchParams.year ? parseInt(searchParams.year) : new Date().getFullYear();

  try {
    // CALL THE SMART SQL FUNCTION
    const { data, error } = await supabase.rpc('get_fiscal_year_summary', { p_year: year });

    if (error) throw new Error(error.message);

    // EXTRACT REAL ENTERPRISE DATA
    // We default to 0 to prevent UI crashes if the DB returns nulls
    const openingEquity = Number(data?.opening_equity ?? 0);
    const netProfit = Number(data?.net_profit ?? 0);
    const dividends = Number(data?.dividends ?? 0);
    
    // Dynamic Business Details
    const currency = data?.currency || "UGX";
    const entityName = data?.entity_name || "My Organization";
    const countryCode = data?.country_code || "Global";

    // Closing Equity Calculation: Opening + Profit - Dividends
    const closingEquity = openingEquity + netProfit - dividends;

    const rows: FiscalRow[] = [
      {
        label: "Opening Equity",
        value: openingEquity,
        currency,
        entity: entityName,
        country: countryCode,
        year
      },
      {
        label: "Net Profit (Loss)",
        value: netProfit,
        currency,
        entity: entityName,
        country: countryCode,
        year
      },
      {
        label: "Dividends Declared",
        value: dividends,
        currency,
        entity: entityName,
        country: countryCode,
        year
      },
      {
        label: "Closing Equity",
        value: closingEquity,
        currency,
        entity: entityName,
        country: countryCode,
        year
      }
    ];

    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-slate-50/30 min-h-screen">
        <FiscalReportClient data={rows} year={year} />
      </div>
    );

  } catch (error: any) {
    return (
        <div className="flex items-center justify-center h-[50vh] p-6">
            <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-lg p-6 shadow-sm">
                <h3 className="font-bold text-red-800">Fiscal Report Error</h3>
                <p className="text-sm text-red-600 mt-2">
                    {error.message || "An unexpected error occurred while generating the report."}
                </p>
            </div>
        </div>
    );
  }
}