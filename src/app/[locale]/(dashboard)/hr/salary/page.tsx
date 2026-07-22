import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SalaryManager } from '@/components/hr/SalaryManager';
import { ShieldCheck, Users, Banknote } from 'lucide-react';

/**
 * BBU1 SOVEREIGN LABOR REGISTRY - V10.9
 * ROUTE: /hr/salary
 * 
 * This page resolves the business node identity and serves the authoritative 
 * compensation management engine for NIM Paints personnel.
 */
export default async function SalaryRegistryPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // 1. IDENTITY RESOLUTION: Ensure valid system session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // 2. CONTEXT FETCH: Anchor the session to the NIM Paints business node
    const { data: operator } = await supabase
        .from('profiles')
        .select('business_id, tenant_id')
        .eq('id', user.id)
        .single();

    // ERROR SHIELD: Prevents unauthorized ledger access
    if (!operator || !operator.business_id) {
        return (
            <div className="h-full flex items-center justify-center p-8 bg-slate-50 min-h-screen">
                <div className="bg-white border border-red-100 p-10 rounded-[32px] text-center max-w-lg shadow-2xl shadow-red-100/50 animate-in fade-in zoom-in duration-500">
                    <div className="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mx-auto mb-6">
                        <ShieldCheck className="h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Authoritative Handshake Refused</h3>
                    <p className="text-slate-500 text-sm font-medium mt-3 leading-relaxed">
                        Your identity profile is not anchored to a verified business node. 
                        Please contact the system administrator to seal your node connection.
                    </p>
                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">BBU1 Global Security Kernel</p>
                    </div>
                </div>
            </div>
        );
    }

    // 3. PERSONNEL REGISTRY FETCH: Get all active personnel for this business node
    // This populates the dropdown lists in the SalaryManager component.
    const { data: employees } = await supabase
        .from('employees')
        .select('id, full_name')
        .eq('business_id', operator.business_id)
        .eq('is_active', true)
        .order('full_name', { ascending: true });

    return (
        <div className="flex-1 space-y-8 p-4 md:p-10 pt-8 bg-slate-50/50 min-h-screen animate-in fade-in duration-700">
            
            {/* ENTERPRISE BREADCRUMB */}
            <div className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                <div className="h-4 w-4 bg-slate-200 rounded flex items-center justify-center text-slate-500 font-bold">HR</div>
                <span>/</span>
                <span className="text-blue-600">Personnel Salary Registry</span>
            </div>

            {/* HEADER: OPERATIONAL CONTROL */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-10">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-900 rounded-xl text-white">
                            <Banknote className="h-6 w-6" />
                        </div>
                        <h2 className="text-4xl font-black tracking-tight text-slate-900 uppercase">Wage & Salary Control</h2>
                    </div>
                    <p className="text-slate-500 text-base font-medium max-w-xl">
                        Authoritative management of base compensation contracts and variable labor flux (Commissions & Bonuses).
                    </p>
                </div>
                
                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Connected node</span>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                            <Users className="h-4 w-4 text-blue-600" />
                            <span className="text-xs font-black text-slate-700 uppercase">{(employees?.length || 0)} PERSONNEL DETECTED</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* THE SOVEREIGN ENGINE COMPONENT */}
            {/* 
                We pass the validated businessId and the pre-fetched personnel registry 
                to ensure zero latency in the UI dropdowns.
            */}
            <SalaryManager 
                businessId={operator.business_id} 
                employees={employees || []} 
            />

            {/* FORENSIC SYSTEM FOOTER */}
            <div className="mt-12 flex flex-col items-center gap-4 py-10 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-700">
                <div className="flex items-center gap-3">
                    <div className="h-[1px] w-24 bg-slate-300" />
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-blue-600" />
                        <span className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900">BBU1 Sovereign Identity Sealed</span>
                    </div>
                    <div className="h-[1px] w-24 bg-slate-300" />
                </div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Global Administrative Data Sync Active | Secure Ledger Tunnel Established</p>
            </div>
        </div>
    );
}