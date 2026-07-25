'use client';

/**
 * --- BBU1 SOVEREIGN MEDICAL & DIAGNOSTIC COMMAND CENTER ---
 * VERSION: v12.0 OMEGA (REAL-TIME QUEUE & CRITICAL WATCHLIST WELD)
 * JURISDICTION: Unified Multi-Tenant Cloud / Enterprise Health System
 */

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

import { 
  HeartPulse, Users, Activity, Pill, FlaskConical, 
  ShieldAlert, Clock, ShieldCheck, Zap, TrendingUp,
  Loader2, DollarSign, ArrowUpRight, CheckCircle2,
  AlertTriangle, Building2, Calendar, Stethoscope, Lock,
  ChevronRight, RefreshCw, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MedicalDashboardProps {
  tenantId: string;
}

const supabase = createClient();

export default function MedicalDashboard({ tenantId }: MedicalDashboardProps) {

  // 1. DATA: Active Profile & Currency Context
  const { data: profile } = useQuery({
    queryKey: ['active_profile_medical_dashboard', tenantId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('profiles').select('*, business_name, currency, business_id').eq('id', user?.id).limit(1).single();
      return data;
    }
  });

  const businessCurrency = profile?.currency || 'UGX';

  // 2. DATA: Real-time Master Medical Metrics
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['medical_dashboard_master_metrics', tenantId],
    queryFn: async () => {
      const todayStr = new Date().toISOString().split('T')[0];

      const [
        patientsCount,
        triagePending,
        encountersToday,
        criticalResults,
        pendingLabOrders,
        todayLabRevenue
      ] = await Promise.all([
        supabase.from('medical_patients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('medical_triage').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('medical_encounters').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('created_at', todayStr),
        supabase.from('medical_lab_results').select('*, medical_patients(full_name, patient_uid), medical_lab_orders(test_name)').eq('tenant_id', tenantId).eq('is_critical', true).order('created_at', { ascending: false }).limit(5),
        supabase.from('medical_lab_orders').select('*, medical_patients(full_name, patient_uid)').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(10),
        supabase.from('medical_lab_orders').select('total_amount, cost').eq('tenant_id', tenantId).eq('payment_status', 'paid').gte('created_at', todayStr)
      ]);

      const revenueSum = todayLabRevenue.data?.reduce((acc, curr) => acc + Number(curr.total_amount || curr.cost || 0), 0) || 0;

      return {
        totalPatients: patientsCount.count || 0,
        pendingTriage: triagePending.count || 0,
        encountersToday: encountersToday.count || 0,
        criticalAlertsCount: criticalResults.data?.length || 0,
        criticalResults: criticalResults.data || [],
        pendingLabOrders: pendingLabOrders.data || [],
        todayRevenue: revenueSum
      };
    },
    enabled: !!tenantId
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-16">
      
      {/* SECTION 1: CLINICAL KPI GRID */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        
        {/* KPI 1: PATIENTS */}
        <Card className="border-l-4 border-l-blue-600 shadow-xl rounded-3xl overflow-hidden bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50">
            <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Active Patient Registry</CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-black text-slate-900">{isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : metrics?.totalPatients}</div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Authorized Medical Records</p>
          </CardContent>
        </Card>

        {/* KPI 2: TRIAGE QUEUE */}
        <Card className="border-l-4 border-l-orange-500 shadow-xl rounded-3xl overflow-hidden bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50">
            <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Triage Waiting Room</CardTitle>
            <Activity className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-black text-orange-600">{isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : metrics?.pendingTriage}</div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Pending Consultations</p>
          </CardContent>
        </Card>

        {/* KPI 3: TODAY'S ENCOUNTERS */}
        <Card className="border-l-4 border-l-emerald-500 shadow-xl rounded-3xl overflow-hidden bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50">
            <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Clinical Encounters Today</CardTitle>
            <HeartPulse className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-black text-emerald-600">{isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : metrics?.encountersToday}</div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sealed Doctor Visits</p>
          </CardContent>
        </Card>

        {/* KPI 4: CRITICAL LAB ANOMALIES */}
        <Card className="border-l-4 border-l-rose-600 shadow-xl rounded-3xl overflow-hidden bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50">
            <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Critical Findings</CardTitle>
            <ShieldAlert className="h-5 w-5 text-rose-600 animate-bounce" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-black text-rose-600">{isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : metrics?.criticalAlertsCount}</div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Live Diagnostic Alerts</p>
          </CardContent>
        </Card>
      </div>

      {/* MAIN WORKSPACE GRID */}
      <div className="grid gap-8 lg:grid-cols-12">
        
        {/* SECTION 2: LIVE CLINICAL & DIAGNOSTIC PATIENT QUEUE (8 COLS) */}
        <Card className="lg:col-span-8 shadow-2xl border border-slate-200 rounded-[2.5rem] bg-white overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50 p-8 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-3 text-slate-900">
                <Clock className="text-blue-600" /> Live Facility Patient Queue & Requisitions
              </CardTitle>
              <CardDescription className="text-xs">Real-time diagnostic requisitions and processing status</CardDescription>
            </div>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold px-3 py-1 text-[10px] uppercase tracking-wider">
              ORCHESTRATOR LIVE
            </Badge>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="h-12">
                  <TableHead className="pl-8 font-bold text-[10px] uppercase text-slate-500">Lab #</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase text-slate-500">Patient Subject</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase text-slate-500">Diagnostic Panel</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase text-slate-500 text-center">Billing</TableHead>
                  <TableHead className="text-right pr-8 font-bold text-[10px] uppercase text-slate-500">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="h-40 text-center"><Loader2 className="animate-spin inline mr-2 text-blue-600"/> Loading Live Clinic Stream...</TableCell></TableRow>
                ) : metrics?.pendingLabOrders?.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="h-40 text-center text-xs text-slate-400 font-bold">No active requisitions in queue right now.</TableCell></TableRow>
                ) : (
                  metrics?.pendingLabOrders?.map((order: any) => (
                    <TableRow key={order.id} className="h-16 hover:bg-slate-50/50">
                      <TableCell className="pl-8 font-mono text-xs font-bold text-blue-600">
                        {order.lab_number || `LAB-${order.id.substring(0,6)}`}
                        {order.anonymous_code && <span className="block text-[9px] text-amber-600 font-mono"><Lock size={9} className="inline mr-1"/>ANON</span>}
                      </TableCell>
                      <TableCell className="font-bold text-slate-900 text-xs">
                        {order.anonymous_code ? 'CONFIDENTIAL CLIENT' : order.medical_patients?.full_name || 'Walk-in Subject'}
                      </TableCell>
                      <TableCell className="font-bold text-slate-800 text-xs">{order.test_name}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("border-none text-[9px] font-bold uppercase px-3 py-1", order.payment_status === 'paid' ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                          {order.payment_status === 'paid' ? 'PAID' : 'PENDING'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <Badge className={cn("border-none text-[9px] font-bold uppercase px-3 py-1", order.status === 'completed' ? "bg-emerald-100 text-emerald-800" : "bg-blue-50 text-blue-700")}>
                          {order.status || 'IN QUEUE'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* SECTION 3: DIAGNOSTIC REVENUE & CRITICAL WATCHLIST (4 COLS) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* REVENUE CARD */}
          <Card className="bg-slate-900 text-white shadow-2xl relative overflow-hidden rounded-[2.5rem] border-none">
            <ShieldCheck className="absolute -right-4 -top-4 w-36 h-36 text-emerald-500/10 rotate-12" />
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Diagnostic Revenue Today</CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-6 relative z-10">
              <div className="flex justify-between items-end border-b border-white/10 pb-4">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Collected Today</p>
                  <p className="text-4xl font-black text-white mt-1">{businessCurrency} {metrics?.todayRevenue?.toLocaleString()}</p>
                </div>
                <Badge className="bg-emerald-600 text-white font-bold border-none px-3 py-1 text-[10px] uppercase">100% PARITY</Badge>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-tight">
                Direct lab service fees and pharmaceutical sales are automatically posted to GL Account 4000.
              </p>
            </CardContent>
          </Card>

          {/* CRITICAL WATCHLIST CARD */}
          <Card className="shadow-xl border-t-4 border-t-rose-600 rounded-[2.5rem] bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b p-6">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center justify-between text-slate-900">
                <span className="flex items-center gap-2">
                  <ShieldAlert size={16} className="text-rose-600" /> High-Risk Critical Findings
                </span>
                <Badge className="bg-rose-50 text-rose-700 border-none font-bold text-[9px]">
                  {metrics?.criticalResults?.length || 0} ALERTS
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {metrics?.criticalResults?.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6 font-bold">No critical diagnostic alerts detected today.</p>
              ) : (
                metrics?.criticalResults?.map((res: any) => (
                  <div key={res.id} className="p-3 bg-rose-50/50 border border-rose-100 rounded-2xl space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-rose-900">{res.anonymous_code ? `ANON CODE: ${res.anonymous_code}` : res.medical_patients?.full_name}</span>
                      <span className="text-[9px] font-bold text-rose-600">{new Date(res.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-800">{res.medical_lab_orders?.test_name}: <span className="font-mono text-rose-700">{res.result_value}</span></p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
}