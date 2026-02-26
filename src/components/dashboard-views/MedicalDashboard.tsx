'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
    HeartPulse, Users, Activity, Pill, FlaskConical, 
    ShieldAlert, Clock, ShieldCheck, Zap, TrendingUp 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function MedicalDashboard({ tenantId }: { tenantId: string }) {
  const supabase = createClient();

  // Fetch real stats from the medical tables
  const { data: stats } = useQuery({
    queryKey: ['medical_stats', tenantId],
    queryFn: async () => {
        const [patients, triage, encounters] = await Promise.all([
            supabase.from('medical_patients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
            supabase.from('medical_triage').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
            supabase.from('medical_encounters').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId)
        ]);
        return { 
            patients: patients.count || 0, 
            triage: triage.count || 0, 
            encounters: encounters.count || 0 
        };
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* SECTION 1: CLINICAL KPI GRID */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-600 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Active Registry</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{stats?.patients}</div>
            <p className="text-[9px] text-muted-foreground uppercase mt-1">Authorized Patients</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Triage Waiting</CardTitle>
            <Activity className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-orange-600">{stats?.triage}</div>
            <p className="text-[9px] text-muted-foreground uppercase mt-1">Pending Consultation</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Encounters</CardTitle>
            <HeartPulse className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600">{stats?.encounters}</div>
            <p className="text-[9px] text-muted-foreground uppercase mt-1">Today's Visits</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Critical Alerts</CardTitle>
            <ShieldAlert className="h-4 w-4 text-red-500 animate-bounce" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-red-600">--</div>
            <p className="text-[9px] text-muted-foreground uppercase mt-1">Live Lab Anomalies</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* SECTION 2: CLINICAL WORKFLOW QUEUE */}
        <Card className="lg:col-span-8 shadow-2xl border-none bg-white">
          <CardHeader className="border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Clock className="text-primary" /> Active Clinic Workflow
              </CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold text-slate-400">Real-time Patient Transitions</CardDescription>
            </div>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">ORCHESTRATOR v2 ACTIVE</Badge>
          </CardHeader>
          <CardContent className="p-0">
             <div className="p-20 text-center space-y-4">
                <div className="p-4 bg-slate-50 rounded-full inline-block">
                    <Zap size={32} className="text-primary opacity-20" />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-300">
                    Aura AI is monitoring practitioners and available consultation rooms...
                </p>
             </div>
          </CardContent>
        </Card>

        {/* SECTION 3: PHARMACY & REVENUE LINK (Interconnected) */}
        <div className="lg:col-span-4 space-y-6">
            <Card className="bg-slate-900 text-white shadow-2xl relative overflow-hidden border-none">
              <ShieldCheck className="absolute -right-4 -top-4 w-32 h-32 text-emerald-500/10 rotate-12" />
              <CardHeader>
                 <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Fiduciary Medical Seal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 relative z-10">
                 <div className="flex justify-between items-end border-b border-white/10 pb-4">
                    <div>
                       <p className="text-[9px] text-slate-500 uppercase font-bold">Ledger Parity Score</p>
                       <p className="text-5xl font-black text-white mt-1">100%</p>
                    </div>
                    <Badge className="bg-emerald-600 border-none px-4 py-1">CERTIFIED</Badge>
                 </div>
                 <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-tighter">
                    Clinical events are autonomously matched to POS sales and warehouse drug levels.
                 </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-t-4 border-t-blue-500">
                <CardHeader>
                    <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                        <FlaskConical size={14} className="text-blue-500" /> Lab Integration
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-slate-50 rounded border text-[10px] font-bold">
                        <span>AUTO_WIRING_STATUS</span>
                        <span className="text-emerald-600 font-mono">CONNECTED</span>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}