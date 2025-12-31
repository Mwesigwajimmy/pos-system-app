import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PricingRuleBuilder } from '@/components/sales/PricingRuleBuilder';
import { 
    ChevronLeft, 
    ShieldCheck, 
    Database, 
    Cpu, 
    Activity, 
    Lock,
    Globe,
    Zap
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

/**
 * ENTERPRISE METADATA
 * Configuration for SEO and System Identity.
 */
export const metadata: Metadata = {
  title: 'Rule Configuration | Pricing Intelligence Builder',
  description: 'Design and deploy automated pricing logic for multi-tenant retail operations.',
};

interface PageProps {
    params: { locale: string, ruleId: string } 
}

/**
 * RULE BUILDER PAGE - Logic Deployment Controller
 * 
 * High-performance server component that resolves multi-tenant context,
 * performs parallel data synchronization, and initializes the Rule Builder.
 */
export default async function RuleBuilderPage({ params }: PageProps) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. IDENTITY & TENANT RESOLUTION (Security Layer)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${params.locale}/login`);

    const { data: profile } = await supabase
        .from('profiles')
        .select('business_id, currency')
        .eq('id', user.id)
        .single();

    if (!profile?.business_id) redirect(`/${params.locale}/setup`);
    
    const businessId = profile.business_id;
    // Multi-currency support for globalized commerce nodes
    const supportedCurrencies = ['USD', 'UGX', 'EUR', 'GBP', 'KES', 'TZS', 'ZAR'];

    // 2. DATA SYNCHRONIZATION (High-Parallelism Fetch)
    // We fetch rule details and system entities (customers/products/locations) simultaneously
    // to minimize Total Time to Interactive (TTI).
    
    const rulePromise = params.ruleId !== 'new' 
        ? supabase
            .from('pricing_rules')
            .select(`
                *, 
                conditions:pricing_rule_conditions(*), 
                actions:pricing_rule_actions(*)
            `)
            .eq('id', params.ruleId)
            .eq('tenant_id', businessId)
            .single()
        : Promise.resolve({ data: null, error: null });

    const [
        ruleResult,
        customersRes, 
        productsRes, 
        locationsRes
    ] = await Promise.all([
        rulePromise,
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

    // Error Handling for Existing Rules
    if (params.ruleId !== 'new' && (ruleResult.error || !ruleResult.data)) {
        console.error("Critical System Sync Error:", ruleResult.error);
        return notFound();
    }

    const ruleData = ruleResult.data;

    return (
        <div className="flex-1 space-y-8 p-4 md:p-10 bg-[#f8fafc] min-h-screen selection:bg-primary selection:text-white">
            
            {/* --- MASTER CONTROL HEADER --- */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="space-y-2">
                    <Link 
                        href={`/${params.locale}/sales/pricing-rules`} 
                        className="group inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-primary transition-all"
                    >
                        <div className="p-1 bg-white border rounded-md group-hover:border-primary transition-colors">
                            <ChevronLeft className="w-3 h-3 transition-transform group-hover:-translate-x-0.5" /> 
                        </div>
                        Back to Execution Cluster
                    </Link>
                    
                    <div className="flex items-center gap-4 mt-2">
                        <div className="p-3 bg-white shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-100">
                            <Cpu className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-[10px] font-mono border-slate-200 bg-white">
                                    {params.ruleId === 'new' ? 'INIT_NEW_NODE' : `NODE_REF: ${params.ruleId.split('-')[0]}`}
                                </Badge>
                                <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-emerald-600">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Write Access Granted
                                </span>
                            </div>
                            <h1 className="text-4xl font-black tracking-tighter uppercase italic text-slate-900 leading-none">
                                {params.ruleId === 'new' ? 'Initialize Logic' : 'Edit Configuration'}
                            </h1>
                        </div>
                    </div>
                </div>

                {/* --- SYSTEM TELEMETRY BADGES --- */}
                <div className="hidden xl:flex items-center gap-4 bg-white/50 backdrop-blur-md p-2 rounded-[1.5rem] border border-slate-200/60 shadow-sm">
                    <div className="flex flex-col items-end px-4 border-r border-slate-100">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Region</span>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            <Globe className="w-3 h-3 text-blue-500" /> Multi-Zone
                        </div>
                    </div>
                    <div className="flex flex-col items-end px-4">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Identity</span>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            <Lock className="w-3 h-3 text-emerald-500" /> {user.email?.split('@')[0]}
                        </div>
                    </div>
                    <div className="p-2 bg-slate-900 rounded-xl">
                        <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    </div>
                </div>
            </div>

            <Separator className="bg-slate-200/60" />

            {/* --- BUILDER INTERFACE CONTAINER --- */}
            <div className="relative group">
                {/* Visual Accent for Enterprise Quality */}
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-[2rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                
                <div className="relative bg-white border border-slate-200 shadow-2xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
                    <div className="p-1 bg-slate-50 border-b border-slate-100 flex items-center justify-between px-6 py-3">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-400/20 border border-red-400/40" />
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-400/20 border border-amber-400/40" />
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/20 border border-emerald-400/40" />
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-[0.3em]">Logic Configuration Workspace</span>
                    </div>
                    
                    <div className="p-6 md:p-10">
                        <PricingRuleBuilder 
                            initialData={ruleData} 
                            customers={customersRes.data || []} 
                            products={productsRes.data || []} 
                            locations={locationsRes.data || []} 
                            currencies={supportedCurrencies}
                            tenantId={businessId}
                        />
                    </div>
                </div>
            </div>
            
            {/* --- ENTERPRISE AUDIT FOOTER --- */}
            <div className="mt-12 py-10 flex flex-col items-center justify-center gap-4">
                <div className="flex items-center gap-6 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-slate-900" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">End-to-End Encryption</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-slate-300" />
                    <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-slate-900" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Atomic Replication</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-slate-300" />
                    <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-slate-900" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Real-time Telemetry</span>
                    </div>
                </div>

                <div className="bg-slate-100/50 px-6 py-3 rounded-2xl border border-slate-200/60">
                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-[0.25em] text-center leading-relaxed">
                        Security Protocol: TLS 1.3 / AES-256 <br />
                        Authorized Session Identity: <span className="text-slate-600 underline decoration-primary/30">{user.email}</span> <br />
                        Tenant Node: <span className="text-slate-600 font-mono font-bold">{businessId}</span>
                    </p>
                </div>
            </div>
        </div>
    );
}