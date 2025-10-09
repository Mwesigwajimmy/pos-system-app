// src/components/compliance/TaxReportGenerator.tsx
'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { TaxReport } from '@/types/dashboard';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';

const supabase = createClient();

// Helper to format dates for input fields
const formatDateForInput = (date: Date) => date.toISOString().split('T')[0];

// Helper to format numbers as currency
const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value)}`;

async function fetchTaxReport(filters: any): Promise<TaxReport> {
  if (!filters.startDate || !filters.endDate) {
    throw new Error('Please select a valid date range.');
  }
  const { data, error } = await supabase.rpc('generate_tax_report', {
    p_business_id: 1, // Hardcoded for now
    p_tax_type: 'VAT', // Hardcoded for now, could be a dropdown later
    p_start_date: filters.startDate,
    p_end_date: filters.endDate,
  });
  if (error) throw new Error(error.message);
  return data;
}

export default function TaxReportGenerator() {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [filters, setFilters] = useState({
    startDate: formatDateForInput(firstDayOfMonth),
    endDate: formatDateForInput(today),
  });

  const { data, isLoading, error, refetch, isFetching } = useQuery<TaxReport>({
    queryKey: ['taxReport', filters],
    queryFn: () => fetchTaxReport(filters),
    enabled: false, // Important: Don't run query on page load
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">VAT Tax Report</CardTitle>
        <p className="text-sm text-gray-500">Calculate your VAT liability for a specific period.</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col md:flex-row items-center gap-4 p-4 border rounded-lg bg-gray-50">
          <div className="grid w-full items-center gap-1.5">
              <label htmlFor="start-date" className="text-sm font-medium">Start Date</label>
              <Input type="date" id="start-date" value={filters.startDate} onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value }))} />
          </div>
          <div className="grid w-full items-center gap-1.5">
              <label htmlFor="end-date" className="text-sm font-medium">End Date</label>
              <Input type="date" id="end-date" value={filters.endDate} onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value }))} />
          </div>
          <Button onClick={() => refetch()} disabled={isFetching} className="w-full md:w-auto self-end">
            {isFetching ? 'Generating...' : 'Generate Report'}
          </Button>
        </div>

        {error && <div className="text-center p-4 text-red-600 bg-red-50 rounded-md">Error: {error.message}</div>}
        
        {data && (
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">Total Taxable Sales</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(data.taxable_sales)}</p>
              </div>
               <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-orange-800">Calculated VAT Liability</p>
                <p className="text-2xl font-bold text-orange-900">{formatCurrency(data.tax_liability)}</p>
              </div>
               <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">VAT Payments Made</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(data.payments_made)}</p>
              </div>
            </div>
            <div className={`p-6 rounded-lg text-center ${data.balance_due > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              <p className={`text-lg font-medium ${data.balance_due > 0 ? 'text-red-800' : 'text-green-800'}`}>
                {data.balance_due > 0 ? 'Balance Due to URA' : 'Credit / Refund Due'}
              </p>
              <p className={`text-4xl font-bold ${data.balance_due > 0 ? 'text-red-900' : 'text-green-900'}`}>
                {formatCurrency(Math.abs(data.balance_due))}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}