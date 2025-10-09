import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import TaxManager from '@/components/finance/TaxManager';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Tax Management',
  description: 'Create and manage tax profiles and rates for your products and services.',
};

const Breadcrumbs = () => (
  <nav aria-label="breadcrumb" className="flex items-center text-sm text-muted-foreground mb-4">
    <Link href="/dashboard" className="hover:underline">
      Dashboard
    </Link>
    <ChevronRight className="h-4 w-4 mx-1" />
    <Link href="/finance" className="hover:underline">
      Finance
    </Link>
    <ChevronRight className="h-4 w-4 mx-1" />
    <span className="font-medium text-foreground" aria-current="page">
      Tax Management
    </span>
  </nav>
);

const PageSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-8 w-8" />
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </CardContent>
        </Card>
        <div>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <Skeleton className="h-7 w-48 mb-2" />
                            <Skeleton className="h-4 w-64" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-9 w-24" />
                            <Skeleton className="h-9 w-24" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-48 w-full" />
                </CardContent>
            </Card>
        </div>
    </div>
);


export default function TaxesPage() {
    return (
        <main className="container mx-auto py-6 px-4 md:px-6">
            <Breadcrumbs />

            <header className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">
                    Global & Local Tax Management
                </h1>
                <p className="text-muted-foreground mt-1">
                    Create tax profiles and rates to be applied at the Point of Sale.
                </p>
            </header>

            <Suspense fallback={<PageSkeleton />}>
                <TaxManager />
            </Suspense>
        </main>
    );
}