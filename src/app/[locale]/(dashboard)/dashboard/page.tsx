import React from 'react';
import DashboardClientPage from '@/components/DashboardClientPage';
import { Metadata } from 'next';

// 1. Add Metadata for SEO and browser tab titles (Professional touch)
export const metadata: Metadata = {
  title: 'Dashboard Overview | POS System',
  description: 'Real-time business overview, financial KPIs, and inventory alerts.',
};

// 2. This is the Server Component that loads the page
export default function DashboardOverviewPage() {
  return (
    <main className="min-h-screen w-full bg-background">
      {/* 
         3. We render the Client Component here. 
         This separates Server logic (Metadata) from Client logic (Interactivity/State)
      */}
      <DashboardClientPage />
    </main>
  );
}