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

    const { data: profile } = await supabase
        .from("user_profiles")
        .select("active_organization_slug")
        .eq("user_id", user.id)
        .single();

    const activeSlug = profile?.active_organization_slug;

    // Fetch Real Tax Totals from the Engine
    const { data: reportData } = await supabase.rpc('generate_tax_report', { 
        p_start_date: '2024-01-01', 
        p_end_date: '2024-12-31',
        p_entity_id: user.id // Assuming RPC uses user/org ID
    }).single();

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between border-b pb-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Calculator className="h-6 w-6 text-blue-600" />
                        Sales Tax Intelligence
                    </h2>
                    <p className="text-muted-foreground">
                        High-precision jurisdictional tax analysis.
                    </p>
                </div>
                <Globe className="h-8 w-8 text-slate-200" />
            </div>
            
            <RevolutionarySalesTaxDashboard 
                summary={{
                    total_revenue: reportData?.taxable_sales || 0,
                    total_taxable_revenue: reportData?.taxable_sales || 0,
                    total_tax_collected: reportData?.tax_liability || 0
                }}
                transactions={[]} // Can be fetched separately if needed for large datasets
                reportPeriod="Fiscal Year 2024"
                currency="UGX"
            />
        </div>
    );
}