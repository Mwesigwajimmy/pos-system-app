import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import BudgetManager from "@/components/management/BudgetManager";
// CORRECTED IMPORT: Get the Account type from your new central types file.
import { Account } from '@/lib/types';

export const metadata = {
  title: "Budget Command Center",
  description: "Strategic financial planning and real-time performance analysis.",
};

async function getAccounts(supabase: any): Promise<Account[]> {
    const { data, error } = await supabase
        .from('accounts')
        .select('id, name, type')
        .order('name');
    
    if (error) {
        console.error("Error fetching accounts for budget modal:", error);
        return [];
    }
    return data;
}

export default async function BudgetsPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const accounts = await getAccounts(supabase);
    
    return <BudgetManager initialAccounts={accounts} />;
}