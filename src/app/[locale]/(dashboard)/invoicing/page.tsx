import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { FileText, Clock, TrendingUp, AlertCircle, Plus, ShieldAlert } from "lucide-react";

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function InvoicingDashboardPage({ params: { locale } }: PageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Auth Check
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect(`/${locale}/auth/login`);

  // 2. Secure Tenant Context (Fixed: 'business_id')
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();

  const tenantId = profile?.business_id;
  
  if (!tenantId) {
    return (
        <div className="p-8 text-center text-red-600 bg-red-50 border border-red-200 rounded-lg m-4">
            <ShieldAlert className="mx-auto h-8 w-8 mb-2" />
            <strong>Access Denied:</strong> User is not assigned to an organization.
        </div>
    );
  }

  // 3. Fetch Real Stats
  const [invoicesRes, draftRes, revenueRes] = await Promise.all([
    supabase.from("invoices").select("id", { count: 'exact', head: true }).eq("tenant_id", tenantId),
    supabase.from("invoices").select("id", { count: 'exact', head: true }).eq("tenant_id", tenantId).eq("status", "draft"),
    supabase.from("deferred_revenue").select("id", { count: 'exact', head: true }).eq("tenant_id", tenantId)
  ]);

  const totalInvoices = invoicesRes.count || 0;
  const pendingInvoices = draftRes.count || 0;
  const deferredCount = revenueRes.count || 0;

  return (
    <div className="container mx-auto py-8 max-w-7xl px-4 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Invoicing Overview</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Real-time insights into your revenue and billing operations.
          </p>
        </div>
        <Button asChild size="lg" className="bg-primary hover:bg-primary/90 shadow-md">
          <Link href={`/${locale}/invoicing/create`}>
            <Plus className="mr-2 h-5 w-5" /> New Invoice
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Invoices */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Invoices Issued</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <FileText className="text-blue-500 h-5 w-5" />
              {totalInvoices}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All time records</p>
          </CardContent>
          <div className="px-6 pb-4 border-t pt-2">
             <Link href={`/invoicing/list`} className="text-xs font-medium text-primary hover:underline">View Registry &rarr;</Link>
          </div>
        </Card>

        {/* Action Items */}
        <Card className="border-orange-200 bg-orange-50/30 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">Needs Attention</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold flex items-center gap-2 text-orange-700">
              <AlertCircle className="h-5 w-5" />
              {pendingInvoices}
            </div>
            <p className="text-xs text-orange-600/80 mt-1">Drafts & Pending</p>
          </CardContent>
          <div className="px-6 pb-4 border-t border-orange-100 pt-2">
             <Link href={`/invoicing/to-be-issued`} className="text-xs font-medium text-orange-700 hover:underline">Process Now &rarr;</Link>
          </div>
        </Card>

        {/* Deferred Revenue */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Clock className="text-purple-500 h-5 w-5" />
              {deferredCount}
            </div>
             <p className="text-xs text-muted-foreground mt-1">Deferred Items</p>
          </CardContent>
          <div className="px-6 pb-4 border-t pt-2">
             <Link href={`/invoicing/deferred-revenue`} className="text-xs font-medium text-primary hover:underline">View Schedule &rarr;</Link>
          </div>
        </Card>

        {/* Quick Links */}
        <Card className="hover:shadow-md transition-shadow">
           <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Management</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-2">
            <Link href={`/invoicing/credit-notes`} className="text-sm flex items-center gap-2 hover:text-blue-600 transition">
              <TrendingUp size={16} className="text-gray-400" /> Credit Notes
            </Link>
            <Link href={`/invoicing/debit-notes`} className="text-sm flex items-center gap-2 hover:text-blue-600 transition">
              <TrendingUp size={16} className="text-gray-400" /> Debit Notes
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}