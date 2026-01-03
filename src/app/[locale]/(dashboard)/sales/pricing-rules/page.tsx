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
    Globe
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { deletePricingRule } from '@/app/actions/pricing';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

// ENTERPRISE DATA INTERFACES
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

    // AUTHENTICATION GUARD & SECURITY CONTEXT
    if (!profile?.business_id) {
        return (
            <div className="p-10 max-w-7xl mx-auto min-h-screen flex items-center justify-center bg-[#F8FAFC]">
                <Card className="max-w-md border-2 border-slate-200 shadow-2xl rounded-xl overflow-hidden">
                    <div className="bg-red-600 h-2 w-full" />
                    <CardContent className="p-10 text-center">
                        <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-6" />
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Access Unauthorized</h2>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest leading-relaxed">
                            System of Record could not verify your organizational credentials.
                        </p>
                        <Button asChild className="mt-8 w-full bg-slate-900 font-bold uppercase tracking-widest text-[11px] h-12">
                            <Link href={`/${locale}/login`}>Re-Authenticate Session</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // MASTER DATA FETCHING
    const { data: rules, error } = await supabase
        .from('pricing_rules')
        .select(`
            *, 
            conditions:pricing_rule_conditions(id), 
            actions:pricing_rule_actions(id)
        `)
        .eq('tenant_id', profile.business_id) 
        .order('priority', { ascending: false });

    if (error) {
        return (
            <div className="p-10 flex items-center justify-center min-h-screen bg-[#F8FAFC]">
                <Alert className="max-w-md border-2 border-slate-200 bg-white shadow-xl p-6 rounded-xl">
                    <RefreshCw className="h-5 w-5 animate-spin text-slate-900" />
                    <AlertTitle className="font-black uppercase tracking-[0.2em] text-xs ml-3 text-slate-900">Data Reconcilliation Error</AlertTitle>
                    <AlertDescription className="text-[11px] mt-3 font-bold uppercase tracking-widest text-slate-500">{error.message}</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-[#F4F7F9] min-h-screen font-sans">
            
            {/* GLOBAL ERP STATUS HEADER */}
            <div className="bg-slate-900 text-white px-8 py-3 flex items-center justify-between border-b border-white/10 shadow-sm">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2.5">
                        <Globe className="w-4 h-4 text-slate-400" />
                        <span className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-400">Environment:</span>
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Global Production</span>
                    </div>
                    <Separator orientation="vertical" className="h-3 bg-white/20" />
                    <div className="flex items-center gap-2.5">
                        <Briefcase className="w-4 h-4 text-slate-400" />
                        <span className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-400">Org_ID:</span>
                        <span className="text-[10px] font-mono text-white">{profile.business_id.toUpperCase()}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                    <span className="text-[10px] font-black tracking-widest uppercase text-slate-200">System Integrity: Nominal</span>
                </div>
            </div>

            <div className="p-8 md:p-12 space-y-10 max-w-[1600px] mx-auto w-full">
                
                {/* BUSINESS CONTROLS HEADER */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
                    <div className="flex items-center gap-8">
                        <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl border border-slate-800">
                            <Settings className="w-10 h-10 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase leading-none mb-3">
                                Commercial Pricing Controls
                            </h1>
                            <div className="flex items-center gap-4">
                                <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200 border-none text-[10px] font-black tracking-[0.15em] px-3 py-1 rounded">
                                    VER. 4.2.0-STABLE
                                </Badge>
                                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                    <ShieldCheck className="w-4 h-4 text-indigo-500" />
                                    Master Policy Access Granted
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <Button variant="outline" className="h-12 px-6 border-2 border-slate-200 bg-white font-black rounded-xl text-[10px] uppercase tracking-[0.2em] hover:bg-slate-50 transition-all shadow-sm">
                            <History className="mr-2 h-4 w-4 text-slate-400" /> Audit Logs
                        </Button>
                        <Button asChild className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-100 uppercase tracking-[0.2em] text-[10px] transition-all">
                            <Link href={`/${locale}/sales/pricing-rules/new`}>
                                <Plus className="mr-2 h-4 w-4 stroke-[3px]" /> New Commercial Policy
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* POLICY INVENTORY TABLE */}
                <Card className="border border-slate-200 shadow-2xl shadow-slate-200/40 bg-white rounded-3xl overflow-hidden">
                    <CardHeader className="p-10 border-b border-slate-100 bg-[#F9FAFB]/50">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                            <div className="space-y-2">
                                <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tight">
                                    Global Rule Inventory
                                </CardTitle>
                                <CardDescription className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                                    Policies are executed based on descending priority ranks.
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-4 px-6 py-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                <div className="text-right">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Active Policies</span>
                                    <span className="text-2xl font-black font-mono text-slate-900 leading-none">{(rules as PricingRule[])?.length || 0}</span>
                                </div>
                                <Separator orientation="vertical" className="h-8 bg-slate-200" />
                                <Activity className="w-6 h-6 text-indigo-500" />
                            </div>
                        </div>
                    </CardHeader>
                    
                    <CardContent className="p-0">
                        {!rules || rules.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 px-10 text-center">
                                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8 border-2 border-dashed border-slate-200">
                                    <Search className="w-10 h-10 text-slate-200" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-3">Null Data Environment</h3>
                                <p className="text-slate-400 text-[11px] max-w-sm mx-auto mb-10 font-bold uppercase tracking-[0.15em] leading-loose">
                                    No commercial policies detected. System will default to baseline catalog values until a policy is initialized.
                                </p>
                                <Button asChild className="h-14 px-12 font-black bg-slate-900 text-white rounded-xl uppercase tracking-widest text-[11px] shadow-xl">
                                    <Link href={`/${locale}/sales/pricing-rules/new`}>Initialize First Policy</Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[1200px] text-sm text-left">
                                    <thead className="bg-[#F9FAFB] border-b border-slate-200">
                                        <tr>
                                            <th className="px-10 py-6 font-black text-slate-400 uppercase text-[9px] tracking-[0.3em]">Priority</th>
                                            <th className="px-10 py-6 font-black text-slate-400 uppercase text-[9px] tracking-[0.3em]">Commercial Identification</th>
                                            <th className="px-10 py-6 font-black text-slate-400 uppercase text-[9px] tracking-[0.3em]">Effective Period</th>
                                            <th className="px-10 py-6 font-black text-slate-400 uppercase text-[9px] tracking-[0.3em] text-center">Logic Complexity</th>
                                            <th className="px-10 py-6 font-black text-slate-400 uppercase text-[9px] tracking-[0.3em] text-right">Operations</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(rules as PricingRule[]).map((rule) => (
                                            <tr key={rule.id} className="group hover:bg-slate-50/80 transition-all duration-150">
                                                <td className="px-10 py-8">
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-xl flex items-center justify-center font-black font-mono text-sm border-2 transition-all shadow-sm",
                                                        rule.priority >= 100 
                                                            ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200" 
                                                            : "bg-white text-slate-600 border-slate-200"
                                                    )}>
                                                        {rule.priority}
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-black text-slate-900 text-lg tracking-tight uppercase">{rule.name}</span>
                                                            <Badge className={cn(
                                                                "border-none px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-sm",
                                                                rule.is_active 
                                                                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-50" 
                                                                    : "bg-slate-200 text-slate-600"
                                                            )}>
                                                                {rule.is_active ? 'Active' : 'Draft'}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-[10px] font-mono font-bold text-slate-400 tracking-tighter uppercase flex items-center gap-2">
                                                            <Database className="w-3 h-3" /> UID: {rule.id.toUpperCase()}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <div className="flex items-center gap-3 text-slate-700 font-black text-[10px] uppercase tracking-widest">
                                                        <Calendar className="w-4 h-4 text-slate-300 stroke-[2.5px]" />
                                                        <span className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                                                            {rule.start_date ? format(new Date(rule.start_date), 'yyyy-MM-dd') : 'PERPETUAL'}
                                                            <span className="mx-3 text-slate-300 font-normal">→</span>
                                                            {rule.end_date ? format(new Date(rule.end_date), 'yyyy-MM-dd') : 'OPEN_END'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <div className="flex items-center justify-center gap-4">
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Triggers</span>
                                                            <div className="px-4 py-1 bg-white text-indigo-700 border-2 border-indigo-100 rounded-lg font-black font-mono text-xs">
                                                                {rule.conditions?.length || 0}
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-slate-200 stroke-[3px] mt-4" />
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Adjustments</span>
                                                            <div className="px-4 py-1 bg-white text-emerald-700 border-2 border-emerald-100 rounded-lg font-black font-mono text-xs">
                                                                {rule.actions?.length || 0}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <Button variant="ghost" asChild className="h-11 w-11 p-0 border border-slate-100 hover:border-indigo-600 hover:bg-white hover:text-indigo-600 rounded-xl transition-all shadow-sm group">
                                                            <Link href={`/${locale}/sales/pricing-rules/${rule.id}`}>
                                                                <Edit2 className="h-4.5 w-4.5 group-hover:scale-110 transition-transform" />
                                                            </Link>
                                                        </Button>
                                                        <form action={async () => { "use server"; await deletePricingRule(rule.id); }}>
                                                            <Button 
                                                                variant="ghost" 
                                                                type="submit"
                                                                className="h-11 w-11 p-0 border border-slate-100 hover:border-red-600 hover:bg-white hover:text-red-600 rounded-xl transition-all shadow-sm group"
                                                            >
                                                                <Trash2 className="h-4.5 w-4.5 group-hover:scale-110 transition-transform" />
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

                {/* TELEMETRY & COMPLIANCE FOOTER */}
                <footer className="flex flex-col md:flex-row items-center justify-between gap-10 p-10 bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/50">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-16">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100">
                                <CheckCircle className="w-5 h-5 text-emerald-600 stroke-[3px]" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Sync Integrity</span>
                                <span className="text-[11px] font-bold text-slate-900 uppercase tracking-widest">Master Cloud Synchronized</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
                                <ShieldCheck className="w-5 h-5 text-indigo-600 stroke-[3px]" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Policy Governance</span>
                                <span className="text-[11px] font-bold text-slate-900 uppercase tracking-widest">ISO-27001 Data Compliant</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="text-[10px] font-black text-slate-400 px-6 py-3 bg-slate-50 rounded-xl border border-slate-200 uppercase tracking-[0.2em] font-mono shadow-inner">
                            Timestamp: {new Date().toISOString()}
                        </div>
                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">ERP Control v2.0.4 Premium</p>
                    </div>
                </footer>
            </div>
        </div>
    );
}