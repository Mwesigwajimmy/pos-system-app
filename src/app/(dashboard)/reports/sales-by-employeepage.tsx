import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import SalesByEmployeeReport from '@/components/reports/SalesByEmployeeReport';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Sales by Employee Report',
  description: 'Analyze sales performance and visualize data for each staff member.',
};

const Breadcrumbs = () => (
  <nav aria-label="breadcrumb" className="flex items-center text-sm text-muted-foreground mb-4">
    <Link href="/dashboard" className="hover:underline">
      Dashboard
    </Link>
    <ChevronRight className="h-4 w-4 mx-1" />
    <Link href="/reports" className="hover:underline">
      Reports
    </Link>
    <ChevronRight className="h-4 w-4 mx-1" />
    <span className="font-medium text-foreground" aria-current="page">
      Sales by Employee
    </span>
  </nav>
);

const ReportSkeleton = () => (
    <Card>
        <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-3/4 mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex flex-wrap items-center gap-4">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="col-span-1 border rounded-lg p-4">
                    <Skeleton className="h-8 w-full mb-4" />
                    <Skeleton className="h-8 w-full mb-2" />
                    <Skeleton className="h-8 w-full mb-2" />
                    <Skeleton className="h-8 w-full" />
                </div>
                <div className="col-span-1 border rounded-lg p-4">
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        </CardContent>
    </Card>
);

export default function SalesByEmployeePage() {
  return (
    <main className="container mx-auto py-6 px-4 md:px-6">
      <Breadcrumbs />

      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Sales by Employee Report
        </h1>
        <p className="text-muted-foreground mt-1">
          Generate and visualize a detailed sales report for your staff.
        </p>
      </header>

      <Suspense fallback={<ReportSkeleton />}>
        <SalesByEmployeeReport />
      </Suspense>
    </main>
  );
}