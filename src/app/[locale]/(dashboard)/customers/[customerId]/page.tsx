import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers'; // 1. Import the cookies function
import { createClient } from '@/lib/supabase/server';
import { ChevronRight, User } from 'lucide-react';

import CustomerDetailView from '@/components/customers/CustomerDetailView';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type PageProps = {
  params: { customerId: string };
};

async function getCustomerSummary(id: number) {
  // 2. Pass the cookies() store to the server client
  const supabase = createClient(cookies()); 
  const { data, error } = await supabase
    .from('customers')
    .select('id, first_name, last_name')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }
  return data;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const customerId = Number(params.customerId);
  if (isNaN(customerId)) {
    return { title: 'Invalid Customer' };
  }

  const customer = await getCustomerSummary(customerId);
  if (!customer) {
    return { title: 'Customer Not Found' };
  }

  return {
    title: `Customer: ${customer.first_name} ${customer.last_name}`,
    description: `Details, purchase history, and contact information for ${customer.first_name}.`,
  };
}

const Breadcrumbs = ({ customerName }: { customerName: string }) => (
  <nav aria-label="breadcrumb" className="flex items-center text-sm text-muted-foreground mb-4">
    <Link href="/dashboard" className="hover:underline">
      Dashboard
    </Link>
    <ChevronRight className="h-4 w-4 mx-1" />
    <Link href="/customers" className="hover:underline">
      Customers
    </Link>
    <ChevronRight className="h-4 w-4 mx-1" />
    <span className="font-medium text-foreground" aria-current="page">
      {customerName}
    </span>
  </nav>
);

const PageSkeleton = () => (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div>
                    <Skeleton className="h-7 w-48 mb-2" />
                    <Skeleton className="h-5 w-64" />
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-28" />
                <Skeleton className="h-9 w-32" />
            </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
        </div>

        <div className="grid gap-6 md:grid-cols-[250px_1fr]">
            <Card>
                <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                <CardContent>
                    <Skeleton className="h-64 w-full" />
                </CardContent>
            </Card>
        </div>
    </div>
);


export default async function CustomerDetailPage({ params }: PageProps) {
  const customerId = Number(params.customerId);

  if (isNaN(customerId)) {
    notFound();
  }

  const customer = await getCustomerSummary(customerId);
  if (!customer) {
    notFound();
  }

  const customerName = `${customer.first_name} ${customer.last_name}`;

  return (
    <main className="container mx-auto py-6 px-4 md:px-6">
      <Breadcrumbs customerName={customerName} />
      
      <Suspense fallback={<PageSkeleton />}>
        <CustomerDetailView customerId={customerId} />
      </Suspense>
    </main>
  );
}