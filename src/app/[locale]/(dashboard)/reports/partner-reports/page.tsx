import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import PartnerReportsHubClient from '@/components/reports/PartnerReportsHub';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Partner Reports Hub',
  description: 'External audit packs and tax filings repository.',
};

export default async function PartnerReportsPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from('partner_reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Fetch Partner Reports Error:", error);
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PartnerReportsHubClient initialReports={data || []} />
    </div>
  );
}