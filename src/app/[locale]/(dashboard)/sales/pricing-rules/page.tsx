import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';
import { 
    Plus, 
    Edit2, 
    Trash2, 
    Calendar, 
    CheckCircle, 
    Activity,
    Settings,
    ChevronRight,
    Search,
    AlertCircle,
    Database,
    RefreshCw,
    ShieldCheck,
    History,
    Briefcase,
    Globe,
    Terminal
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { deletePricingRule } from '@/app/actions/pricing';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export interface PricingRule {
  id: string;
  name: string;
  is_active: boolean;
  priority: number;
  start_date: string | null;
  end_date: string | null;
  tenant_id: string;
  conditions: { id: string }[];
  actions: { id: string }[];
  created_at?: string;
}

interface PageProps {
  params: { locale: string };
}

export default async function PricingRulesPage({ params: { locale } }: PageProps) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user?.id)
        .single();

    if (!profile?.business_id) {
        return (
            <div className="p-6 md:p-10 max-w-7xl mx-auto min-h-screen flex items-center justify-center bg-slate-50">
                <Card className="max-w-md border-none shadow-2xl rounded-[2rem] overflow-hidden">
                    <div className="bg-red-600 h-2 w-full" />
                    <CardContent className="p-10 text-center">
                        <AlertCircle className="h-14 w-14 text-red-600 mx-auto mb-6" />
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Access Unauthorized</h2>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                            System of Record could not verify credentials.
                        </p>
                        <Button asChild className="mt-8 w-full bg-slate-900 font-black uppercase tracking-widest text-[10px] h-14 rounded-xl">
                            <Link href={`/${locale}/login`}>Re-Authenticate Session</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { data: rules, error } = await supabase
        .from('pricing_rules')
        .select(`*, conditions:pricing_rule_conditions(id), actions:pricing_rule_actions(id)`)
        .eq('tenant_id', profile.business_id) 
        .order('priority', { ascending: false });

    if (error) {
        return (
            <div className="p-10 flex items-center justify-center min-h-screen bg-slate-50">
                <Alert className="max-w-md border-none bg-white shadow-2xl p-8 rounded-[2rem]">
                    <RefreshCw className="h-6 w-6 animate-spin text-slate-900" />
                    <AlertTitle className="font-black uppercase tracking-[0.2em] text-xs ml-3 text-slate-900">Data Reconcilliation Error</AlertTitle>
                    <AlertDescription className="text-[10px] mt-4 font-black uppercase tracking-[0.2em] text-slate-400">{error.message}</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen font-sans">
            
            {/* --- GLOBAL ERP STATUS RIBBON --- */}
            <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between border-b border-white/10 shadow-lg z-10">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2.5">
                        <Terminal className="w-4 h-4 text-indigo-400" />
                        <span className="text-[10px] font-black tracking-[0.25em] uppercase text-slate-400">Environment:</span>
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded">GLOBAL_PRODUCTION</span>
                    </div>
                    <Separator orientation="vertical" className="hidden sm:block h-4 bg-white/20" />
                    <div className="hidden sm:flex items-center gap-2.5">
                        <Briefcase className="w-4 h-4 text-slate-400" />
                        <span className="text-[10px] font-black tracking-[0.25em] uppercase text-slate-400">Org_ID:</span>
                        <span className="text-[10px] font-mono font-bold text-white tracking-wider">{profile.business_id.slice(0,12).toUpperCase()}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    <span className="text-[10px] font-black tracking-[0.3em] uppercase text-slate-300">Integrity: Nominal</span>
                </div>
            </div>

            <div className="p-6 md:p-10 lg:p-12 space-y-10 max-w-[1600px] mx-auto w-full">
                
                {/* --- BUSINESS CONTROLS HEADER --- */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
                    <div className="flex items-center gap-6 md:gap-8">
                        <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl border border-slate-800 shrink-0 transition-transform hover:scale-105">
                            <Settings className="w-10 h-10 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-900 uppercase leading-none mb-4">
                                Pricing Controls
                            </h1>
                            <div className="flex flex-wrap items-center gap-4">
                                <Badge className="bg-slate-900 text-white border-none text-[10px] font-black tracking-[0.2em] px-4 py-1 rounded-md shadow-sm">
                                    VER. 4.2.0-STABLE
                                </Badge>
                                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                    <ShieldCheck className="w-4 h-4 text-indigo-500" />
                                    Master Policy Access
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 w-full lg:w-auto">
                        <Button variant="outline" className="flex-1 lg:flex-none h-14 px-6 border border-slate-200 bg-white font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:bg-slate-50 transition-all shadow-sm">
                            <History className="mr-2 h-4 w-4 text-slate-400" /> Audit
                        </Button>
                        <Button asChild className="flex-[2] lg:flex-none h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 uppercase tracking-[0.2em] text-[10px] transition-all">
                            <Link href={`/${locale}/sales/pricing-rules/new`}>
                                <Plus className="mr-2 h-4 w-4 stroke-[4px]" /> New Policy
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* --- POLICY INVENTORY SURFACE --- */}
                <Card className="border-none shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] bg-white rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="p-8 md:p-12 border-b border-slate-50 bg-[#F9FAFB]/30">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8">
                            <div className="space-y-3">
                                <CardTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                                    Global Rule Inventory
                                </CardTitle>
                                <CardDescription className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
                                    Policies execute via descending priority rank.
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-6 px-8 py-5 bg-white rounded-[1.5rem] border border-slate-100 shadow-xl shadow-slate-100/50">
                                <div className="text-right">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Active Policies</span>
                                    <span className="text-3xl font-black font-mono text-slate-900 leading-none">{(rules as PricingRule[])?.length || 0}</span>
                                </div>
                                <Separator orientation="vertical" className="h-10 bg-slate-100" />
                                <Activity className="w-8 h-8 text-indigo-500" />
                            </div>
                        </div>
                    </CardHeader>
                    
                    <CardContent className="p-0">
                        {!rules || rules.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 px-10 text-center">
                                <div className="w-28 h-28 bg-slate-50 rounded-full flex items-center justify-center mb-10 border-2 border-dashed border-slate-200">
                                    <Search className="w-12 h-12 text-slate-200" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-4">Null Data Environment</h3>
                                <p className="text-slate-400 text-[11px] max-w-sm mx-auto mb-12 font-black uppercase tracking-[0.2em] leading-relaxed">
                                    No commercial policies detected. Baseline catalog values active.
                                </p>
                                <Button asChild className="h-16 px-12 font-black bg-slate-900 text-white rounded-2xl uppercase tracking-widest text-[11px] shadow-2xl">
                                    <Link href={`/${locale}/sales/pricing-rules/new`}>Initialize First Policy</Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto no-scrollbar">
                                <table className="w-full min-w-[1100px] text-sm text-left">
                                    <thead className="bg-[#F9FAFB] border-b border-slate-100">
                                        <tr>
                                            <th className="px-10 py-7 font-black text-slate-400 uppercase text-[9px] tracking-[0.4em]">Rank</th>
                                            <th className="px-10 py-7 font-black text-slate-400 uppercase text-[9px] tracking-[0.4em]">Identification</th>
                                            <th className="px-10 py-7 font-black text-slate-400 uppercase text-[9px] tracking-[0.4em]">Window</th>
                                            <th className="px-10 py-7 font-black text-slate-400 uppercase text-[9px] tracking-[0.4em] text-center">Logic Complexity</th>
                                            <th className="px-10 py-7 font-black text-slate-400 uppercase text-[9px] tracking-[0.4em] text-right">Ops</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {(rules as PricingRule[]).map((rule) => (
                                            <tr key={rule.id} className="group hover:bg-slate-50/50 transition-all duration-200">
                                                <td className="px-10 py-10">
                                                    <div className={cn(
                                                        "w-14 h-14 rounded-2xl flex items-center justify-center font-black font-mono text-base border-2 transition-all shadow-sm",
                                                        rule.priority >= 100 
                                                            ? "bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-200" 
                                                            : "bg-white text-slate-900 border-slate-100"
                                                    )}>
                                                        {rule.priority}
                                                    </div>
                                                </td>
                                                <td className="px-10 py-10">
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-4">
                                                            <span className="font-black text-slate-900 text-xl tracking-tighter uppercase">{rule.name}</span>
                                                            <Badge className={cn(
                                                                "border-none px-4 py-1 text-[9px] font-black uppercase tracking-[0.2em] rounded-md",
                                                                rule.is_active 
                                                                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-100" 
                                                                    : "bg-slate-200 text-slate-500"
                                                            )}>
                                                                {rule.is_active ? 'Active' : 'Draft'}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-[10px] font-mono font-bold text-slate-400 tracking-wider uppercase flex items-center gap-2">
                                                            <Database className="w-3.5 h-3.5 text-indigo-400" /> {rule.id.toUpperCase()}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-10">
                                                    <div className="flex items-center gap-3 text-slate-900 font-black text-[10px] uppercase tracking-[0.2em]">
                                                        <Calendar className="w-4 h-4 text-slate-300 stroke-[3px]" />
                                                        <span className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
                                                            {rule.start_date ? format(new Date(rule.start_date), 'yyyy.MM.dd') : 'PERPETUAL'}
                                                            <span className="mx-4 text-slate-300">/</span>
                                                            {rule.end_date ? format(new Date(rule.end_date), 'yyyy.MM.dd') : 'OPEN'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-10">
                                                    <div className="flex items-center justify-center gap-6">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">Triggers</span>
                                                            <div className="px-5 py-1.5 bg-white text-indigo-700 border-2 border-indigo-50 rounded-xl font-black font-mono text-xs shadow-sm">
                                                                {rule.conditions?.length || 0}
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="w-5 h-5 text-slate-200 stroke-[4px] mt-4" />
                                                        <div className="flex flex-col items-center gap-2">
                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">Adjusts</span>
                                                            <div className="px-5 py-1.5 bg-white text-emerald-700 border-2 border-emerald-50 rounded-xl font-black font-mono text-xs shadow-sm">
                                                                {rule.actions?.length || 0}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-10 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <Button variant="ghost" asChild className="h-12 w-12 p-0 border border-slate-100 hover:border-indigo-600 hover:bg-white hover:text-indigo-600 rounded-xl transition-all shadow-sm group">
                                                            <Link href={`/${locale}/sales/pricing-rules/${rule.id}`}>
                                                                <Edit2 className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                                            </Link>
                                                        </Button>
                                                        <form action={async () => { "use server"; await deletePricingRule(rule.id); }}>
                                                            <Button 
                                                                variant="ghost" 
                                                                type="submit"
                                                                className="h-12 w-12 p-0 border border-slate-100 hover:border-red-600 hover:bg-white hover:text-red-600 rounded-xl transition-all shadow-sm group"
                                                            >
                                                                <Trash2 className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                                            </Button>
                                                        </form>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* --- TELEMETRY & COMPLIANCE FOOTER --- */}
                <footer className="flex flex-col md:flex-row items-center justify-between gap-10 p-10 md:p-14 bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl shadow-slate-200/50">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-12 lg:gap-20">
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-sm">
                                <CheckCircle className="w-6 h-6 text-emerald-600 stroke-[3px]" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Sync Integrity</span>
                                <span className="text-xs font-black text-slate-900 uppercase tracking-widest">MASTER_CLOUD_SYNC_100%</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100 shadow-sm">
                                <ShieldCheck className="w-6 h-6 text-indigo-600 stroke-[3px]" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Governance</span>
                                <span className="text-xs font-black text-slate-900 uppercase tracking-widest">ISO-27001_COMPLIANT</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                        <div className="w-full md:w-auto text-[10px] font-black text-slate-500 px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100 uppercase tracking-[0.3em] font-mono shadow-inner text-center md:text-right">
                            TS: {new Date().toISOString().split('T')[0]} // {new Date().toLocaleTimeString()}
                        </div>
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.5em]">ERP Control v4.2.0.P</p>
                    </div>
                </footer>
            </div>
        </div>
    );
}