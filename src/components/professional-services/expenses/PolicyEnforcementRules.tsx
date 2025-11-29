'use client';

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { ShieldAlert, Trash2, Plus, Loader2 } from "lucide-react";

interface TenantContext { tenantId: string }

interface ExpensePolicy {
    id: string;
    category: string;
    limit_amount: number;
    rule_type: 'MAX_LIMIT' | 'WARNING_LIMIT';
}

async function fetchRules(tenantId: string) {
    const db = createClient();
    const { data, error } = await db.from('expense_policies').select('*').eq('tenant_id', tenantId);
    if (error) throw error; 
    return data as ExpensePolicy[];
}

async function addRule(input: any) {
    const db = createClient();
    const { error } = await db.from('expense_policies').insert([input]);
    if (error) throw error;
}

async function deleteRule(id: string) {
    const db = createClient();
    const { error } = await db.from('expense_policies').delete().eq('id', id);
    if (error) throw error;
}

export default function PolicyEnforcementRules({ tenant }: { tenant: TenantContext }) {
    const queryClient = useQueryClient();
    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'MAX_LIMIT' | 'WARNING_LIMIT'>('MAX_LIMIT');

    const { data, isLoading } = useQuery({ 
        queryKey: ['expense-rules', tenant.tenantId], 
        queryFn: () => fetchRules(tenant.tenantId) 
    });

    const addMutation = useMutation({
        mutationFn: () => addRule({ 
            category, 
            limit_amount: parseFloat(amount), 
            rule_type: type, 
            tenant_id: tenant.tenantId 
        }),
        onSuccess: () => {
            toast.success('Policy rule added');
            setCategory('');
            setAmount('');
            queryClient.invalidateQueries({ queryKey: ['expense-rules', tenant.tenantId] });
        },
        onError: (e) => toast.error(e.message || 'Failed to add rule')
    });

    const deleteMutation = useMutation({
        mutationFn: deleteRule,
        onSuccess: () => {
            toast.success('Rule removed');
            queryClient.invalidateQueries({ queryKey: ['expense-rules', tenant.tenantId] });
        }
    });

    return (
        <Card className="h-full border-t-4 border-t-red-600 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-600"/> Policy Enforcement
                </CardTitle>
                <CardDescription>Set automatic limits and warnings for expense categories.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                
                {/* Add Rule Form */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-3 bg-slate-50 rounded-lg border">
                    <Input 
                        placeholder="Category (e.g. Meals)" 
                        value={category} 
                        onChange={e => setCategory(e.target.value)}
                        className="bg-white"
                    />
                    <Input 
                        placeholder="Limit Amount" 
                        type="number" 
                        value={amount} 
                        onChange={e => setAmount(e.target.value)}
                        className="bg-white"
                    />
                    <Select value={type} onValueChange={(v: any) => setType(v)}>
                        <SelectTrigger className="bg-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="MAX_LIMIT">Block &gt; Limit</SelectItem>
                            <SelectItem value="WARNING_LIMIT">Warn &gt; Limit</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={() => addMutation.mutate()} disabled={!category || !amount || addMutation.isPending}>
                        {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4 mr-2"/>} Add
                    </Button>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead>Category</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Limit</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto animate-spin"/></TableCell></TableRow>
                            ) : !data || data.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No active policies.</TableCell></TableRow>
                            ) : (
                                data.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell className="font-medium">{r.category}</TableCell>
                                        <TableCell>
                                            <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${
                                                r.rule_type === 'MAX_LIMIT' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                                {r.rule_type === 'MAX_LIMIT' ? 'BLOCK' : 'WARN'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">{r.limit_amount}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => deleteMutation.mutate(r.id)}>
                                                <Trash2 className="w-4 h-4"/>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}