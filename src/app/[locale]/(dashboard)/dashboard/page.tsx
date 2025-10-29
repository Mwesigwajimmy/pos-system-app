// src/app/[locale]/(dashboard)/dashboard/page.tsx
import React from 'react';
import { LayoutDashboard } from 'lucide-react';

// This file will now load when the URL is /en/dashboard
export default function DashboardOverviewPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold flex items-center">
         <LayoutDashboard className="h-7 w-7 mr-3" /> Dashboard Overview
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
         This is the correct location for your main dashboard overview components (charts, KPIs, etc.).
      </p>
      <p className="mt-2 text-sm text-green-600">
         The AI Chat component has been successfully moved to the /copilot route!
      </p>
    </div>
  );
}