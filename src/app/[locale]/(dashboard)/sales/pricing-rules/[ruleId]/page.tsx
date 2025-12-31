import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PricingRuleBuilder } from '@/components/sales/PricingRuleBuilder';
import { ChevronLeft, ShieldCheck, Database } from 'lucide-react';
import Link from 'next/link';

// Added Enterprise Metadata
export const metadata: Metadata = {
  title: 'Rule Configuration | Pricing Intelligence Builder',
  description: 'Design and deploy automated pricing logic for multi-tenant retail operations.',
};

interface PageProps {
    params: { locale: string, ruleId: string } 
}

/**
 * Enterprise Rule Builder Page
 */
export default async function RuleBuilderPage({ params }: PageProps) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. AUTH & TENANT RESOLUTION
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${params.locale}/login`);

    // Fetch business_id and primary currency for the tenant
    const { data: profile } = await supabase
        .from('profiles')
        .select('business_id, currency')
        .eq('id', user.id)
        .single();

    if (!profile?.business_id) redirect(`/${params.locale}/setup`);
    
    const businessId = profile.business_id;
    // Provide a robust list of currencies for the enterprise selector
    const supportedCurrencies = ['USD', 'UGX', 'EUR', 'GBP', 'KES', 'TZS', 'ZAR'];

    // 2. DATA FETCHING (DEEP TREE FETCH)
    let ruleData = null;
    
    if (params.ruleId !== 'new') {
        const { data, error } = await supabase
            .from('pricing_rules')
            .select(`
                *, 
                conditions:pricing_rule_conditions(*), 
                actions:pricing_rule_actions(*)
            `)
            .eq('id', params.ruleId)
            .eq('tenant_id', businessId) // Strict Multi-tenant Security
            .single();
        
        if (error || !data) {
            console.error("Critical System Sync Error:", error);
            return notFound();
        }
        ruleData = data;
    }

    // 3. FULL SYSTEM SYNCHRONIZATION (Parallel Data Load for Performance)
    const [customersRes, productsRes, locationsRes] = await Promise.all([
        supabase
            .from('customers')
            .select('id, name')
            .eq('business_id', businessId)
            .eq('is_active', true)
            .order('name'),
        supabase
            .from('products')
            .select('id, name')
            .eq('business_id', businessId)
            .eq('is_active', true)
            .order('name'),
        supabase
            .from('locations')
            .select('id, name')
            .eq('business_id', businessId)
            .order('name')
    ]);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-slate-50/30 min-h-screen">
            {/* --- Professional Navigation & Header --- */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div className="flex flex-col gap-1">
                    <Link 
                        href={`/${params.locale}/sales/pricing-rules`} 
                        className="group text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors font-bold uppercase tracking-wider"
                    >
                        <ChevronLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" /> 
                        Return to Pricing Engine
                    </Link>
                    <h1 className="text-3xl font-black tracking-tight uppercase italic text-slate-900">
                        {params.ruleId === 'new' ? 'Initialize New Logic' : 'Edit Rule Configuration'}
                    </h1>
                </div>
                
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border shadow-sm">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1">
                        <Database className="w-3 h-3" /> System Live
                    </span>
                </div>
            </div>

            {/* --- Fully Synchronized Enterprise Builder --- */}
            {/* FIXED: Passing missing props 'currencies' and 'tenantId' */}
            <PricingRuleBuilder 
                initialData={ruleData} 
                customers={customersRes.data || []} 
                products={productsRes.data || []} 
                locations={locationsRes.data || []} 
                currencies={supportedCurrencies}
                tenantId={businessId}
            />
            
            {/* Enterprise Audit Footer */}
            <div className="flex flex-col items-center justify-center gap-2 mt-12 py-6 border-t border-slate-200/50 opacity-40">
                <ShieldCheck className="w-6 h-6 text-slate-400" />
                <div className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] text-center">
                    Secure Session: {user.email} <br />
                    Node Protocol: {businessId}
                </div>
            </div>
        </div>
    );
}