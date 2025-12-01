import React from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
// Importing the component you sent earlier (ensure it is saved in components/sales)
import { PricingRuleBuilder } from '@/components/sales/PricingRuleBuilder';

export default async function RuleBuilderPage({ params }: { params: { ruleId: string } }) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. Fetch Rule Data (If editing)
    let ruleData = null;
    if (params.ruleId !== 'new') {
        const { data, error } = await supabase
            .from('pricing_rules')
            .select(`
                *, 
                conditions:pricing_rule_conditions(*), 
                actions:pricing_rule_actions(*)
            `)
            .eq('id', params.ruleId)
            .single();
        
        if (error) {
            console.error(error); // Log for debugging
            // If invalid ID, don't crash, just maybe redirect or show 404
            // notFound(); 
        }
        ruleData = data;
    }

    // 2. Fetch Dropdown Options (Customers & Products)
    // We select ID and Name to populate the SearchableCombobox
    const { data: customers } = await supabase.from('customers').select('id, name').limit(100);
    const { data: products } = await supabase.from('products').select('id, name').limit(100);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <PricingRuleBuilder 
                initialData={ruleData} 
                customers={customers || []} 
                products={products || []} 
            />
        </div>
    );
}