// src/app/(dashboard)/inventory/transfers/new/page.tsx
import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import StockTransfer from '@/components/inventory/StockTransfer';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';

export const metadata: Metadata = {
  title: 'New Stock Transfer',
  description: 'Create a new stock transfer to move inventory between locations.',
};

const Breadcrumbs = () => (
  <nav aria-label="breadcrumb" className="flex items-center text-sm text-muted-foreground mb-4">
    <Link href="/dashboard" className="hover:underline">
      Dashboard
    </Link>
    <ChevronRight className="h-4 w-4 mx-1" />
    <Link href="/inventory" className="hover:underline">
      Inventory
    </Link>
    <ChevronRight className="h-4 w-4 mx-1" />
    <span className="font-medium text-foreground" aria-current="page">
      New Stock Transfer
    </span>
  </nav>
);

const PageSkeleton = () => (
    <Card>
        <CardHeader>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>From (Source)</Label><Skeleton className="h-10 w-full" /></div>
                <div className="space-y-2"><Label>To (Destination)</Label><Skeleton className="h-10 w-full" /></div>
            </div>
            <div className="space-y-4 border-t pt-6">
                <div className="space-y-2"><Label>Add Products to Transfer</Label>
                    <div className="flex gap-2">
                        <Skeleton className="h-10 flex-1" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                </div>
                <Skeleton className="h-40 w-full" />
            </div>
            <div className="flex justify-end mt-6">
                <Skeleton className="h-12 w-48" />
            </div>
        </CardContent>
    </Card>
);


export default function NewStockTransferPage() {
    return (
        <main className="container mx-auto py-6 px-4 md:px-6">
            <Breadcrumbs />

            <header className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">
                    New Stock Transfer
                </h1>
                <p className="text-muted-foreground mt-1">
                    Select a source and destination to begin moving inventory.
                </p>
            </header>

            <Suspense fallback={<PageSkeleton />}>
                <StockTransfer />
            </Suspense>
        </main>
    );
}