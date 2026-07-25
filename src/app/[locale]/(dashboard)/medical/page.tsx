import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import { 
    Activity, Users, Zap, HeartPulse, ShieldAlert, 
    Clock, CheckCircle2, ChevronRight, Lock, DollarSign,
    FlaskConical, Stethoscope, Pill, ArrowUpRight, ShieldCheck,
    Building2, Calendar, FileText, ClipboardList
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export default async function MedicalHubPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. Authentication Guard
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');

    // 2. Master Profile & Tenant Identity Resolution
    const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id, business_id, business_name, currency")
        .eq("id", user.id)
        .single();

    const tenantId = profile?.tenant_id || profile?.business_id;
    if (!tenantId) redirect('/login');

    const businessCurrency = profile?.currency || 'UGX';
    const today = new Date().toISOString().split('T')[0];

    // 3. PARALLEL REAL-TIME DATA FETCHING
    const [patients, encounters, triage, criticalAlerts, activeQueue, todayRevenue] = await Promise.all([
        supabase.from('medical_patients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('medical_encounters').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('created_at', today),
        supabase.from('medical_triage').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('created_at', today),
        supabase.from('medical_lab_results').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('is_critical', true).gte('created_at', today),
        supabase.from('medical_lab_orders').select('*, medical_patients(full_name, patient_uid)').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(10),
        supabase.from('medical_lab_orders').select('total_amount, cost').eq('tenant_id', tenantId).eq('payment_status', 'paid').gte('created_at', today)
    ]);

    const revenueSum = todayRevenue.data?.reduce((acc, curr) => acc + Number(curr.total_amount || curr.cost || 0), 0) || 0;

    return (
        <div className="flex-1 space-y-8 p-8 pt-6 animate-in fade-in duration-700 pb-20">
            
            {/* --- PAGE HEADER --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tight uppercase flex items-center gap-3 text-slate-900">
                        <HeartPulse className="text-rose-600 h-8 w-8" />
                        Clinical Command Center
                    </h1>
                    <p className="text-slate-500 text-xs font-mono uppercase tracking-widest flex items-center gap-2">
                        <Building2 size={12} className="text-blue-600" />
                        Autonomous Healthcare Guard // <span className="font-bold text-slate-900">{profile?.business_name || 'Primary Facility Node'}</span>
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" className="h-11 px-5 font-bold rounded-xl border-slate-200 text-slate-700" asChild>
                        <Link href="/medical/reports">
                            <FileText size={16} className="mr-2 text-blue-600" /> Medical Reports
                        </Link>
                    </Button>

                    <Button className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200" asChild>
                        <Link href="/medical/encounters">
                            <Stethoscope size={18} className="mr-2" /> New Consultation
                        </Link>
                    </Button>
                </div>
            </div>

            {/* --- SECTION 1: CLINICAL KPI GRID --- */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                
                {/* TOTAL REGISTRY */}
                <Card className="border-l-4 border-l-blue-600 shadow-xl rounded-3xl overflow-hidden bg-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50">
                        <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Total Registry</CardTitle>
                        <Users className="h-4 w-4 text-blue-600"/>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="text-3xl font-black text-slate-900">{patients.count || 0}</div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Registered Patients</p>
                    </CardContent>
                </Card>

                {/* TODAY'S VISITS */}
                <Card className="border-l-4 border-l-emerald-500 shadow-xl rounded-3xl overflow-hidden bg-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50">
                        <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Today's Visits</CardTitle>
                        <Activity className="h-4 w-4 text-emerald-500"/>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="text-3xl font-black text-emerald-600">{encounters.count || 0}</div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Active Doctor Encounters</p>
                    </CardContent>
                </Card>

                {/* IN TRIAGE */}
                <Card className="border-l-4 border-l-orange-500 shadow-xl rounded-3xl overflow-hidden bg-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50">
                        <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">In Triage</CardTitle>
                        <Zap className="h-4 w-4 text-orange-500"/>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="text-3xl font-black text-orange-600">{triage.count || 0}</div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Awaiting Consultation</p>
                    </CardContent>
                </Card>

                {/* CRITICAL FINDINGS */}
                <Card className="border-l-4 border-l-rose-600 shadow-xl rounded-3xl overflow-hidden bg-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50">
                        <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Critical Alerts</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-rose-600 animate-bounce"/>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="text-3xl font-black text-rose-600">{criticalAlerts.count || 0}</div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Live Diagnostic Anomalies</p>
                    </CardContent>
                </Card>
            </div>

            {/* --- SECTION 2: CLINICAL WORKSPACE GRID --- */}
            <div className="grid gap-8 lg:grid-cols-12">
                
                {/* LEFT COLUMN: LIVE DOCTOR'S & LABORATORY PATIENT QUEUE (8 COLS) */}
                <Card className="lg:col-span-8 shadow-2xl border border-slate-200 rounded-[2.5rem] bg-white overflow-hidden">
                    <CardHeader className="border-b bg-slate-50/50 p-8 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-3 text-slate-900">
                                <Clock className="text-blue-600" /> Live Doctor's & Diagnostic Requisition Queue
                            </CardTitle>
                            <CardDescription className="text-xs font-medium text-slate-500">Real-time patient transitions, lab orders, and billing states</CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold px-3 py-1 text-[10px] uppercase tracking-wider">
                            CLINICAL ORCHESTRATOR LIVE
                        </Badge>
                    </CardHeader>

                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow className="h-12">
                                    <TableHead className="pl-8 font-bold text-[10px] uppercase text-slate-500">Lab Requisition #</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase text-slate-500">Patient Identity</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase text-slate-500">Department & Test</TableHead>
                                    <TableHead className="text-center font-bold text-[10px] uppercase text-slate-500">Billing</TableHead>
                                    <TableHead className="text-right pr-8 font-bold text-[10px] uppercase text-slate-500">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {activeQueue.data?.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="h-48 text-center text-xs text-slate-400 font-bold">No active clinical requisitions in queue right now.</TableCell></TableRow>
                                ) : (
                                    activeQueue.data?.map((order: any) => (
                                        <TableRow key={order.id} className="h-16 hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="pl-8 font-mono text-xs font-bold text-blue-600">
                                                {order.lab_number || `LAB-${order.id.substring(0,6)}`}
                                                {order.anonymous_code && <span className="block text-[9px] text-amber-600 font-mono"><Lock size={9} className="inline mr-1"/>ANON CODE</span>}
                                            </TableCell>
                                            <TableCell className="font-bold text-slate-900 text-xs">
                                                {order.anonymous_code ? 'CONFIDENTIAL CLIENT' : order.medical_patients?.full_name || 'Walk-in Subject'}
                                            </TableCell>
                                            <TableCell>
                                                <p className="font-bold text-slate-800 text-xs">{order.test_name}</p>
                                                <span className="text-[9px] font-bold text-blue-500">{order.department_name || 'General Diagnostics'}</span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                                    order.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                                }`}>
                                                    {order.payment_status === 'paid' ? 'PAID' : 'PENDING'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right pr-8">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                                    order.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-50 text-blue-700'
                                                }`}>
                                                    {order.status || 'IN QUEUE'}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* RIGHT COLUMN: REVENUE & SYSTEM MODULE NAVIGATION (4 COLS) */}
                <div className="lg:col-span-4 space-y-6">
                    
                    {/* DIAGNOSTIC REVENUE CARD */}
                    <Card className="bg-slate-900 text-white shadow-2xl relative overflow-hidden rounded-[2.5rem] border-none">
                        <ShieldCheck className="absolute -right-4 -top-4 w-36 h-36 text-emerald-500/10 rotate-12" />
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Diagnostic Revenue Today</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-0 space-y-6 relative z-10">
                            <div className="flex justify-between items-end border-b border-white/10 pb-4">
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Collected Today</p>
                                    <p className="text-4xl font-black text-white mt-1">{businessCurrency} {revenueSum.toLocaleString()}</p>
                                </div>
                                <Badge className="bg-emerald-600 text-white font-bold border-none px-3 py-1 text-[10px] uppercase">GL 4000 LINK</Badge>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-tight">
                                Medical fees and diagnostic test receipts post double-entry posts directly to your General Ledger.
                            </p>
                        </CardContent>
                    </Card>

                    {/* MODULE QUICK COMMAND HUB */}
                    <Card className="shadow-xl border border-slate-200 rounded-[2.5rem] bg-white overflow-hidden p-6 space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Medical Command Direct Links</h4>
                        
                        <Link href="/medical/patients" className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-blue-50/50 rounded-2xl border border-slate-100 transition-all group">
                            <div className="flex items-center gap-3">
                                <Users size={18} className="text-blue-600" />
                                <span className="font-bold text-xs text-slate-900">Patient 360 Registry</span>
                            </div>
                            <ChevronRight size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                        </Link>

                        <Link href="/medical/lab-results" className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-blue-50/50 rounded-2xl border border-slate-100 transition-all group">
                            <div className="flex items-center gap-3">
                                <FlaskConical size={18} className="text-emerald-600" />
                                <span className="font-bold text-xs text-slate-900">Laboratory Results Hub</span>
                            </div>
                            <ChevronRight size={16} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
                        </Link>

                        <Link href="/medical/prescriptions" className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-blue-50/50 rounded-2xl border border-slate-100 transition-all group">
                            <div className="flex items-center gap-3">
                                <Pill size={18} className="text-purple-600" />
                                <span className="font-bold text-xs text-slate-900">Robotic Dispensary</span>
                            </div>
                            <ChevronRight size={16} className="text-slate-400 group-hover:text-purple-600 transition-colors" />
                        </Link>

                        <Link href="/medical/vitals" className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-blue-50/50 rounded-2xl border border-slate-100 transition-all group">
                            <div className="flex items-center gap-3">
                                <Activity size={18} className="text-orange-500" />
                                <span className="font-bold text-xs text-slate-900">Vitals & Triage Portal</span>
                            </div>
                            <ChevronRight size={16} className="text-slate-400 group-hover:text-orange-500 transition-colors" />
                        </Link>
                    </Card>

                </div>

            </div>
        </div>
    );
}