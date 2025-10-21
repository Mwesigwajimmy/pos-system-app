import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import LocationsManager from '@/components/management/LocationsManager';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Store & Location Management',
  description: 'Manage all business locations, assign staff, and update details.',
};

const Breadcrumbs = () => (
  <nav aria-label="breadcrumb" className="flex items-center text-sm text-muted-foreground mb-4">
    <Link href="/dashboard" className="hover:underline">
      Dashboard
    </Link>
    <ChevronRight className="h-4 w-4 mx-1" />
    <span className="font-medium text-foreground" aria-current="page">
      Locations
    </span>
  </nav>
);

const PageSkeleton = () => (
    <Card>
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <Skeleton className="h-8 w-64 mb-2" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>
        </CardHeader>
        <CardContent>
            <div className="rounded-md border p-4">
                <Skeleton className="h-8 w-full mb-4" />
                <Skeleton className="h-10 w-full mb-2" />
                <Skeleton className="h-10 w-full mb-2" />
                <Skeleton className="h-10 w-full" />
            </div>
        </CardContent>
    </Card>
);

export default function LocationsPage() {
    return (
        <main className="container mx-auto py-6 px-4 md:px-6">
            <Breadcrumbs />

            <header className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">
                    Store & Location Management
                </h1>
                <p className="text-muted-foreground mt-1">
                    Add, edit, and manage staff for all of your business locations.
                </p>
            </header>

            <Suspense fallback={<PageSkeleton />}>
                <LocationsManager />
            </Suspense>
        </main>
    );
}