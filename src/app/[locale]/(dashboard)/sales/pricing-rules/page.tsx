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
    RefreshCcw,
    Filter,
    MoreHorizontal
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

// INTERFACE DEFINITIONS
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
            <div className="p-6 max-w-7xl mx-auto min-h-screen flex items-center justify-center">
                <Alert className="max-w-md border border-slate-200 shadow-xl bg-white p-8 rounded-2xl">
                    <AlertCircle className="h-6 w-6 text-red-600 mb-4" />
                    <AlertTitle className="font-bold text-slate-900 text-lg uppercase tracking-tight">Authentication Required</AlertTitle>
                    <AlertDescription className="text-slate-500 mt-2 text-sm leading-relaxed font-medium">
                        Your session could not be verified. Please log in again to manage your business pricing rules.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

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
                <Alert variant="destructive" className="max-w-md border border-red-100 shadow-lg rounded-xl bg-white">
                    <RefreshCcw className="h-5 w-5 animate-spin text-red-600" />
                    <AlertTitle className="font-bold uppercase tracking-widest text-xs ml-2">Data Sync Error</AlertTitle>
                    <AlertDescription className="text-sm mt-2 font-medium opacity-80">{error.message}</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col gap-8 p-6 md:p-10 bg-slate-50/50 min-h-screen">
            
            {/* ENTERPRISE PAGE HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="bg-slate-900 p-3 rounded-xl shadow-lg">
                        <Settings className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Pricing Management</h1>
                        <div className="flex items-center gap-3 mt-1">
                            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-slate-200">Production v4.2</Badge>
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Operational
                            </span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="h-11 px-4 border-slate-200 bg-white font-bold rounded-lg text-[11px] uppercase tracking-wider hover:bg-slate-50">
                        <Activity className="mr-2 h-4 w-4 text-slate-400" /> System Logs
                    </Button>
                    <Button asChild className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md uppercase tracking-wider text-[11px]">
                        <Link href={`/${locale}/sales/pricing-rules/new`}>
                            <Plus className="mr-2 h-4 w-4" /> Create New Rule
                        </Link>
                    </Button>
                </div>
            </div>

            {/* MAIN DATA TABLE CARD */}
            <Card className="border-slate-200 shadow-sm bg-white rounded-2xl overflow-hidden">
                <CardHeader className="p-6 md:p-8 border-b border-slate-100 bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
                                Global Pricing Rules
                            </CardTitle>
                            <CardDescription className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                                Rules with higher priority take precedence in the calculation engine.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Active Rules</span>
                            <span className="text-base font-bold text-slate-900">{(rules as PricingRule[])?.length || 0}</span>
                        </div>
                    </div>
                </CardHeader>
                
                <CardContent className="p-0">
                    {!rules || rules.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                                <Search className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">No Rules Configured</h3>
                            <p className="text-slate-400 text-sm max-w-sm mx-auto mb-8 font-medium">
                                There are currently no active pricing rules. The system will use standard catalog pricing until rules are added.
                            </p>
                            <Button asChild className="h-12 px-8 font-bold bg-slate-900 text-white rounded-lg">
                                <Link href={`/${locale}/sales/pricing-rules/new`}>Configure First Rule</Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1000px] text-sm text-left">
                                <thead className="bg-slate-50/80 border-b border-slate-100">
                                    <tr>
                                        <th className="px-8 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest">Priority</th>
                                        <th className="px-8 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest">Rule Identification</th>
                                        <th className="px-8 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest">Validity Period</th>
                                        <th className="px-8 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest text-center">Logic Summary</th>
                                        <th className="px-8 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest text-right">Management</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(rules as PricingRule[]).map((rule) => (
                                        <tr key={rule.id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-5">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs border transition-all",
                                                    rule.priority >= 100 
                                                        ? "bg-slate-900 text-white border-slate-900" 
                                                        : "bg-white text-slate-500 border-slate-200"
                                                )}>
                                                    {rule.priority}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-900 text-base">{rule.name}</span>
                                                        <Badge className={cn(
                                                            "border-none px-2 py-0 text-[9px] font-bold uppercase",
                                                            rule.is_active 
                                                                ? "bg-emerald-100 text-emerald-700" 
                                                                : "bg-slate-100 text-slate-500"
                                                        )}>
                                                            {rule.is_active ? 'Active' : 'Draft'}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">ID: {rule.id.toUpperCase()}</div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2 text-slate-600 font-bold text-[11px]">
                                                    <Calendar className="w-3.5 h-3.5 text-slate-300" />
                                                    <span className="tracking-tight">
                                                        {rule.start_date ? format(new Date(rule.start_date), 'MMM dd, yyyy') : 'No Start'}
                                                        <span className="mx-2 text-slate-300">→</span>
                                                        {rule.end_date ? format(new Date(rule.end_date), 'MMM dd, yyyy') : 'Perpetual'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 px-3 py-0.5 font-bold text-[10px] uppercase">
                                                        {rule.conditions?.length || 0} Triggers
                                                    </Badge>
                                                    <ChevronRight className="w-3 h-3 text-slate-300" />
                                                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 px-3 py-0.5 font-bold text-[10px] uppercase">
                                                        {rule.actions?.length || 0} Outcomes
                                                    </Badge>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="icon" asChild className="h-9 w-9 border border-transparent hover:border-slate-200 hover:bg-white text-slate-400 hover:text-indigo-600 rounded-md transition-all">
                                                        <Link href={`/${locale}/sales/pricing-rules/${rule.id}`}>
                                                            <Edit2 className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    <form action={async () => { "use server"; await deletePricingRule(rule.id); }}>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            type="submit"
                                                            className="h-9 w-9 border border-transparent hover:border-red-100 hover:bg-white text-slate-400 hover:text-red-600 rounded-md transition-all"
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
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 md:p-8 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-8">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Network Synchronized</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-indigo-500" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Multi-Region Storage</span>
                    </div>
                </div>
                <div className="text-[10px] font-bold text-slate-400 px-4 py-2 bg-slate-50 rounded-lg border border-slate-100 uppercase tracking-wider">
                    Last Update Check: {new Date().toLocaleTimeString()}
                </div>
            </div>
        </div>
    );
}