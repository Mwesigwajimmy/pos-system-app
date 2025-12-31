'use server';

import React from 'react';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PricingRuleBuilder } from '@/components/sales/PricingRuleBuilder';
import { ChevronLeft, ShieldCheck, Database } from 'lucide-react';
import Link from 'next/link';

/**
 * Enterprise Rule Builder Page
 * 
 * FULLY CONNECTED: Links Sales Pricing logic to Multi-Tenant Business Profiles,
 * Customer segments, Product catalogs, and Inventory Locations.
 */
export default async function RuleBuilderPage({ 
    params 
}: { 
    params: { locale: string, ruleId: string } 
}) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. AUTH & TENANT RESOLUTION (SYSTEM-WIDE CONNECTIVITY)
    // Ensures strict data isolation - users only access data belonging to their Business Node.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${params.locale}/login`);

    const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

    if (!profile?.business_id) redirect(`/${params.locale}/setup`);
    const businessId = profile.business_id;

    // 2. DATA FETCHING (INTEGRATED & SECURE)
    // For existing rules, we fetch the deep tree (Conditions + Actions) in one trip.
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

    // 3. FULL SYSTEM SYNCHRONIZATION (Parallel Data Load)
    // Fetches essential metadata to populate the builder's dynamic logic triggers.
    // Includes LOCATIONS to enable Location-based pricing logic.
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
            .from('locations') // Connection to the Inventory Locations table
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
            {/* We pass Initial Data, Customers, Products, and LOCATIONS to enable multi-scope rules */}
            <PricingRuleBuilder 
                initialData={ruleData} 
                customers={customersRes.data || []} 
                products={productsRes.data || []} 
                locations={locationsRes.data || []} 
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