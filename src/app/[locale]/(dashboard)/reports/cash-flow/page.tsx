import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import CashFlowReportClient from '@/components/reports/CashFlowReport';

// This ensures the report always shows the latest financial data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Forensic Cash Flow Analysis | Aura System',
  description: 'Real-time indirect method cash flow reconciliation with forensic audit trail.',
};

/**
 * PAGE COMPONENT
 * This is the Server-Side entry point. 
 * We keep this light because the Client Component (Aura) handles the 
 * interactive filtering, currency switching, and tax logic.
 */
export default async function CashFlowPage({ 
  searchParams 
}: { 
  searchParams: { [key: string]: string | string[] | undefined } 
}) {
  
  // 1. We don't fetch data here because our Client Component uses TanStack Query 
  // to allow the user to change dates and currencies without a full page reload.
  
  return (
    <main className="min-h-screen bg-slate-50/50">
      {/* 
        We simply render the Client Component. 
        It will automatically detect the 'cur', 'range', and 'type' 
        from the URL searchParams thanks to the logic we built into it.
      */}
      <div className="flex-1">
        <CashFlowReportClient />
      </div>
    </main>
  );
}