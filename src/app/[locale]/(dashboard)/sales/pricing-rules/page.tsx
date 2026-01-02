import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';
import { 
    PlusCircle, 
    Edit, 
    Trash2, 
    Calendar, 
    Zap, 
    Activity,
    Layers,
    ChevronRight,
    Search,
    ShieldAlert,
    Database,
    RefreshCw
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
    Tooltip, 
    TooltipContent, 
    TooltipProvider, 
    TooltipTrigger 
} from "@/components/ui/tooltip";
import { deletePricingRule } from '@/app/actions/pricing';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Pricing Engine | Enterprise Revenue Management',
  description: 'Automated pricing logic and multi-tenant revenue control plane.',
};

// ENTERPRISE INTERFACE: Matches Supabase JSON return structure
export interface PricingRule {
  id: string;
  name: string;
  is_active: boolean;
  priority: number;
  start_date: string | null;
  end_date: string | null;
  tenant_id: string;
  // Supabase returns an array of objects for joined tables
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
            <div className="p-6 max-w-7xl mx-auto min-h-screen flex items-center justify-center">
                <Alert variant="destructive" className="max-w-md border-none shadow-2xl bg-white p-8 rounded-[32px]">
                    <ShieldAlert className="h-8 w-8 text-red-600 mb-4" />
                    <AlertTitle className="font-black text-slate-900 text-xl uppercase tracking-tighter">Identity Error</AlertTitle>
                    <AlertDescription className="font-bold text-slate-500 mt-2 text-sm leading-relaxed">
                        The system failed to resolve your Security Context. Please re-authenticate to restore the Pricing Cluster.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // FIXED QUERY: Fetching IDs instead of (count) ensures the array.length works correctly
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
            <div className="p-6 flex items-center justify-center min-h-screen">
                <Alert variant="destructive" className="max-w-md border-none shadow-xl rounded-3xl bg-white">
                    <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
                    <AlertTitle className="font-black text-slate-900 uppercase tracking-widest text-xs ml-2">Sync Latency</AlertTitle>
                    <AlertDescription className="text-sm mt-2 text-slate-500 font-medium">{error.message}</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col gap-8 p-4 md:p-10 bg-[#f8fafc] min-h-screen">
            
            {/* ENTERPRISE HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex items-center gap-5">
                    <div className="bg-slate-900 p-3.5 rounded-2xl shadow-xl">
                        <Layers className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900">Pricing Engine</h1>
                        <div className="flex items-center gap-3 mt-1.5">
                            <Badge className="bg-blue-600 text-white border-none px-2 py-0 text-[10px] font-black uppercase tracking-tighter">CORE_V4.2</Badge>
                            <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Cluster Active
                            </span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <Button variant="outline" className="h-12 px-5 border-slate-200 bg-white font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-slate-50">
                        <Activity className="mr-2 h-4 w-4 text-blue-500" /> Logs
                    </Button>
                    <Button asChild className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-xl shadow-blue-100 uppercase tracking-widest text-xs">
                        <Link href={`/${locale}/sales/pricing-rules/new`}>
                            <PlusCircle className="mr-2 h-5 w-5" /> Deploy Node
                        </Link>
                    </Button>
                </div>
            </div>

            {/* LOGIC STACK CARD */}
            <Card className="border-slate-200 shadow-xl shadow-slate-200/50 bg-white rounded-[32px] overflow-hidden">
                <CardHeader className="p-8 md:p-10 border-b border-slate-50 bg-slate-50/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <CardTitle className="text-xl font-black flex items-center gap-3 text-slate-900">
                                <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                                Execution Stack
                            </CardTitle>
                            <CardDescription className="text-slate-500 text-sm font-bold uppercase tracking-tight">
                                High-priority nodes override base rate clusters.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-3 px-5 py-2.5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nodes Active</span>
                            <span className="text-lg font-black text-slate-900">{(rules as PricingRule[])?.length || 0}</span>
                        </div>
                    </div>
                </CardHeader>
                
                <CardContent className="p-0">
                    {!rules || rules.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
                            <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center mb-8 border border-slate-100">
                                <Zap className="w-10 h-10 text-slate-200" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-3">Engine Idling</h3>
                            <p className="text-slate-400 text-sm max-w-xs mx-auto mb-10 font-bold uppercase tracking-tight">
                                No production nodes found. System is locked to default rates.
                            </p>
                            <Button asChild className="h-14 px-10 font-black bg-slate-900 text-white rounded-2xl">
                                <Link href={`/${locale}/sales/pricing-rules/new`}>Initialize First Node</Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[900px] text-sm text-left">
                                <thead className="bg-slate-50/50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-8 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest">Rank</th>
                                        <th className="px-8 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest">Logic Identity</th>
                                        <th className="px-8 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest">Lifecycle</th>
                                        <th className="px-8 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest text-center">Predicate Logic</th>
                                        <th className="px-8 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest text-right">Commit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {(rules as PricingRule[]).map((rule) => (
                                        <tr key={rule.id} className="group hover:bg-blue-50/20 transition-all">
                                            <td className="px-8 py-6">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm border-2 transition-transform group-hover:scale-110",
                                                    rule.priority > 50 
                                                        ? "bg-slate-900 text-white border-slate-800 shadow-lg" 
                                                        : "bg-white text-slate-400 border-slate-100"
                                                )}>
                                                    {rule.priority}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-black text-slate-900 text-lg tracking-tight">{rule.name}</span>
                                                        <Badge className={cn(
                                                            "border-none px-2 py-0.5 text-[9px] font-black uppercase tracking-widest",
                                                            rule.is_active 
                                                                ? "bg-emerald-500 text-white shadow-emerald-100 shadow-lg" 
                                                                : "bg-slate-100 text-slate-400"
                                                        )}>
                                                            {rule.is_active ? 'LIVE' : 'STANDBY'}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">NODE_ID: {rule.id.slice(0, 8)}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2.5 text-slate-600 font-bold text-xs">
                                                    <Calendar className="w-4 h-4 text-slate-300" />
                                                    <span className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                                        {rule.start_date ? format(new Date(rule.start_date), 'MMM dd') : 'OPEN'}
                                                        <span className="mx-2 text-slate-300">→</span>
                                                        {rule.end_date ? format(new Date(rule.end_date), 'MMM dd') : '∞'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center justify-center gap-3">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-xl border border-blue-100 font-black text-[10px] uppercase cursor-help hover:scale-105 transition-all">
                                                                    {rule.conditions?.length || 0} Triggers
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="bg-slate-900 text-white font-bold p-3 text-xs rounded-xl">Requirements for activation</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                    <ChevronRight className="w-4 h-4 text-slate-200" />
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-xl border border-emerald-100 font-black text-[10px] uppercase cursor-help hover:scale-105 transition-all">
                                                                    {rule.actions?.length || 0} Outcomes
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="bg-slate-900 text-white font-bold p-3 text-xs rounded-xl">Price mutations applied</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    <Button variant="ghost" size="icon" asChild className="h-11 w-11 bg-white border border-slate-100 hover:border-blue-200 hover:text-blue-600 rounded-xl shadow-sm transition-all">
                                                        <Link href={`/${locale}/sales/pricing-rules/${rule.id}`}>
                                                            <Edit className="h-5 w-5" />
                                                        </Link>
                                                    </Button>
                                                    <form action={async () => { "use server"; await deletePricingRule(rule.id); }}>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            type="submit"
                                                            className="h-11 w-11 bg-white border border-slate-100 hover:border-red-200 hover:text-red-600 rounded-xl shadow-sm transition-all"
                                                        >
                                                            <Trash2 className="h-5 w-5" />
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

            {/* TELEMETRY FOOTER */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-8 md:p-10 bg-slate-900 rounded-[32px] shadow-2xl text-white border-t-8 border-blue-600">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-10">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">Network Verified</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Database className="w-4 h-4 text-blue-400" />
                        <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">Atomic Replication</span>
                    </div>
                </div>
                <div className="text-[10px] font-black text-white/20 px-6 py-2.5 bg-white/5 rounded-2xl border border-white/10 uppercase tracking-[0.3em]">
                    STAGED_COMMIT: {new Date().toLocaleTimeString()}
                </div>
            </div>
        </div>
    );
}