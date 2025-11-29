import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers"; // <--- 1. Import cookies
import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { FileText, Clock, TrendingUp, AlertCircle, Plus } from "lucide-react";

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function InvoicingDashboardPage({ params: { locale } }: PageProps) {
  // 2. Get the cookie store
  const cookieStore = cookies();

  // 3. Initialize Supabase with cookies (Fixes the "Expected 1 argument" error)
  const supabase = createClient(cookieStore);

  // 4. Auth & Tenant Check
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    redirect(`/${locale}/auth/login`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const tenantId = profile?.organization_id;
  
  if (!tenantId) {
    return (
      <div className="p-6 m-4 text-red-700 bg-red-50 border border-red-200 rounded-lg">
        <strong>Access Denied:</strong> User is not assigned to an organization.
      </div>
    );
  }

  // 5. Fetch Real Dashboard Stats (Parallel requests for speed)
  const [invoicesRes, draftRes, revenueRes] = await Promise.all([
    supabase.from("invoices").select("id", { count: 'exact' }).eq("tenant_id", tenantId),
    supabase.from("invoices").select("id", { count: 'exact' }).eq("tenant_id", tenantId).in("status", ["DRAFT", "PENDING_APPROVAL"]),
    supabase.from("deferred_revenue").select("id", { count: 'exact' }).eq("tenant_id", tenantId)
  ]);

  const totalInvoices = invoicesRes.count || 0;
  const pendingInvoices = draftRes.count || 0;
  const deferredCount = revenueRes.count || 0;

  return (
    <div className="container mx-auto py-8 max-w-7xl px-4 space-y-8">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Invoicing Overview</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Real-time insights into your revenue and billing operations.
          </p>
        </div>
        <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 shadow-md">
          <Link href={`/${locale}/invoicing/create`}>
            <Plus className="mr-2 h-5 w-5" /> New Invoice
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Total Invoices */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Invoices Issued</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <FileText className="text-blue-500" />
              {totalInvoices}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All time records</p>
          </CardContent>
          <div className="px-6 pb-4">
             <Link href={`/${locale}/invoicing/invoices`} className="text-sm text-blue-600 hover:underline">View All &rarr;</Link>
          </div>
        </Card>

        {/* Card 2: Action Items */}
        <Card className="border-orange-200 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-900/10 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">Needs Attention</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <AlertCircle />
              {pendingInvoices}
            </div>
            <p className="text-xs text-orange-600/80 mt-1">Drafts & Pending Approval</p>
          </CardContent>
          <div className="px-6 pb-4">
             <Link href={`/${locale}/invoicing/to-be-issued`} className="text-sm text-orange-600 hover:underline">Process Now &rarr;</Link>
          </div>
        </Card>

        {/* Card 3: Deferred Revenue */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Clock className="text-purple-500" />
              {deferredCount}
            </div>
             <p className="text-xs text-muted-foreground mt-1">Deferred Revenue Items</p>
          </CardContent>
          <div className="px-6 pb-4">
             <Link href={`/${locale}/invoicing/deferred-revenue`} className="text-sm text-purple-600 hover:underline">View Schedule &rarr;</Link>
          </div>
        </Card>

        {/* Card 4: Quick Links */}
        <Card className="hover:shadow-md transition-shadow">
           <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Management</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-2">
            <Link href={`/${locale}/invoicing/credit-notes`} className="text-sm flex items-center gap-2 hover:text-blue-600 transition">
              <TrendingUp size={16} className="text-gray-400" /> Credit Notes
            </Link>
            <Link href={`/${locale}/invoicing/debit-notes`} className="text-sm flex items-center gap-2 hover:text-blue-600 transition">
              <TrendingUp size={16} className="text-gray-400" /> Debit Notes
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Bar */}
      <div className="pt-6 border-t dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          <Button asChild variant="secondary">
            <Link href={`/${locale}/invoicing/to-be-issued`}>Batch Issue Invoices</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/${locale}/invoicing/deferred-expenses`}>Record Expense</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/${locale}/invoicing/credit-notes`}>Issue Refund</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}