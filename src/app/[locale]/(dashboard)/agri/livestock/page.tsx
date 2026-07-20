import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { LivestockRegistry } from '@/components/agribusiness/LivestockRegistry';

export default async function LivestockLedgerPage() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    const { data: { user } } = await supabase.auth.getUser();
    const { data: emp } = await supabase.from('employees').select('business_id').eq('user_id', user?.id).single();

    return (
        <div className="flex-1 p-6 md:p-10 bg-[#F8FAFC]">
            <div className="mb-10">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Biological Asset Ledger</h1>
                    <p className="text-slate-500 text-sm font-medium italic">
                        Individual ID tracking, genealogy, and medical history for livestock.
                    </p>
                </div>
            </div>

            <LivestockRegistry businessId={emp?.business_id} />
        </div>
    );
}