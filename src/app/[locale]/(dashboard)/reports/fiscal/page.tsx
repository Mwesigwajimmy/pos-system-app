import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import FiscalReportClient, { FiscalRow } from '@/components/reports/FiscalReport';
import { createClient } from '@/lib/supabase/server';
import { AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Fiscal Position Report | Enterprise Finance',
  description: 'Comprehensive analysis of equity, retained earnings, and net profit distribution.',
};

export default async function FiscalReportPage({ 
  searchParams 
}: { 
  searchParams: { year?: string, month?: string, country?: string } 
}) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  // 1. Parse Parameters with Defaults
  const year = searchParams.year ? parseInt(searchParams.year) : new Date().getFullYear();
  const month = searchParams.month ? parseInt(searchParams.month) : 0; 
  const country = searchParams.country || 'All';

  try {
    // 2. Enterprise Parallel Data Fetching
    // We fetch the Fiscal Summary AND the list of Active Jurisdictions simultaneously for speed.
    const [reportRes, countriesRes] = await Promise.all([
      supabase.rpc('get_fiscal_summary', { 
        p_year: year, 
        p_month: month === 0 ? null : month,
        p_country: country
      }),
      supabase.rpc('get_active_jurisdictions')
    ]);

    if (reportRes.error) throw new Error(`Fiscal Data Error: ${reportRes.error.message}`);
    if (countriesRes.error) console.warn(`Jurisdiction Fetch Warning: ${countriesRes.error.message}`);

    // 3. Safe Data Extraction & Normalization
    const data = reportRes.data || {};
    const availableCountries: string[] = countriesRes.data?.map((c: any) => c.country_name) || [];
    
    // Ensure "Uganda" exists if list is empty (Smart Default)
    if (availableCountries.length === 0) availableCountries.push('Uganda');

    const openingEquity = Number(data.opening_equity ?? 0);
    const netProfit = Number(data.net_profit ?? 0);
    const dividends = Number(data.dividends ?? 0);
    const currency = data.currency || "UGX";
    const entityName = data.entity_name || "Organization Name Not Set";
    const countryCode = data.country_code || "Global Consolidated";
    const periodLabel = data.period_label || String(year);

    // Accounting Equation: Closing = Opening + Net Profit - Dividends
    const closingEquity = openingEquity + netProfit - dividends;

    // 4. Construct Professional Data Rows
    const rows: FiscalRow[] = [
      { 
        id: 'equity_open',
        label: "Opening Equity", 
        description: "Retained earnings carried forward from previous fiscal periods.",
        value: openingEquity, 
        currency, 
        entity: entityName, 
        country: countryCode, 
        period: periodLabel,
        isTotal: false
      },
      { 
        id: 'net_profit',
        label: "Net Profit (Loss)", 
        description: "Total Revenue minus Total Expenses for the selected period.",
        value: netProfit, 
        currency, 
        entity: entityName, 
        country: countryCode, 
        period: periodLabel,
        isTotal: false
      },
      { 
        id: 'dividends',
        label: "Dividends Declared", 
        description: "Distributions of equity/profit to shareholders during this period.",
        value: dividends, 
        currency, 
        entity: entityName, 
        country: countryCode, 
        period: periodLabel,
        isTotal: false
      },
      { 
        id: 'equity_close',
        label: "Closing Equity", 
        description: "Net value of the business assets after liabilities and distributions.",
        value: closingEquity, 
        currency, 
        entity: entityName, 
        country: countryCode, 
        period: periodLabel,
        isTotal: true // Highlights this row
      }
    ];

    // 5. Render Client Component
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-slate-50/50 min-h-screen">
        <FiscalReportClient 
          data={rows} 
          year={year} 
          month={month} 
          country={country} 
          availableCountries={availableCountries} 
        />
      </div>
    );

  } catch (error: any) {
    // 6. Robust Error Boundary
    return (
        <div className="flex items-center justify-center h-[60vh] p-6">
            <div className="max-w-lg w-full bg-white border border-red-200 rounded-xl p-8 shadow-lg text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Unable to Load Fiscal Report</h3>
                <p className="text-sm text-slate-500 mt-2 mb-6">
                    {error.message || "A critical error occurred while calculating the fiscal summary."}
                </p>
                <div className="p-3 bg-slate-50 rounded text-xs font-mono text-slate-600 break-all border">
                    Error Code: FISCAL_RPC_FAILURE
                </div>
            </div>
        </div>
    );
  }
}