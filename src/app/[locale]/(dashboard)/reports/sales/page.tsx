// app/reports/sales/page.tsx
import React from 'react';
import { Metadata } from 'next';
import SalesReportClient from '@/components/reports/SalesReport';

export const metadata: Metadata = {
  title: 'Sales Intelligence Report',
  description: 'Visual analytics of sales performance.',
};

export default function SalesReportsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <SalesReportClient />
    </div>
  );
}