'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// --- DEFINING TYPES HERE TO SAVE FILES ---
export interface JobTypeCount {
  type: string;
  count: number;
}

export interface KPIAnalyticsData {
  slaMet: number;
  firstTimeFixRate: number;
  averageTimeToClose: number;
  onTimeArrivals: number;
  cancelRate: number;
  jobsByType: JobTypeCount[];
  travelVsLabor: number;
}

// --- SERVER ACTION ---
export async function fetchKPIData(tenantId: string): Promise<KPIAnalyticsData> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    // Enterprise Grade: Select only needed columns for performance
    const { data: orders, error } = await supabase
      .from('work_orders')
      .select(`
        id,
        status,
        job_type,
        sla_met,
        is_first_time_fix,
        created_at,
        completed_at,
        scheduled_start_time,
        actual_arrival_time,
        travel_duration_minutes,
        labor_duration_minutes
      `)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Supabase Data Fetch Error:', error);
      throw new Error(error.message);
    }

    if (!orders || orders.length === 0) {
      return getZeroState();
    }

    const totalOrders = orders.length;

    // 1. Calculate SLA Met
    const slaMetCount = orders.filter((o) => o.sla_met === true).length;

    // 2. Calculate First Time Fix
    const ftfCount = orders.filter((o) => o.is_first_time_fix === true).length;

    // 3. Calculate Cancel Rate
    const canceledCount = orders.filter((o) => 
      o.status === 'CANCELED' || o.status === 'CANCELLED'
    ).length;

    // 4. Calculate On-Time Arrival
    const onTimeCount = orders.filter((o) => {
      if (!o.scheduled_start_time || !o.actual_arrival_time) return false;
      return new Date(o.actual_arrival_time) <= new Date(o.scheduled_start_time);
    }).length;

    // 5. Calculate Average Time To Close (Hours)
    let totalCloseTimeHours = 0;
    let completedCount = 0;
    orders.forEach((o) => {
      if (o.status === 'COMPLETED' && o.completed_at && o.created_at) {
        const start = new Date(o.created_at).getTime();
        const end = new Date(o.completed_at).getTime();
        totalCloseTimeHours += (end - start) / (1000 * 60 * 60);
        completedCount++;
      }
    });

    // 6. Travel vs Labor
    let totalTravel = 0;
    let totalLabor = 0;
    orders.forEach((o) => {
      totalTravel += o.travel_duration_minutes || 0;
      totalLabor += o.labor_duration_minutes || 0;
    });

    // 7. Jobs By Type
    const typeMap: Record<string, number> = {};
    orders.forEach((o) => {
      const type = o.job_type || 'Unclassified';
      typeMap[type] = (typeMap[type] || 0) + 1;
    });
    
    const jobsByType = Object.entries(typeMap).map(([type, count]) => ({ 
      type, 
      count 
    }));

    return {
      slaMet: (slaMetCount / totalOrders) * 100,
      firstTimeFixRate: (ftfCount / totalOrders) * 100,
      averageTimeToClose: completedCount > 0 ? totalCloseTimeHours / completedCount : 0,
      onTimeArrivals: (onTimeCount / totalOrders) * 100,
      cancelRate: (canceledCount / totalOrders) * 100,
      jobsByType,
      travelVsLabor: totalLabor > 0 ? Number((totalTravel / totalLabor).toFixed(2)) : 0
    };

  } catch (err) {
    console.error('Analytics Action Exception:', err);
    // Return safe zero state so UI doesn't crash
    return getZeroState();
  }
}

function getZeroState(): KPIAnalyticsData {
  return {
    slaMet: 0,
    firstTimeFixRate: 0,
    averageTimeToClose: 0,
    onTimeArrivals: 0,
    cancelRate: 0,
    jobsByType: [],
    travelVsLabor: 0
  };
}