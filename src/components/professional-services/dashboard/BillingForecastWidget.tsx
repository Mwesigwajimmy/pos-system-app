'use client';

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Loader2, TrendingUp, DollarSign, CalendarClock, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface TenantContext {
  tenantId: string;
  currency: string;
}

interface BillingForecast {
  billable_next_month: number;
  recurring_monthly: number;
  last_updated: string;
}

// Enterprise-grade fetcher using Supabase directly (Matching KYCAMLChecklist pattern)
async function fetchBillingForecast(tenantId: string): Promise<BillingForecast | null> {
  const db = createClient();
  
  // We use .maybeSingle() instead of .single() to handle cases where no row exists yet without throwing 406
  const { data, error } = await db
    .from("billing_forecasts") // Assumes a view or table exists for cached metrics
    .select("billable_next_month, recurring_monthly, last_updated")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) {
    console.error("Supabase Error:", error);
    throw new Error(error.message);
  }

  // If no data exists yet, return a safe default object (prevents undefined errors)
  if (!data) {
    return {
      billable_next_month: 0,
      recurring_monthly: 0,
      last_updated: new Date().toISOString()
    };
  }

  return data as BillingForecast;
}

export default function BillingForecastWidget({ tenant }: { tenant: TenantContext }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["bill-forecast", tenant.tenantId],
    queryFn: () => fetchBillingForecast(tenant.tenantId),
    retry: 1
  });

  // Helper for consistent currency formatting
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: tenant.currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="h-full border-t-4 border-t-emerald-600 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-600" /> 
          Revenue Forecast
        </CardTitle>
        <CardDescription>Projected earnings based on active contracts.</CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-32 space-y-2 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <span className="text-xs">Calculating projections...</span>
          </div>
        ) : isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <span>{error?.message || "Could not retrieve forecast data."}</span>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="w-fit h-7 text-xs">
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 gap-6 pt-2">
            
            {/* Billable Next Month */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-full border shadow-sm">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Billable Next Month</span>
                  {/* FIX: Safe access using optional chaining and coalescing */}
                  <span className="text-xl font-bold text-slate-900">
                    {formatMoney(data?.billable_next_month ?? 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Recurring Monthly */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-full border shadow-sm">
                  <CalendarClock className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Recurring Monthly</span>
                  {/* FIX: Safe access using optional chaining and coalescing */}
                  <span className="text-xl font-bold text-slate-900">
                    {formatMoney(data?.recurring_monthly ?? 0)}
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}
      </CardContent>
    </Card>
  );
}