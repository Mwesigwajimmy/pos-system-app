import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { deletePricingRule } from '@/app/actions/pricing'; // Adjust import path if needed

export default async function PricingRulesPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // REAL FETCH: Get rules with counts of conditions/actions
    const { data: rules, error } = await supabase
        .from('pricing_rules')
        .select(`*, pricing_rule_conditions(count), pricing_rule_actions(count)`)
        .order('priority', { ascending: false });

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Advanced Pricing Rules</h2>
                    <p className="text-muted-foreground">Manage automatic discounts and price lists.</p>
                </div>
                <Button asChild>
                    <Link href="/sales/pricing-rules/new">
                        <PlusCircle className="mr-2 h-4 w-4" /> New Pricing Rule
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Active Rules</CardTitle>
                    <CardDescription>Rules are processed by Priority (Higher runs first).</CardDescription>
                </CardHeader>
                <CardContent>
                    {(!rules || rules.length === 0) ? (
                        <div className="text-center py-10 text-muted-foreground">No rules found. Create one above.</div>
                    ) : (
                        <div className="rounded-md border">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="p-4 font-medium">Priority</th>
                                        <th className="p-4 font-medium">Name</th>
                                        <th className="p-4 font-medium">Status</th>
                                        <th className="p-4 font-medium">Details</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rules.map((rule: any) => (
                                        <tr key={rule.id} className="border-t hover:bg-muted/50">
                                            <td className="p-4 font-bold">{rule.priority}</td>
                                            <td className="p-4">{rule.name}</td>
                                            <td className="p-4">
                                                <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                                                    {rule.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </td>
                                            <td className="p-4 text-muted-foreground">
                                                {rule.pricing_rule_conditions[0].count} Conditions, {rule.pricing_rule_actions[0].count} Actions
                                            </td>
                                            <td className="p-4 text-right flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" asChild>
                                                    <Link href={`/sales/pricing-rules/${rule.id}`}><Edit className="h-4 w-4" /></Link>
                                                </Button>
                                                <form action={deletePricingRule.bind(null, rule.id)}>
                                                    <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                                </form>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}