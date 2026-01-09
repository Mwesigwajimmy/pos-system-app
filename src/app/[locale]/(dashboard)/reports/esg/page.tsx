import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
// FIX 2: Imported the type from the component instead of defining it locally
import ESGReportClient, { ESGData } from '@/components/reports/ESGReport';
import { createClient } from '@/lib/supabase/server';
import { startOfYear, endOfMonth } from 'date-fns';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'ESG & Impact Reporting',
  description: 'Environmental, Social, and Governance compliance metrics.',
};

export default async function ESGPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const today = new Date();
  const start = startOfYear(today).toISOString();
  const end = endOfMonth(today).toISOString();

  try {
    const { data, error } = await supabase.rpc('get_esg_impact_metrics', {
      p_start_date: start,
      p_end_date: end
    });

    if (error) throw new Error(error.message);

    // FIX: Using || 0 ensures if the DB value is missing, we don't get NaN
    const economicOutput = Number(data?.economic_output) || 0;
    const paperlessTxns = Number(data?.paperless_transactions) || 0;
    const carbonSaved = Number(data?.carbon_saved_kg) || 0;
    
    const metrics: ESGData[] = [
      {
        label: "Carbon Avoidance",
        value: carbonSaved.toFixed(2),
        raw_value: carbonSaved,
        unit: "kg CO2e",
        category: 'Environmental',
        description: "Emissions avoided by digital invoicing vs paper.",
        trend: 'up'
      },
      {
        label: "Digital Process Adoption",
        value: paperlessTxns.toLocaleString(),
        raw_value: paperlessTxns,
        unit: "Transactions",
        category: 'Governance',
        description: "Total fully digital workflows executed.",
        trend: 'up'
      },
      {
        label: "Local Economic Contribution",
        // FIX: Added a check to prevent "NaNM". If 0, show 0.0M.
        value: economicOutput > 0 
          ? (economicOutput / 1000000).toFixed(1) + "M" 
          : "0.0M",
        raw_value: economicOutput,
        unit: "UGX",
        category: 'Social',
        description: "Direct value generated circulating in local economy.",
        trend: 'up'
      }
    ];

    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-slate-50/50 min-h-screen">
        <ESGReportClient metrics={metrics} year={today.getFullYear()} />
      </div>
    );

  } catch (error: any) {
    return (
        <div className="p-8 border border-red-200 bg-red-50 rounded text-red-700">
            <h3 className="font-bold text-lg">ESG Report Error</h3>
            <p className="mt-2 text-sm">{error.message}</p>
        </div>
    );
  }
}