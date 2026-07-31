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
  Settings,
  Search,
  AlertCircle,
  Activity,
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
      <div className="p-10 max-w-7xl mx-auto min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md border border-slate-200 shadow-sm rounded-lg">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-5" />
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Access denied</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              We couldn't verify your business account for this page.
            </p>
            <Button asChild className="mt-6 w-full bg-slate-900 hover:bg-slate-800">
              <Link href={`/${locale}/login`}>Sign in again</Link>
            </Button>
          </CardContent>
        </Card>
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
      <div className="p-10 flex items-center justify-center min-h-screen bg-slate-50">
        <Alert className="max-w-md border border-slate-200 bg-white shadow-sm p-5 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <AlertTitle className="font-semibold text-sm text-slate-900">Couldn't load pricing rules</AlertTitle>
          <AlertDescription className="text-sm mt-1 text-slate-500">{error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <div className="p-6 md:p-10 space-y-8 max-w-[1400px] mx-auto w-full">

        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Pricing rules
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Rules apply in order of priority, highest first.
              </p>
            </div>
          </div>

          <Button asChild className="h-10 px-5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-md">
            <Link href={`/${locale}/sales/pricing-rules/new`}>
              <Plus className="mr-2 h-4 w-4" /> New rule
            </Link>
          </Button>
        </div>

        {/* Rule inventory */}
        <Card className="border border-slate-200 shadow-sm rounded-lg overflow-hidden">
          <CardHeader className="p-6 border-b border-slate-200 bg-slate-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">
                  All rules
                </CardTitle>
                <CardDescription className="text-sm text-slate-500 mt-0.5">
                  {(rules as PricingRule[])?.length || 0} rule{(rules as PricingRule[])?.length === 1 ? '' : 's'} configured
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-md border border-slate-200">
                <Activity className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">
                  {(rules as PricingRule[])?.filter(r => r.is_active).length || 0} active
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {!rules || rules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 px-10 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-dashed border-slate-200">
                  <Search className="w-7 h-7 text-slate-300" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">No pricing rules yet</h3>
                <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
                  Prices will use your standard catalog values until a rule is created.
                </p>
                <Button asChild className="bg-slate-900 hover:bg-slate-800 text-white">
                  <Link href={`/${locale}/sales/pricing-rules/new`}>Create your first rule</Link>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 font-medium text-slate-500 text-xs">Priority</th>
                      <th className="px-6 py-3 font-medium text-slate-500 text-xs">Rule</th>
                      <th className="px-6 py-3 font-medium text-slate-500 text-xs">Effective period</th>
                      <th className="px-6 py-3 font-medium text-slate-500 text-xs text-center">Conditions / Actions</th>
                      <th className="px-6 py-3 font-medium text-slate-500 text-xs">Created</th>
                      <th className="px-6 py-3 font-medium text-slate-500 text-xs text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(rules as PricingRule[]).map((rule) => (
                      <tr key={rule.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className={cn(
                            "w-9 h-9 rounded-md flex items-center justify-center font-mono text-sm border",
                            rule.priority >= 100
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white text-slate-600 border-slate-200"
                          )}>
                            {rule.priority}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900">{rule.name}</span>
                              <Badge className={cn(
                                "border-none px-2 py-0.5 text-xs font-medium rounded",
                                rule.is_active
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-500"
                              )}>
                                {rule.is_active ? 'Active' : 'Draft'}
                              </Badge>
                            </div>
                            <div className="text-xs font-mono text-slate-400">
                              {rule.id}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-600 text-sm">
                            <Calendar className="w-4 h-4 text-slate-300" />
                            <span>
                              {rule.start_date ? format(new Date(rule.start_date), 'MMM d, yyyy') : 'No start date'}
                              <span className="mx-2 text-slate-300">→</span>
                              {rule.end_date ? format(new Date(rule.end_date), 'MMM d, yyyy') : 'No end date'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-3">
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-md font-mono text-xs">
                              {rule.conditions?.length || 0} cond.
                            </span>
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md font-mono text-xs">
                              {rule.actions?.length || 0} action{rule.actions?.length === 1 ? '' : 's'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-sm">
                          {rule.created_at ? format(new Date(rule.created_at), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" asChild className="h-9 w-9 p-0 border border-slate-200 hover:border-slate-900 hover:bg-white rounded-md">
                              <Link href={`/${locale}/sales/pricing-rules/${rule.id}`}>
                                <Edit2 className="h-4 w-4" />
                              </Link>
                            </Button>
                            <form action={async () => { "use server"; await deletePricingRule(rule.id); }}>
                              <Button
                                variant="ghost"
                                type="submit"
                                className="h-9 w-9 p-0 border border-slate-200 hover:border-red-500 hover:bg-white hover:text-red-500 rounded-md"
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
      </div>
    </div>
  );
}