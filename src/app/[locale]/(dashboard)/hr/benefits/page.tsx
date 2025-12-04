import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import BenefitsManager, { BenefitEntry } from '@/components/hr/BenefitsManager';

export default async function BenefitsPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Fetch benefits configuration
    // Assumes table 'benefits_packages'
    const { data: rawData } = await supabase
        .from('benefits_packages')
        .select('*')
        .eq('status', 'active'); // or all if you prefer

    const benefits: BenefitEntry[] = (rawData || []).map((b: any) => ({
        id: b.id,
        benefit: b.name,
        coverage: b.description,
        availableTo: b.eligibility_criteria,
        entity: b.applicable_department || 'All',
        country: b.country_code || 'Global',
        type: b.benefit_type || 'other',
        status: b.is_active ? 'offered' : 'ended',
    }));

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <h2 className="text-3xl font-bold tracking-tight">Benefits Administration</h2>
            <BenefitsManager initialBenefits={benefits} />
        </div>
    );
}