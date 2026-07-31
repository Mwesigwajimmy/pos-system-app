import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PricingRuleBuilder } from '@/components/sales/PricingRuleBuilder';
import {
  ChevronLeft,
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
    <div className="flex-1 bg-slate-50 min-h-screen">
      <div className="p-6 md:p-10 space-y-6 max-w-[1400px] mx-auto">

        {/* Header */}
        <div className="space-y-4">
          <Link
            href={`/${params.locale}/sales/pricing-rules`}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to pricing rules
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-white rounded-lg flex items-center justify-center border border-slate-200">
              <Settings className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              {params.ruleId !== 'new' && (
                <Badge variant="outline" className="text-xs font-normal text-slate-500 border-slate-200 mb-1.5">
                  ID: {params.ruleId.slice(0, 8)}
                </Badge>
              )}
              <h1 className="text-xl font-semibold text-slate-900">
                {params.ruleId === 'new' ? 'Create pricing rule' : 'Edit pricing rule'}
              </h1>
            </div>
          </div>
        </div>

        {/* Builder */}
        <div className="rounded-lg overflow-hidden border border-slate-200 bg-white">
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
      </div>
    </div>
  );
}