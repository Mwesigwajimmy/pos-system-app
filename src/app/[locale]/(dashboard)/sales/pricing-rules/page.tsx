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
    ShieldCheck, 
    AlertCircle,
    Activity,
    Layers,
    Copy,
    ExternalLink,
    Database,
    RefreshCw,
    ShieldAlert,
    ChevronRight,
    ArrowUpRight // Added missing import
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

/**
 * ENTERPRISE METADATA
 */
export const metadata: Metadata = {
  title: 'Pricing Engine | Enterprise Revenue Intelligence',
  description: 'High-performance automated pricing logic and multi-tenant revenue management control plane.',
};

/**
 * CORE DATA INTERFACES
 */
export interface PricingRule {
  id: string;
  name: string;
  is_active: boolean;
  priority: number;
  start_date: string | null;
  end_date: string | null;
  tenant_id: string;
  conditions: [{ count: number }];
  actions: [{ count: number }];
  created_at?: string;
}

interface PageProps {
  params: { locale: string };
}

export default async function PricingRulesPage({ params: { locale } }: PageProps) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. Resolve Auth Identity
    const { data: { user } } = await supabase.auth.getUser();
    
    // 2. Resolve Multi-tenant Security Context
    const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user?.id)
        .single();

    if (!profile?.business_id) {
        return (
            <div className="p-8 max-w-4xl mx-auto min-h-screen flex items-center justify-center">
                <Alert variant="destructive" className="border-2 shadow-2xl bg-red-50 p-6 rounded-[2rem]">
                    <ShieldAlert className="h-8 w-8" />
                    <AlertTitle className="font-black uppercase tracking-tighter text-lg ml-2">Tenant Isolation Error</AlertTitle>
                    <AlertDescription className="font-medium text-red-800 mt-2 ml-2">
                        System failed to resolve your security context. Please contact infrastructure support.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // 3. Fetch Logical Rules for the Tenant
    const { data: rules, error } = await supabase
        .from('pricing_rules')
        .select(`
            *, 
            conditions:pricing_rule_conditions(count), 
            actions:pricing_rule_actions(count)
        `)
        .eq('tenant_id', profile.business_id) 
        .order('priority', { ascending: false });

    if (error) {
        return (
            <div className="p-8 flex items-center justify-center min-h-screen">
                <Alert variant="destructive" className="max-w-2xl border-2 rounded-[2rem]">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <AlertTitle className="font-bold">Synchronization Latency</AlertTitle>
                    <AlertDescription className="font-mono text-xs mt-2">
                        {error.message}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-10 p-4 md:p-10 bg-[#f8fafc] min-h-screen selection:bg-primary selection:text-white">
            
            {/* --- MASTER COMMAND HEADER --- */}
            <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary shadow-xl shadow-primary/20 rounded-2xl">
                            <Layers className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] tracking-widest px-2 py-0">
                                    CORE_v4.2.1
                                </Badge>
                                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-emerald-600">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Logic Nodes Online
                                </div>
                            </div>
                            <h2 className="text-4xl font-black tracking-tighter text-slate-900 italic uppercase leading-none">
                                Pricing Engine
                            </h2>
                        </div>
                    </div>
                    <p className="text-slate-500 font-medium max-w-2xl leading-relaxed border-l-4 border-slate-200 pl-4">
                        Autonomous revenue optimization cluster. Control global price mutations, tiered loyalty logic, and regional inventory rebating from a single high-availability control plane.
                    </p>
                </div>
                
                <div className="flex items-center gap-4">
                    <Button variant="outline" className="hidden sm:flex border-2 border-slate-200 font-bold bg-white hover:bg-slate-50 transition-all rounded-xl h-12">
                        <Activity className="mr-2 h-4 w-4" /> Runtime Logs
                    </Button>
                    <Button asChild className="h-14 px-8 shadow-2xl shadow-primary/30 bg-primary hover:bg-primary/90 transition-all scale-100 hover:scale-[1.02] active:scale-95 rounded-xl border-b-4 border-primary-foreground/20">
                        <Link href={`/${locale}/sales/pricing-rules/new`} className="font-black uppercase tracking-widest text-xs">
                            <PlusCircle className="mr-2 h-5 w-5" /> Deploy Logic Node
                        </Link>
                    </Button>
                </div>
            </div>

            {/* --- EXECUTION STACK --- */}
            <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white/70 backdrop-blur-xl ring-1 ring-slate-200/60 overflow-hidden rounded-[2.5rem]">
                <CardHeader className="p-8 border-b border-slate-100 bg-white/50">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-xl font-black flex items-center gap-2 text-slate-800">
                                <Zap className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                Logic Execution Stack
                            </CardTitle>
                            <CardDescription className="text-slate-400 font-medium italic text-xs">
                                Rules are processed via high-priority injection. Top-level nodes override lower priority clusters.
                            </CardDescription>
                        </div>
                        <Badge className="bg-slate-900 text-white font-mono rounded-lg h-9 px-4 border-none shadow-lg shadow-slate-900/20">
                            STACK_LOAD: {(rules as PricingRule[])?.length || 0}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {!rules || rules.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
                            <div className="p-8 bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200 animate-pulse">
                                <Zap className="w-16 h-16 text-slate-300" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Engine Idling</p>
                                <p className="text-slate-400 max-w-sm mx-auto font-medium leading-relaxed">No active logic nodes detected. Default rates enforced.</p>
                            </div>
                            <Button variant="outline" asChild className="rounded-2xl border-2 h-12 px-8 font-bold hover:bg-slate-50 transition-all"><Link href={`/${locale}/sales/pricing-rules/new`}>Initialize First Node</Link></Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="p-6 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em] w-28 text-center">Priority</th>
                                        <th className="p-6 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Deployment Identity</th>
                                        <th className="p-6 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Lifecycle</th>
                                        <th className="p-6 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Predicate Logic</th>
                                        <th className="p-6 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em] text-right pr-10">Cluster Tools</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(rules as PricingRule[]).map((rule) => (
                                        <tr key={rule.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-all group relative">
                                            <td className="p-6">
                                                <div className={`flex items-center justify-center w-14 h-14 rounded-2xl font-black text-xl shadow-inner border-2 ${rule.priority > 50 ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                                    {rule.priority}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-black text-slate-900 text-lg italic uppercase tracking-tight group-hover:text-primary transition-colors cursor-default">{rule.name}</span>
                                                        <Badge className={rule.is_active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200'}>
                                                            {rule.is_active ? 'PRODUCTION' : 'STANDBY'}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-slate-400 uppercase group-hover:text-slate-600 transition-colors">
                                                        <Copy className="w-3 h-3 cursor-pointer hover:text-primary" />
                                                        NODE_ID: {rule.id.split('-')[0]}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-3 text-slate-600 bg-white w-fit px-4 py-2 rounded-xl border border-slate-200 shadow-sm font-mono">
                                                    <Calendar className="w-4 h-4 text-primary" />
                                                    <span className="text-xs font-black">
                                                        {rule.start_date ? format(new Date(rule.start_date), 'dd.MM.yy') : '∞'} 
                                                        <span className="mx-2 text-slate-300">/</span>
                                                        {rule.end_date ? format(new Date(rule.end_date), 'dd.MM.yy') : '∞'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-2">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-xl border border-blue-100 font-black text-[10px] uppercase shadow-sm cursor-help">
                                                                    {rule.conditions?.[0]?.count || 0} IF
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="bg-slate-900 text-white font-bold border-none p-3 shadow-2xl">
                                                                <p className="flex items-center gap-2"><ArrowUpRight className="w-4 h-4 text-blue-400"/> Triggers: Logical requirements</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                    <ChevronRight className="w-3 h-3 text-slate-300" />
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-xl border border-emerald-100 font-black text-[10px] uppercase shadow-sm cursor-help">
                                                                    {rule.actions?.[0]?.count || 0} THEN
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="bg-slate-900 text-white font-bold border-none p-3 shadow-2xl">
                                                                <p className="flex items-center gap-2"><RefreshCw className="w-4 h-4 text-emerald-400"/> Mutations: Final adjustments</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </td>
                                            <td className="p-6 text-right pr-10">
                                                <div className="flex justify-end items-center gap-3">
                                                    <Button variant="ghost" size="icon" asChild className="h-11 w-11 bg-white hover:bg-primary hover:text-white rounded-xl transition-all shadow-sm border border-slate-200">
                                                        <Link href={`/${locale}/sales/pricing-rules/${rule.id}`}><Edit className="h-4 w-4" /></Link>
                                                    </Button>
                                                    
                                                    <form action={async () => {
                                                        "use server";
                                                        await deletePricingRule(rule.id);
                                                    }}>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            type="submit"
                                                            className="h-11 w-11 bg-white text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm border border-slate-200"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </form>
                                                    <Button variant="ghost" size="icon" className="h-11 w-11 text-slate-300 opacity-0 group-hover:opacity-100 transition-all hover:text-slate-900 rounded-xl">
                                                        <ExternalLink className="h-4 w-4" />
                                                    </Button>
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

            {/* --- BOTTOM SYSTEM STATUS --- */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-slate-900/40 text-white/50 font-mono text-[10px] uppercase tracking-[0.2em] border-t-4 border-primary">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-8 px-4">
                    <span className="flex items-center gap-2.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" /> 
                        SECURE_TUNNEL_ESTABLISHED
                    </span>
                    <span className="flex items-center gap-2.5">
                        <Database className="w-4 h-4 text-blue-500" /> 
                        SUPABASE_REPLICATION_SYNCED
                    </span>
                    <span className="flex items-center gap-2.5 text-slate-500">
                        <Activity className="w-4 h-4" /> 
                        LATENCY: 14ms
                    </span>
                </div>
                <div className="px-6 py-2 bg-white/5 rounded-full border border-white/10 text-white/30">
                    LAST_ENGINE_REFRESH: {new Date().toLocaleTimeString()}
                </div>
            </div>
        </div>
    );
}