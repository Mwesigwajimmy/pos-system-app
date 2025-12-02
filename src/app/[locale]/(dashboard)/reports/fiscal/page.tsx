import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
// FIX 2: Imported the type from the component instead of defining it locally
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
  
  const year = searchParams.year ? parseInt(searchParams.year) : new Date().getFullYear();

  try {
    const { data, error } = await supabase.rpc('get_fiscal_year_summary', { p_year: year });

    if (error) throw new Error(error.message);

    const entityName = "Main Comp Ltd."; 
    const countryCode = "UG"; 
    const currency = "UGX"; 

    const rows: FiscalRow[] = [
      {
        label: "Opening Equity",
        value: Number(data.opening_equity),
        currency,
        entity: entityName,
        country: countryCode,
        year
      },
      {
        label: "Net Profit (Loss)",
        value: Number(data.net_profit),
        currency,
        entity: entityName,
        country: countryCode,
        year
      },
      {
        label: "Dividends Declared",
        value: Number(data.dividends),
        currency,
        entity: entityName,
        country: countryCode,
        year
      },
      {
        label: "Closing Equity",
        value: Number(data.opening_equity) + Number(data.net_profit) - Number(data.dividends),
        currency,
        entity: entityName,
        country: countryCode,
        year
      }
    ];

    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <FiscalReportClient data={rows} year={year} />
      </div>
    );

  } catch (error: any) {
    return (
        <div className="p-8 border border-red-200 bg-red-50 text-red-700 rounded">
            <h3 className="font-bold">Fiscal Report Error</h3>
            <p className="text-sm mt-2">{error.message}</p>
        </div>
    );
  }
}