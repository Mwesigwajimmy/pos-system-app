import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { RevolutionarySalesTaxDashboard } from '@/components/compliance/RevolutionarySalesTaxDashboard';
import { Calculator, Globe } from 'lucide-react';

export default async function SalesTaxIntelligencePage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // GRASSROOT FIX: Using 'profiles' table (Verified) and 'business_id' (Verified)
    const { data: profile } = await supabase
        .from("profiles")
        .select("business_id, tenants(name, currency_code)")
        .eq("id", user.id)
        .single();

    if (!profile?.business_id) redirect('/welcome');

    const businessId = profile.business_id;
    const currency = (profile.tenants as any)?.currency_code || 'UGX';

    // GRASSROOT FETCH: Fetch Real Tax Totals linked to the Business Empire
    const { data: reportData } = await supabase.rpc('generate_tax_report', { 
        p_start_date: '2024-01-01', 
        p_end_date: '2026-12-31', // Expanded to cover our March 2026 testing
        p_entity_id: businessId     // FIXED: Passing business_id, not user_id
    });

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-slate-50/20">
            <div className="flex items-center justify-between border-b pb-6">
                <div>
                    <h2 className="text-3xl font-black tracking-tight flex items-center gap-2 text-slate-900 uppercase">
                        <Calculator className="h-8 w-8 text-blue-600" />
                        Sales Tax Intelligence
                    </h2>
                    <p className="text-muted-foreground font-medium italic">
                        High-precision jurisdictional tax analysis for {(profile.tenants as any)?.name}.
                    </p>
                </div>
                <Globe className="h-10 w-10 text-slate-200 animate-pulse" />
            </div>
            
            <RevolutionarySalesTaxDashboard 
                summary={{
                    total_revenue: reportData?.taxable_sales || 0,
                    total_taxable_revenue: reportData?.taxable_sales || 0,
                    total_tax_collected: reportData?.tax_liability || 0,
                    total_input_tax_credit: reportData?.payments_made || 0, // ADDED: New global mandate field
                    net_tax_liability: reportData?.balance_due || 0        // ADDED: New global mandate field
                }}
                transactions={[]} 
                reportPeriod="Full Operational History"
                currency={currency} // FIXED: Now dynamic from database
            />
        </div>
    );
}