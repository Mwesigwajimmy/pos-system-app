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
    ArrowUpRight
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

export const metadata: Metadata = {
  title: 'Pricing Engine | Enterprise Revenue Management',
  description: 'Manage automated pricing logic, discounts, and wholesale rates.',
};

// 1. Defined strict interface for Enterprise data consistency
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

    // 2. AUTH & TENANT ISOLATION
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user?.id)
        .single();

    if (!profile?.business_id) {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Tenant Context Error</AlertTitle>
                    <AlertDescription>Your account is not linked to a valid business tenant.</AlertDescription>
                </Alert>
            </div>
        );
    }

    // 3. DATA FETCHING (STRICT ISOLATION)
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
                    <AlertTitle>Synchronization Error</AlertTitle>
                    <AlertDescription>The Pricing Engine could not be synchronized: {error.message}</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 bg-slate-50/30 min-h-screen">
            {/* --- Header Section --- */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Pricing Engine</h2>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
                            <ShieldCheck className="w-3 h-3" /> Enterprise
                        </Badge>
                    </div>
                    <p className="text-slate-500">Configure automated logic for discounts, wholesale rates, and promotional campaigns.</p>
                </div>
                <Button asChild className="shadow-lg shadow-primary/20">
                    <Link href={`/${locale}/sales/pricing-rules/new`}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Deploy New Rule
                    </Link>
                </Button>
            </div>

            {/* --- Main Dashboard --- */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-100 pb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Rule Execution Stack</CardTitle>
                            <CardDescription>Rules are processed top-to-bottom based on Priority level.</CardDescription>
                        </div>
                        <Badge variant="secondary" className="font-mono">{(rules as PricingRule[])?.length || 0} Total Rules</Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {!rules || rules.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                            <div className="p-4 bg-slate-100 rounded-full"><Zap className="w-8 h-8 text-slate-400" /></div>
                            <div className="space-y-1">
                                <p className="font-semibold text-slate-900">No Pricing Rules Detected</p>
                                <p className="text-sm text-slate-500 max-w-xs">Your system is currently using default catalog pricing.</p>
                            </div>
                            <Button variant="outline" asChild><Link href={`/${locale}/sales/pricing-rules/new`}>Create First Rule</Link></Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="p-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest w-20">Priority</th>
                                        <th className="p-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Rule Definition</th>
                                        <th className="p-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Validity Period</th>
                                        <th className="p-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Configuration</th>
                                        <th className="p-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest text-right">Management</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(rules as PricingRule[]).map((rule) => (
                                        <tr key={rule.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group">
                                            <td className="p-4">
                                                <div className={`flex items-center justify-center w-10 h-10 rounded-lg font-black text-lg ${rule.priority > 50 ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'}`}>
                                                    {rule.priority}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-900">{rule.name}</span>
                                                        <Badge variant={rule.is_active ? 'default' : 'secondary'} className={rule.is_active ? 'bg-emerald-500' : ''}>
                                                            {rule.is_active ? 'Active' : 'Standby'}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">ID: {rule.id.split('-')[0]}</p>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <Calendar className="w-3 h-3 opacity-50" />
                                                    <span className="text-xs">
                                                        {rule.start_date ? format(new Date(rule.start_date), 'MMM dd, yyyy') : 'Indefinite'} 
                                                        <span className="mx-1 opacity-30">→</span>
                                                        {rule.end_date ? format(new Date(rule.end_date), 'MMM dd, yyyy') : 'No Expiry'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger>
                                                                <Badge variant="outline" className="font-medium bg-white">
                                                                    {rule.conditions?.[0]?.count || 0} IF
                                                                </Badge>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Target Conditions</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger>
                                                                <Badge variant="outline" className="font-medium bg-white text-emerald-600 border-emerald-100">
                                                                    {rule.actions?.[0]?.count || 0} THEN
                                                                </Badge>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Pricing Actions</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end items-center gap-1">
                                                    <Button variant="ghost" size="icon" asChild className="hover:bg-blue-50 hover:text-blue-600">
                                                        <Link href={`/${locale}/sales/pricing-rules/${rule.id}`}><Edit className="h-4 w-4" /></Link>
                                                    </Button>
                                                    <form action={deletePricingRule.bind(null, rule.id)}>
                                                        <Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-600 hover:bg-red-50">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </form>
                                                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <ArrowUpRight className="h-4 w-4 text-slate-400" />
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
        </div>
    );
}