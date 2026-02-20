"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ShoppingCart, TrendingUp, Clock, FileCheck, AlertCircle, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// --- UPGRADE: AGENTIC COMPONENT IMPORT ---
import AgenticDraftsPanel from "./AgenticDraftsPanel";
// -----------------------------------------

// ENTERPRISE TYPE DEFINITION
interface ProcurementKpi {
  label: string;
  value: string | number;
  currency?: string;
  period: string;
  icon: React.ReactNode;
  trend?: string; // Added for enterprise dashboard feel
}

interface Props {
  tenantId: string;
}

export default function ProcurementDashboard({ tenantId }: Props) {
  const [kpis, setKpis] = useState<ProcurementKpi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!tenantId) return;

    const fetchKpis = async () => {
      try {
        setLoading(true);
        
        // 1. Open Requests Count (Status: pending)
        const { count: requestCount, error: reqErr } = await supabase
          .from('procurement_requests')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('status', 'pending');

        // 2. Active Tenders Count (Status: open)
        const { count: tenderCount, error: tenErr } = await supabase
          .from('procurement_tenders')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('status', 'open');

        // 3. Total PO Spend (Status: approved)
        const { data: poData, error: poErr } = await supabase
          .from('purchase_orders')
          .select('total_amount')
          .eq('tenant_id', tenantId)
          .eq('status', 'approved');

        const totalSpend = poData?.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0) || 0;

        // 4. Real Avg Approval Time Calculation (Status: approved)
        const { data: approvalData, error: appErr } = await supabase
          .from('procurement_requests')
          .select('created_at, updated_at')
          .eq('tenant_id', tenantId)
          .eq('status', 'approved')
          .order('updated_at', { ascending: false })
          .limit(50);

        if (reqErr || tenErr || poErr || appErr) throw new Error("Backend Interconnect Failure");

        let avgDaysString = "N/A";
        if (approvalData && approvalData.length > 0) {
          const totalDurationMs = approvalData.reduce((acc, curr) => {
            const start = new Date(curr.created_at).getTime();
            const end = new Date(curr.updated_at).getTime();
            return acc + (end - start);
          }, 0);
          
          const avgMs = totalDurationMs / approvalData.length;
          const avgDays = avgMs / (1000 * 60 * 60 * 24); 
          avgDaysString = `${avgDays.toFixed(1)} Days`;
        }

        setKpis([
          { 
            label: "Open Requests", 
            value: requestCount || 0, 
            period: "Current Queue",
            icon: <ShoppingCart className="h-4 w-4 text-blue-500" />
          },
          { 
            label: "Total PO Spend", 
            value: totalSpend, 
            currency: "UGX", 
            period: "Year to Date",
            icon: <TrendingUp className="h-4 w-4 text-green-500" />
          },
          { 
            label: "Avg. Approval Time", 
            value: avgDaysString, 
            period: "Last 50 Approvals",
            icon: <Clock className="h-4 w-4 text-orange-500" />
          },
          { 
            label: "Active Tenders", 
            value: tenderCount || 0, 
            period: "Open Bidding",
            icon: <FileCheck className="h-4 w-4 text-purple-500" />
          }
        ]);
      } catch (err: any) {
        console.error("Dashboard Error:", err);
        setError("Failed to sync with procurement backend.");
      } finally {
        setLoading(false);
      }
    };

    fetchKpis();
  }, [tenantId, supabase]);

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-center gap-2 py-6 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">{error}</span>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse border-none shadow-sm">
              <CardHeader className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            </Card>
          ))}
        </div>
        <div className="h-64 w-full bg-slate-100 animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Original KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <Card key={idx} className="hover:shadow-md transition-shadow duration-200 bg-white border-slate-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                {kpi.label}
              </CardTitle>
              <div className="p-2 bg-slate-50 rounded-lg">
                {kpi.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {kpi.currency ? <span className="text-sm text-slate-400 mr-1">{kpi.currency}</span> : ""}
                {typeof kpi.value === "number" ? kpi.value.toLocaleString() : kpi.value}
              </div>
              <div className="flex items-center mt-2">
                 <p className="text-xs font-medium text-slate-400">
                  {kpi.period}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 
          UPGRADE: THE AGENTIC INTERFACE ROW
          Purpose: Directly exposes the suggestions from fn_agentic_sourcing_orchestrator
          Status: Parity v10.2 Global Protocol
      */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150">
        <AgenticDraftsPanel />
      </div>
    </div>
  );
}