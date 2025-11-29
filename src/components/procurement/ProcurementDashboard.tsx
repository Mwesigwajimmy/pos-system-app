"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ShoppingCart, TrendingUp, Clock, FileCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ProcurementKpi {
  label: string;
  value: string | number;
  currency?: string;
  period: string;
  icon: React.ReactNode;
}

interface Props {
  tenantId: string;
}

export default function ProcurementDashboard({ tenantId }: Props) {
  const [kpis, setKpis] = useState<ProcurementKpi[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchKpis = async () => {
      // 1. Open Requests Count
      const { count: requestCount } = await supabase
        .from('procurement_requests')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'pending');

      // 2. Active Tenders Count
      const { count: tenderCount } = await supabase
        .from('procurement_tenders')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'open');

      // 3. Total PO Spend
      const { data: poData } = await supabase
        .from('purchase_orders')
        .select('total_amount')
        .eq('tenant_id', tenantId)
        .eq('status', 'approved');

      const totalSpend = poData?.reduce((acc, curr) => acc + (curr.total_amount || 0), 0) || 0;

      // 4. Real Avg Approval Time Calculation
      // Fetches the last 50 approved requests to calculate the average time between creation and approval
      const { data: approvalData } = await supabase
        .from('procurement_requests')
        .select('created_at, updated_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'approved')
        .order('updated_at', { ascending: false })
        .limit(50);

      let avgDaysString = "N/A";
      
      if (approvalData && approvalData.length > 0) {
        const totalDurationMs = approvalData.reduce((acc, curr) => {
          const start = new Date(curr.created_at).getTime();
          const end = new Date(curr.updated_at).getTime();
          return acc + (end - start);
        }, 0);
        
        const avgMs = totalDurationMs / approvalData.length;
        const avgDays = avgMs / (1000 * 60 * 60 * 24); // Convert ms to days
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
          period: "YTD",
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
      setLoading(false);
    };

    fetchKpis();
  }, [tenantId, supabase]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-24 bg-gray-100 dark:bg-gray-800 rounded-t-xl" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, idx) => (
        <Card key={idx}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {kpi.label}
            </CardTitle>
            {kpi.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpi.currency ? `${kpi.currency} ` : ""}
              {typeof kpi.value === "number" ? kpi.value.toLocaleString() : kpi.value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpi.period}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}