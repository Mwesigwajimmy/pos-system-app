import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { LedgerHub } from '@/components/ledger/LedgerHub';
import type { LedgerEntry } from '@/components/ledger/LedgerHub';

async function getLedgerData(supabase: any, from?: string, to?: string): Promise<LedgerEntry[]> {
    let query = supabase
        .from('general_ledger_view')
        .select('id, date, account_name, account_type, description, debit, credit, balance')
        .order('date', { ascending: false });

    if (from) {
        query = query.gte('date', from);
    }
    if (to) {
        query = query.lte('date', to);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching ledger data:", error.message);
        return [];
    }
    
    if (!data) {
        return [];
    }

    return data.map((entry: any, index: number) => ({
        ...entry,
        id: entry.id || `entry-${index}`,
    })) as LedgerEntry[];
}

export default async function LedgerPage({
    searchParams
}: {
    searchParams: { from?: string, to?: string }
}) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { from, to } = searchParams;

    const entries = await getLedgerData(supabase, from, to);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <LedgerHub entries={entries} />
        </div>
    );
}