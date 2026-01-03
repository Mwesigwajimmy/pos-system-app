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
        <div className="flex-1 space-y-0 bg-slate-50/50 min-h-screen font-sans">
            
            {/* --- SYSTEM STATUS RIBBON (ORACLE-STYLE) --- */}
            <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between border-b border-white/10 shadow-lg">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2.5">
                        <Terminal className="w-4 h-4 text-indigo-400" />
                        <span className="text-[10px] font-black tracking-[0.25em] uppercase text-slate-400">System_Session:</span>
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">ACTIVE_ENCRYPTED</span>
                    </div>
                    <Separator orientation="vertical" className="h-4 bg-white/20" />
                    <div className="flex items-center gap-2.5">
                        <span className="text-[10px] font-black tracking-[0.25em] uppercase text-slate-400">Tenant_ID:</span>
                        <span className="text-[10px] font-mono font-bold text-white tracking-wider">{businessId.slice(0, 12).toUpperCase()}</span>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    <span className="text-[10px] font-black tracking-[0.3em] uppercase text-slate-300">Global Cluster 01_SECURED</span>
                </div>
            </div>

            <div className="p-6 md:p-10 lg:p-12 space-y-10 max-w-[1600px] mx-auto">
                
                {/* --- COMMAND HEADER --- */}
                <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8">
                    <div className="space-y-6">
                        <Link 
                            href={`/${params.locale}/sales/pricing-rules`} 
                            className="group inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 hover:text-indigo-600 transition-all"
                        >
                            <ChevronLeft className="w-3.5 h-3.5 stroke-[4px] transition-transform group-hover:-translate-x-1" /> 
                            Return to Logic Inventory
                        </Link>
                        
                        <div className="flex items-center gap-8">
                            <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-200 border border-slate-100 relative group">
                                <ShieldCheck className="w-12 h-12 text-slate-900 transition-transform group-hover:scale-110" />
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg border-2 border-white">
                                    <Shield className="w-4 h-4 text-white" />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-4 mb-3">
                                    <Badge className="bg-slate-900 text-white border-none text-[10px] font-black tracking-[0.2em] px-4 py-1 rounded-md shadow-sm">
                                        {params.ruleId === 'new' ? 'CMD_INITIALIZE' : `ENTITY_ID: ${params.ruleId.toUpperCase()}`}
                                    </Badge>
                                    <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                        <Fingerprint className="w-4 h-4 text-indigo-500" />
                                        Verified Auth Protocol
                                    </span>
                                </div>
                                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 uppercase leading-none">
                                    {params.ruleId === 'new' ? 'Initialize Pricing Logic' : 'Modify Core Strategy'}
                                </h1>
                            </div>
                        </div>
                    </div>

                    {/* --- DIAGNOSTIC CONTEXT PANEL --- */}
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl shadow-slate-100/50 min-w-[340px]">
                        <div className="grid grid-cols-2 gap-10">
                            <div className="space-y-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">Operational Hub</span>
                                <div className="flex items-center gap-2.5 text-[12px] font-black text-slate-900">
                                    <Globe className="w-4 h-4 text-indigo-500" /> {params.locale.toUpperCase()} / NODE_GLOBAL
                                </div>
                            </div>
                            <div className="space-y-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">Administrator</span>
                                <div className="flex items-center gap-2.5 text-[12px] font-black text-slate-900 uppercase tracking-tight">
                                    {user.email?.split('@')[0]}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <Separator className="bg-slate-200 h-[2px]" />

                {/* --- MAIN BUILDER SURFACE --- */}
                <div className="rounded-[2.5rem] overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] border border-slate-200 bg-white">
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
                
                {/* --- ENTERPRISE FOOTER --- */}
                <footer className="pt-20 pb-24">
                    <div className="flex flex-col items-center gap-8">
                        <div className="bg-white px-12 py-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-16 transition-all hover:shadow-md">
                            <div className="text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Secured_User_Session</p>
                                <p className="text-xs font-black text-slate-900">{user.email}</p>
                            </div>
                            <Separator orientation="vertical" className="h-10 bg-slate-200" />
                            <div className="text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Instance_Origin_Hash</p>
                                <p className="text-xs font-mono font-black text-slate-600 tracking-wider">{businessId}</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-4">
                            <div className="flex items-center gap-3 bg-slate-900/5 px-4 py-2 rounded-full">
                                <Activity className="w-4 h-4 text-indigo-600" />
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.6em] ml-1">
                                    ENTERPRISE RESOURCE PROTOCOL © 2026
                                </p>
                            </div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                Version 4.2.0-stable // Encrypted End-to-End
                            </p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}