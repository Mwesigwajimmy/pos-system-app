import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PricingRuleBuilder } from '@/components/sales/PricingRuleBuilder';
import { 
    ChevronLeft, Globe, ShieldCheck, Fingerprint, Activity, Terminal, Shield
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
        <div className="flex-1 space-y-0 bg-[#F8FAFC] min-h-screen font-sans">
            
            {/* SYSTEM STATUS RIBBON (ORACLE-STYLE) */}
            <div className="bg-slate-900 text-white px-6 py-2 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Terminal className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-400">System_Session:</span>
                        <span className="text-[10px] font-mono text-emerald-400">ACTIVE_ENCRYPTED</span>
                    </div>
                    <Separator orientation="vertical" className="h-3 bg-white/20" />
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-400">Tenant_ID:</span>
                        <span className="text-[10px] font-mono text-white">{businessId.slice(0, 12).toUpperCase()}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black tracking-widest uppercase">Global Cluster 01</span>
                </div>
            </div>

            <div className="p-6 md:p-10 space-y-8 max-w-[1600px] mx-auto">
                
                {/* COMMAND HEADER */}
                <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6">
                    <div className="space-y-6">
                        <Link 
                            href={`/${params.locale}/sales/pricing-rules`} 
                            className="group inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-indigo-600 transition-all"
                        >
                            <ChevronLeft className="w-3 h-3 stroke-[3px]" /> 
                            Return to Logic Inventory
                        </Link>
                        
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-slate-200 border-2 border-slate-100 relative">
                                <ShieldCheck className="w-10 h-10 text-slate-900" />
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                                    <Shield className="w-3 h-3 text-white" />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <Badge className="bg-slate-900 text-white border-none text-[10px] font-black tracking-[0.15em] px-3 py-0.5 rounded-sm">
                                        {params.ruleId === 'new' ? 'CMD_INIT' : `ENTITY_ID: ${params.ruleId.toUpperCase()}`}
                                    </Badge>
                                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        <Fingerprint className="w-3.5 h-3.5 text-indigo-500" />
                                        Verified Auth
                                    </span>
                                </div>
                                <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">
                                    {params.ruleId === 'new' ? 'Initialize Pricing Logic' : 'Modify Core Strategy'}
                                </h1>
                            </div>
                        </div>
                    </div>

                    {/* DIAGNOSTIC CONTEXT PANEL */}
                    <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-sm min-w-[320px]">
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Operational Hub</span>
                                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-800">
                                    <Globe className="w-3.5 h-3.5 text-indigo-500" /> {params.locale.toUpperCase()} / GLOBAL
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Administrator</span>
                                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-800 uppercase">
                                    {user.email?.split('@')[0]}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <Separator className="bg-slate-200" />

                {/* MAIN BUILDER SURFACE */}
                <div className="rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-200 bg-white">
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
                
                {/* ENTERPRISE FOOTER */}
                <footer className="pt-12 pb-20">
                    <div className="flex flex-col items-center gap-6">
                        <div className="bg-slate-50 px-10 py-5 rounded-2xl border border-slate-200 flex items-center gap-12">
                            <div className="text-center">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Security_User</p>
                                <p className="text-[11px] font-bold text-slate-900">{user.email}</p>
                            </div>
                            <Separator orientation="vertical" className="h-8 bg-slate-200" />
                            <div className="text-center">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Instance_Origin</p>
                                <p className="text-[11px] font-mono font-bold text-slate-600">{businessId}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Activity className="w-3 h-3 text-indigo-500" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">
                                ENTERPRISE RESOURCE PROTOCOL © 2026
                            </p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}