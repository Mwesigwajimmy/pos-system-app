import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import AppointmentCalendar from '@/components/booking/AppointmentCalendar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Appointment Booking Calendar',
  description: 'Manage, schedule, and view all customer appointments in a professional calendar interface.',
};

const Breadcrumbs = () => (
  <nav aria-label="breadcrumb" className="flex items-center text-sm text-muted-foreground mb-4">
    <Link href="/dashboard" className="hover:underline">
      Dashboard
    </Link>
    <ChevronRight className="h-4 w-4 mx-1" />
    <span className="font-medium text-foreground" aria-current="page">
      Booking Calendar
    </span>
  </nav>
);

const PageSkeleton = () => (
    <Card>
        <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-9 w-20" />
                </div>
                <Skeleton className="h-8 w-48" />
                <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-24" />
                </div>
            </div>
            <Skeleton className="h-[700px] w-full" />
        </CardContent>
    </Card>
);


export default function BookingPage() {
    return (
        <main className="container mx-auto py-6 px-4 md:px-6">
            <Breadcrumbs />

            <header className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">
                    Appointment Calendar
                </h1>
                <p className="text-muted-foreground mt-1">
                    Click on a date to create a new appointment, or click an existing event to edit.
                </p>
            </header>

            <Suspense fallback={<PageSkeleton />}>
                <AppointmentCalendar />
            </Suspense>
        </main>
    );
}