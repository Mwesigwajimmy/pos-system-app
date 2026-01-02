import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PricingRuleBuilder } from '@/components/sales/PricingRuleBuilder';
import { 
    ChevronLeft, Cpu, Globe, Zap, Lock, ShieldCheck 
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export const metadata: Metadata = {
  title: 'Pricing Configuration | Enterprise Manager',
  description: 'Manage and deploy professional pricing logic for global operations.',
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
        <div className="flex-1 space-y-8 p-4 md:p-8 lg:p-10 bg-slate-50/50 min-h-screen">
            
            {/* PROFESSIONAL NAVIGATION & HEADER */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="space-y-4">
                    <Link 
                        href={`/${params.locale}/sales/pricing-rules`} 
                        className="group inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" /> 
                        Back to Pricing Rules
                    </Link>
                    
                    <div className="flex items-center gap-5">
                        <div className="p-3 bg-white shadow-sm border border-slate-200 rounded-xl">
                            <ShieldCheck className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-[9px] font-bold border-slate-200 bg-white px-2 py-0">
                                    {params.ruleId === 'new' ? 'NEW_RULE' : `ID: ${params.ruleId.slice(0, 8)}`}
                                </Badge>
                                <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-slate-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    System Authenticated
                                </span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                                {params.ruleId === 'new' ? 'Create Pricing Rule' : 'Update Pricing Rule'}
                            </h1>
                        </div>
                    </div>
                </div>

                {/* USER & STATUS INFO */}
                <div className="hidden xl:flex items-center gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex flex-col items-end px-4 border-r border-slate-100">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Environment</span>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            <Globe className="w-3.5 h-3.5 text-indigo-500" /> Global Production
                        </div>
                    </div>
                    <div className="flex flex-col items-end px-4">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Administrator</span>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase">
                            {user.email?.split('@')[0]}
                        </div>
                    </div>
                </div>
            </div>

            <Separator className="bg-slate-200/60" />

            {/* BUILDER CONTAINER - Removed the "Matrix" text and dot styling for a cleaner look */}
            <div className="max-w-[1440px] mx-auto">
                <PricingRuleBuilder 
                    initialData={ruleResult.data} 
                    customers={customersRes.data || []} 
                    products={mappedProducts} 
                    locations={locationsRes.data || []} 
                    currencies={supportedCurrencies}
                    tenantId={businessId}
                />
            </div>
            
            {/* PROFESSIONAL FOOTER */}
            <footer className="mt-12 py-10 border-t border-slate-200/60">
                <div className="flex flex-col items-center gap-4">
                    <div className="bg-white px-6 py-3 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest text-center leading-loose">
                            Security Context: <span className="text-slate-800">{user.email}</span> <br />
                            Organization ID: <span className="text-slate-600 font-mono">{businessId}</span>
                        </p>
                    </div>
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em]">
                        Enterprise Pricing Engine &copy; 2026
                    </p>
                </div>
            </footer>
        </div>
    );
}