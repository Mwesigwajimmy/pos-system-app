import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PricingRuleBuilder } from '@/components/sales/PricingRuleBuilder';
import {
  ChevronLeft, 
  Globe, 
  CheckCircle2, 
  Activity, 
  Layout, 
  ShieldCheck,
  User,
  Settings
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export const metadata: Metadata = {
  title: 'Pricing Strategy | Business Manager',
  description: 'Manage and deploy professional pricing strategies for your operations.',
};

interface PageProps {
  params: { locale: string, ruleId: string }
}

export default async function RuleBuilderPage({ params }: PageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) redirect(`/${params.locale}/login`);

  const { data: profile } = await supabase
      .from('profiles')
      .select('business_id, currency')
      .eq('id', user.id)
      .single();

  if (!profile?.business_id) redirect(`/${params.locale}/setup`);

  const businessId = profile.business_id;
  const supportedCurrencies = ['USD', 'UGX', 'EUR', 'GBP', 'KES', 'TZS', 'ZAR'];

  const rulePromise = params.ruleId !== 'new' 
      ? supabase
          .from('pricing_rules')
          .select(`*, conditions:pricing_rule_conditions(*), actions:pricing_rule_actions(*)`)
          .eq('id', params.ruleId)
          .eq('tenant_id', businessId)
          .single()
      : Promise.resolve({ data: null, error: null });

  const [ruleResult, customersRes, productsRes, locationsRes] = await Promise.all([
      rulePromise,
      supabase.from('customers').select('id, name').eq('business_id', businessId).eq('is_active', true).order('name'),
      supabase.from('products')
          .select('id, name, is_active, product_variants(price)')
          .eq('business_id', businessId)
          .eq('is_active', true)
          .order('name'),
      supabase.from('locations').select('id, name').eq('business_id', businessId).order('name')
  ]);

  if (params.ruleId !== 'new' && (ruleResult.error || !ruleResult.data)) {
      return notFound();
  }

  const mappedProducts = (productsRes.data || []).map(p => ({
      id: p.id,
      name: p.name,
      price: (p.product_variants as any)?.[0]?.price || 0
  }));

  return (
      <div className="flex-1 space-y-0 bg-[#F8FAFC] min-h-screen font-sans antialiased">
          
          {/* SYSTEM STATUS BAR */}
          <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Account ID:</span>
                      <span className="text-[11px] font-mono font-semibold text-slate-700">{businessId.slice(0, 12).toUpperCase()}</span>
                  </div>
                  <Separator orientation="vertical" className="h-4 bg-slate-200" />
                  <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Secure Session Active</span>
                  </div>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold border-slate-200 text-slate-500 bg-slate-50 px-3">
                  Node: {params.locale.toUpperCase()} / Global
              </Badge>
          </div>

          <div className="p-6 md:p-10 space-y-8 max-w-[1600px] mx-auto">
              
              {/* HEADER SECTION */}
              <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6">
                  <div className="space-y-5">
                      <Link 
                          href={`/${params.locale}/sales/pricing-rules`} 
                          className="group inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-blue-600 transition-colors"
                      >
                          <ChevronLeft className="w-4 h-4" /> 
                          Back to Strategies
                      </Link>
                      
                      <div className="flex items-center gap-5">
                          <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-200 relative">
                              <Settings className="w-8 h-8 text-blue-600" />
                          </div>
                          <div>
                              <div className="flex items-center gap-3 mb-1">
                                  <Badge className="bg-slate-900 text-white border-none text-[10px] font-bold px-2.5 py-0.5 rounded">
                                      {params.ruleId === 'new' ? 'NEW_STRATEGY' : `ID: ${params.ruleId.slice(0,8).toUpperCase()}`}
                                  </Badge>
                                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                      Verified Config
                                  </span>
                              </div>
                              <h1 className="text-3xl font-bold tracking-tight text-slate-900 uppercase">
                                  {params.ruleId === 'new' ? 'Create Pricing Strategy' : 'Edit Pricing Strategy'}
                              </h1>
                          </div>
                      </div>
                  </div>

                  {/* USER CONTEXT PANEL */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm min-w-[280px]">
                      <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">Operational Hub</span>
                              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase">
                                  <Globe className="w-3.5 h-3.5 text-blue-500" /> Global Network
                              </div>
                          </div>
                          <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">Active User</span>
                              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase">
                                  <User className="w-3.5 h-3.5 text-slate-400" /> {user.email?.split('@')[0]}
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              <Separator className="bg-slate-200/60" />

              {/* MAIN CONTENT AREA */}
              <div className="rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-white">
                  <PricingRuleBuilder 
                      initialData={ruleResult.data} 
                      customers={customersRes.data || []} 
                      products={mappedProducts} 
                      locations={locationsRes.data || []} 
                      currencies={supportedCurrencies}
                      tenantId={businessId}
                      locale={params.locale}
                  />
              </div>
              
              {/* FOOTER */}
              <footer className="pt-10 pb-16">
                  <div className="flex flex-col items-center gap-4">
                      <div className="bg-white px-8 py-4 rounded-xl border border-slate-200 flex items-center gap-10 shadow-sm">
                          <div className="text-center">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Session User</p>
                              <p className="text-xs font-semibold text-slate-700">{user.email}</p>
                          </div>
                          <Separator orientation="vertical" className="h-6 bg-slate-200" />
                          <div className="text-center">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Reference ID</p>
                              <p className="text-xs font-mono font-semibold text-slate-500">{businessId.slice(0,18)}</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-40">
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
                              System Verified © 2026
                          </p>
                      </div>
                  </div>
              </footer>
          </div>
      </div>
  );
}