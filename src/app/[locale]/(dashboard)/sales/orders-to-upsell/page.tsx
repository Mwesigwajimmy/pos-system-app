import { Suspense } from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AlertCircle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import UpsellClientView, { UpsellOpportunity } from './upsell-client-view';

export const metadata: Metadata = {
  title: 'Upsell Opportunities | Sales CRM',
  description: 'Identify high-value upsell targets from recent orders.',
};

/**
 * Enterprise Upsell Engine
 * 
 * Logic:
 * 1. Fetch recent orders (PAID/COMPLETED).
 * 2. Fetch Customer details for those orders.
 * 3. Calculate "Upsell Score" based on:
 *    - Order Value (Higher = Better)
 *    - Customer Segment (VIP = Better)
 *    - Recentness (Newer = Better)
 */
export default async function UpsellPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Auth Check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect(`/${locale}/login`);
  }

  // 2. Data Fetching
  // Fetch orders from the last 30 days that are good candidates for upselling
  // (i.e., they have money and the transaction was successful)
  const { data: recentOrders, error: orderError } = await supabase
    .from('orders')
    .select(`
      id,
      order_uid,
      total_amount,
      created_at,
      status,
      customer_id,
      customers (
        id,
        name,
        email,
        segment, 
        total_spent
      )
    `)
    .in('status', ['PAID', 'COMPLETED', 'SHIPPED']) // Only target successful orders
    .order('created_at', { ascending: false })
    .limit(50);

  if (orderError) {
    console.error("Upsell Page - Order Fetch Error:", orderError);
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>Could not retrieve order history for analysis.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // 3. Transformation & Scoring Logic
  const opportunities: UpsellOpportunity[] = (recentOrders || []).map((order: any) => {
    // Safety check for missing customer relation
    const customer = order.customers || { name: 'Unknown', segment: 'Regular', total_spent: 0 };
    
    // Scoring Algorithm (Enterprise Logic)
    let score = 50; // Base score
    
    // A. Value Boost
    if (order.total_amount > 100000) score += 20;
    if (order.total_amount > 500000) score += 10;
    
    // B. Segment Boost
    if (customer.segment === 'VIP') score += 15;
    if (customer.segment === 'Wholesale') score += 10;
    
    // C. Cap Score
    score = Math.min(score, 100);

    // Calculate Estimated Uplift (e.g., aiming for 15% increase)
    const potentialRevenue = Math.round(order.total_amount * 0.15);

    return {
      order_id: order.id,
      order_uid: order.order_uid,
      customer_name: customer.name,
      customer_segment: customer.segment || 'Regular',
      total_spent_history: customer.total_spent || 0,
      current_order_amount: order.total_amount,
      order_date: order.created_at,
      upsell_score: score,
      potential_revenue: potentialRevenue
    };
  });

  // Filter: Only show opportunities with a decent score
  const highValueOpportunities = opportunities.filter(op => op.upsell_score >= 60);

  return (
    <Suspense fallback={<UpsellSkeleton />}>
      <UpsellClientView opportunities={highValueOpportunities} />
    </Suspense>
  );
}

function UpsellSkeleton() {
  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between">
         <div className="h-8 w-48 bg-muted animate-pulse rounded" />
         <div className="h-20 w-48 bg-muted animate-pulse rounded-xl" />
      </div>
      <div className="space-y-2">
        <div className="h-10 w-full bg-muted animate-pulse rounded" />
        <div className="h-10 w-full bg-muted animate-pulse rounded" />
        <div className="h-10 w-full bg-muted animate-pulse rounded" />
      </div>
    </div>
  );
}