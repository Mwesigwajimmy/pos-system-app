import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
// We will create this component next
import { PricingRuleBuilder } from '@/components/sales/PricingRuleBuilder';

async function getRuleDetails(supabase: any, ruleId: string) {
    if (ruleId === 'new') return null; // For creating a new rule
    const { data, error } = await supabase.from('pricing_rules')
        .select(`*, conditions:pricing_rule_conditions(*), actions:pricing_rule_actions(*)`)
        .eq('id', ruleId).single();
    if (error) notFound();
    return data;
}

// Fetch lists of customers/products for the builder's dropdowns
async function getBuilderData(supabase: any) {
    const { data: customers } = await supabase.from('customers').select('id, name');
    const { data: products } = await supabase.from('products').select('id, name');
    return { customers: customers || [], products: products || [] };
}

export default async function RuleBuilderPage({ params }: { params: { ruleId: string } }) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const rule = await getRuleDetails(supabase, params.ruleId);
    const { customers, products } = await getBuilderData(supabase);
    
    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <PricingRuleBuilder
                initialData={rule}
                customers={customers}
                products={products}
            />
        </div>
    );
}