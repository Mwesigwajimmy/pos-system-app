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
    ArrowUpRight,
    Activity,
    Layers,
    Copy,
    ExternalLink,
    Database,
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
import { Separator } from '@/components/ui/separator';
import { deletePricingRule } from '@/app/actions/pricing';

export const metadata: Metadata = {
  title: 'Pricing Engine | Enterprise Revenue Intelligence',
  description: 'High-performance automated pricing logic and multi-tenant revenue management.',
};

export interface PricingRule {
  id: string;
  name: string;
  is_active: boolean;
  priority: number;
  start_date: string | null;
  end_date: string | null;
  conditions: { count: number }[];
  actions: { count: number }[];
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
            <div className="p-8 max-w-4xl mx-auto">
                <Alert variant="destructive" className="border-2 shadow-xl bg-red-50">
                    <AlertCircle className="h-5 w-5" />
                    <AlertTitle className="font-black uppercase tracking-tighter">Tenant Isolation Error</AlertTitle>
                    <AlertDescription className="font-medium text-red-800">
                        System failed to resolve your security context. Please contact infrastructure support.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

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
            <div className="p-8">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Synchronization Latency</AlertTitle>
                    <AlertDescription>The Logic Engine is currently unreachable: {error.message}</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-10 p-4 md:p-10 bg-[#f8fafc] min-h-screen">
            {/* --- MASTER COMMAND HEADER --- */}
            <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <Layers className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black tracking-tighter text-slate-900 italic uppercase">
                                Pricing Engine
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="bg-white border-slate-200 text-slate-500 font-mono text-[10px] tracking-widest px-2 py-0">
                                    CORE_v4.2.1
                                </Badge>
                                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-600">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Logic Nodes Online
                                </div>
                            </div>
                        </div>
                    </div>
                    <p className="text-slate-500 font-medium max-w-2xl leading-relaxed">
                        Autonomous revenue optimization cluster. Control global price mutations, tiered loyalty logic, and regional inventory rebating from a single control plane.
                    </p>
                </div>
                
                <div className="flex items-center gap-4">
                    <Button variant="outline" className="hidden sm:flex border-2 border-slate-200 font-bold bg-white hover:bg-slate-50 transition-all">
                        <Activity className="mr-2 h-4 w-4" /> Runtime Logs
                    </Button>
                    <Button asChild className="h-14 px-8 shadow-2xl shadow-primary/30 bg-primary hover:bg-primary/90 transition-all scale-100 hover:scale-[1.02] active:scale-95">
                        <Link href={`/${locale}/sales/pricing-rules/new`} className="font-black uppercase tracking-widest text-xs">
                            <PlusCircle className="mr-2 h-5 w-5" /> Deploy Logic Node
                        </Link>
                    </Button>
                </div>
            </div>

            {/* --- EXECUTION STACK --- */}
            <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white/70 backdrop-blur-xl ring-1 ring-slate-100 overflow-hidden rounded-[2rem]">
                <CardHeader className="p-8 border-b border-slate-50 bg-white">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-xl font-black flex items-center gap-2">
                                <Zap className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                Logic Execution Stack
                            </CardTitle>
                            <CardDescription className="text-slate-400 font-medium italic">
                                Rules are processed via high-priority injection. Top-level rules override lower nodes.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge className="bg-slate-900 text-white font-mono rounded-lg h-8 px-4">
                                STACK_LOAD: {(rules as PricingRule[])?.length || 0}
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {!rules || rules.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
                            <div className="p-6 bg-slate-50 rounded-[2.5rem] border-4 border-dotted border-slate-200 animate-pulse">
                                <Zap className="w-12 h-12 text-slate-300" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Engine Idling</p>
                                <p className="text-slate-400 max-w-sm mx-auto font-medium">No active logic nodes detected in your cluster. Default catalog rates are currently enforced.</p>
                            </div>
                            <Button variant="outline" asChild className="rounded-full border-2"><Link href={`/${locale}/sales/pricing-rules/new`}>Initialize First Node</Link></Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/30 border-b border-slate-100">
                                        <th className="p-6 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em] w-24 text-center">Pri</th>
                                        <th className="p-6 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Deployment Identity</th>
                                        <th className="p-6 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Lifecycle</th>
                                        <th className="p-6 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Predicate Logic</th>
                                        <th className="p-6 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em] text-right">Cluster Tools</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(rules as PricingRule[]).map((rule) => (
                                        <tr key={rule.id} className="border-b border-slate-50 hover:bg-white transition-all group relative">
                                            <td className="p-6">
                                                <div className={`flex items-center justify-center w-12 h-12 rounded-2xl font-black text-lg shadow-sm border ${rule.priority > 50 ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                    {rule.priority}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-black text-slate-900 text-base italic uppercase tracking-tight group-hover:text-primary transition-colors">{rule.name}</span>
                                                        <Badge className={rule.is_active ? 'bg-emerald-500 shadow-lg shadow-emerald-100' : 'bg-slate-200 text-slate-500'}>
                                                            {rule.is_active ? 'PRODUCTION' : 'STANDBY'}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-slate-400 uppercase">
                                                        <Copy className="w-3 h-3 cursor-pointer hover:text-slate-600" />
                                                        NODE_ID: {rule.id.split('-')[0]}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-3 text-slate-600 bg-slate-100/50 w-fit px-3 py-1.5 rounded-xl border border-slate-100">
                                                    <Calendar className="w-4 h-4 text-slate-400" />
                                                    <span className="text-xs font-bold font-mono">
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
                                                            <TooltipTrigger>
                                                                <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-lg border border-blue-100 font-black text-[10px] uppercase">
                                                                    {rule.conditions?.[0]?.count || 0} IF
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="bg-slate-900 text-white font-bold border-none">Triggers: Logic gate requirements</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                    <div className="h-4 w-[1px] bg-slate-200 mx-1" />
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger>
                                                                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg border border-emerald-100 font-black text-[10px] uppercase">
                                                                    {rule.actions?.[0]?.count || 0} THEN
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="bg-slate-900 text-white font-bold border-none">Mutations: Resulting price adjustments</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex justify-end items-center gap-3">
                                                    <Button variant="ghost" size="icon" asChild className="h-10 w-10 bg-slate-50 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm">
                                                        <Link href={`/${locale}/sales/pricing-rules/${rule.id}`}><Edit className="h-4 w-4" /></Link>
                                                    </Button>
                                                    
                                                    {/* FIXED: Form action wrapper to satisfy TypeScript Promise<void> */}
                                                    <form action={async () => {
                                                        "use server";
                                                        await deletePricingRule(rule.id);
                                                    }}>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-10 w-10 bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </form>
                                                    <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-300 opacity-0 group-hover:opacity-100 transition-all hover:text-slate-900">
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-slate-900 rounded-[2rem] text-white/50 font-mono text-[10px] uppercase tracking-[0.2em]">
                <div className="flex items-center gap-6 px-4">
                    <span className="flex items-center gap-2"><ShieldCheck className="w-3 h-3 text-emerald-500" /> SECURE_TUNNEL_ESTABLISHED</span>
                    <span className="flex items-center gap-2"><Database className="w-3 h-3 text-blue-500" /> SUPABASE_REPLICATION_SYNCED</span>
                </div>
                <div className="px-4">
                    LAST_ENGINE_REFRESH: {new Date().toLocaleTimeString()}
                </div>
            </div>
        </div>
    );
}