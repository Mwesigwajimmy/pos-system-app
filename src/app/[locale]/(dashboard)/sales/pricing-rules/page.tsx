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
    Activity,
    Layers,
    Copy,
    Database,
    RefreshCw,
    ShieldAlert,
    ChevronRight,
    ArrowUpRight,
    Search,
    Filter
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

    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user?.id)
        .single();

    if (!profile?.business_id) {
        return (
            <div className="p-6 max-w-7xl mx-auto min-h-screen flex items-center justify-center">
                <Alert variant="destructive" className="max-w-md border-none shadow-lg bg-red-50 p-6 rounded-2xl">
                    <ShieldAlert className="h-6 w-6 text-red-600" />
                    <AlertTitle className="font-bold text-red-900 ml-2">Identity Error</AlertTitle>
                    <AlertDescription className="font-medium text-red-800 mt-2 ml-2">
                        System failed to resolve your security context. Please contact support.
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
            <div className="p-6 flex items-center justify-center min-h-screen">
                <Alert variant="destructive" className="max-w-md border-none shadow-lg rounded-2xl">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <AlertTitle className="font-bold">Sync Latency</AlertTitle>
                    <AlertDescription className="text-sm mt-2">{error.message}</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col gap-6 p-4 md:p-8 lg:p-10 bg-slate-50/50 min-h-screen">
            
            {/* HEADER SECTION */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2.5 rounded-xl shadow-md">
                            <Layers className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Pricing Engine</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none px-2 py-0 text-[10px] font-bold">CORE V4.2.1</Badge>
                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Active Cluster
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="h-11 px-4 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-semibold rounded-xl transition-all active:scale-95 shadow-sm">
                        <Activity className="mr-2 h-4 w-4" /> Runtime Logs
                    </Button>
                    <Button asChild className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-500/20 border-none">
                        <Link href={`/${locale}/sales/pricing-rules/new`}>
                            <PlusCircle className="mr-2 h-5 w-5" /> Deploy Node
                        </Link>
                    </Button>
                </div>
            </div>

            {/* MAIN CONTENT CARD */}
            <Card className="border-slate-200 shadow-sm bg-white rounded-2xl overflow-hidden">
                <CardHeader className="p-6 md:p-8 border-b border-slate-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                                <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                                Execution Stack
                            </CardTitle>
                            <CardDescription className="text-slate-500 text-sm font-medium">
                                Higher priority nodes execute first to override lower clusters.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Nodes</span>
                            <span className="text-sm font-bold text-slate-900">{(rules as PricingRule[])?.length || 0}</span>
                        </div>
                    </div>
                </CardHeader>
                
                <CardContent className="p-0">
                    {!rules || rules.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 md:py-32 px-6 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                                <Zap className="w-10 h-10 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Engine Idling</h3>
                            <p className="text-slate-500 text-sm max-w-xs mx-auto mb-8 font-medium">
                                No pricing nodes are currently deployed. The system is using default base rates.
                            </p>
                            <Button asChild variant="outline" className="h-11 px-8 font-bold border-slate-200 rounded-xl hover:bg-slate-50">
                                <Link href={`/${locale}/sales/pricing-rules/new`}>Initialize First Node</Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[800px] text-sm text-left">
                                <thead className="bg-slate-50/50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest w-24">Priority</th>
                                        <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Logic Identity</th>
                                        <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Lifecycle</th>
                                        <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Predicate Structure</th>
                                        <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(rules as PricingRule[]).map((rule) => (
                                        <tr key={rule.id} className="group hover:bg-blue-50/30 transition-colors">
                                            <td className="px-6 py-5">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm border",
                                                    rule.priority > 50 
                                                        ? "bg-blue-600 text-white border-blue-500 shadow-sm" 
                                                        : "bg-slate-100 text-slate-500 border-slate-200"
                                                )}>
                                                    {rule.priority}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-slate-900 text-base">{rule.name}</span>
                                                        <Badge className={cn(
                                                            "border-none px-2 py-0 text-[9px] font-bold uppercase tracking-wider",
                                                            rule.is_active 
                                                                ? "bg-emerald-50 text-emerald-600" 
                                                                : "bg-slate-100 text-slate-400"
                                                        )}>
                                                            {rule.is_active ? 'Live' : 'Standby'}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded">ID: {rule.id.slice(0, 8)}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2 text-slate-600 font-medium">
                                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="text-xs">
                                                        {rule.start_date ? format(new Date(rule.start_date), 'MMM dd') : 'Open'}
                                                        <span className="mx-1 text-slate-300">→</span>
                                                        {rule.end_date ? format(new Date(rule.end_date), 'MMM dd') : '∞'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="flex items-center gap-1.5 bg-blue-50/50 text-blue-700 px-3 py-1 rounded-lg border border-blue-100 font-bold text-[10px] uppercase shadow-sm cursor-help hover:bg-blue-100 transition-colors">
                                                                    {rule.conditions?.[0]?.count || 0} Triggers
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="bg-slate-900 text-white font-bold p-2 text-xs">Requirements for activation</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                    <ChevronRight className="w-3 h-3 text-slate-300" />
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="flex items-center gap-1.5 bg-emerald-50/50 text-emerald-700 px-3 py-1 rounded-lg border border-emerald-100 font-bold text-[10px] uppercase shadow-sm cursor-help hover:bg-emerald-100 transition-colors">
                                                                    {rule.actions?.[0]?.count || 0} Outcomes
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="bg-slate-900 text-white font-bold p-2 text-xs">Price adjustments applied</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="icon" asChild className="h-9 w-9 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 rounded-lg shadow-sm active:scale-95 transition-all">
                                                        <Link href={`/${locale}/sales/pricing-rules/${rule.id}`}>
                                                            <Edit className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    <form action={async () => { "use server"; await deletePricingRule(rule.id); }}>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            type="submit"
                                                            className="h-9 w-9 bg-white border border-slate-200 hover:border-red-300 hover:text-red-600 rounded-lg shadow-sm active:scale-95 transition-all"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
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

            {/* SYSTEM TELEMETRY FOOTER */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 md:p-8 bg-slate-900 rounded-2xl shadow-xl shadow-slate-200 text-white border-t-4 border-blue-600">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-8">
                    <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Network Secure</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <Database className="w-4 h-4 text-blue-400" />
                        <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Replication Active</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <Activity className="w-4 h-4 text-slate-500" />
                        <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Latency: 14ms</span>
                    </div>
                </div>
                <div className="text-[10px] font-bold text-white/30 px-4 py-1.5 bg-white/5 rounded-lg border border-white/10 uppercase tracking-widest">
                    Cluster Synced: {new Date().toLocaleTimeString()}
                </div>
            </div>
        </div>
    );
}