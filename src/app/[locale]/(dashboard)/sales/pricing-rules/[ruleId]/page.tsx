import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PricingRuleBuilder } from '@/components/sales/PricingRuleBuilder';
import { 
    ChevronLeft, 
    Cpu, 
    Globe,
    Zap,
    Lock,
    Activity,
    Database,
    ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export const metadata: Metadata = {
  title: 'Rule Configuration | Pricing Intelligence Builder',
  description: 'Design and deploy automated pricing logic for multi-tenant retail operations.',
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
        // FIXED: Added 'price' to the selection to satisfy the TypeScript interface
        supabase.from('products').select('id, name, price').eq('business_id', businessId).eq('is_active', true).order('name'),
        supabase.from('locations').select('id, name').eq('business_id', businessId).order('name')
    ]);

    if (params.ruleId !== 'new' && (ruleResult.error || !ruleResult.data)) {
        return notFound();
    }

    const ruleData = ruleResult.data;

    return (
        <div className="flex-1 space-y-6 md:space-y-8 p-4 md:p-8 lg:p-10 bg-[#f8fafc] min-h-screen">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="space-y-3">
                    <Link 
                        href={`/${params.locale}/sales/pricing-rules`} 
                        className="group inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-blue-600 transition-colors"
                    >
                        <div className="p-1.5 bg-white border border-slate-200 rounded-lg group-hover:border-blue-300 transition-all">
                            <ChevronLeft className="w-3 h-3" /> 
                        </div>
                        Back to Execution Cluster
                    </Link>
                    
                    <div className="flex items-center gap-4">
                        <div className="p-3.5 bg-white shadow-sm border border-slate-200 rounded-2xl">
                            <Cpu className="w-7 h-7 text-blue-600" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-[10px] font-mono border-slate-200 bg-white px-2">
                                    {params.ruleId === 'new' ? 'INIT_NODE' : `REF: ${params.ruleId.slice(0, 8)}`}
                                </Badge>
                                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-emerald-600">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Write Access Ready
                                </span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                                {params.ruleId === 'new' ? 'Initialize Logic Node' : 'Edit Configuration'}
                            </h1>
                        </div>
                    </div>
                </div>

                <div className="hidden xl:flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex flex-col items-end px-4 border-r border-slate-100">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Zone</span>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                            <Globe className="w-3.5 h-3.5 text-blue-500" /> Global
                        </div>
                    </div>
                    <div className="flex flex-col items-end px-4">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Operator</span>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                            <Lock className="w-3.5 h-3.5 text-emerald-500" /> {user.email?.split('@')[0]}
                        </div>
                    </div>
                    <div className="p-2.5 bg-slate-900 rounded-xl">
                        <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                    </div>
                </div>
            </div>

            <Separator className="bg-slate-200" />

            <div className="bg-white border border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 flex items-center justify-between px-6 py-3.5">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-100" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logic Configuration Matrix</span>
                    <div className="w-12" /> 
                </div>
                
                <div className="p-4 md:p-10">
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
            
            <footer className="mt-12 py-8 flex flex-col items-center gap-6">
                <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm max-w-xl w-full">
                    <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest text-center leading-relaxed">
                        Authorized Identity: <span className="text-slate-800">{user.email}</span> <br />
                        Tenant Node: <span className="text-slate-800 font-mono tracking-normal">{businessId}</span>
                    </p>
                </div>
            </footer>
        </div>
    );
}