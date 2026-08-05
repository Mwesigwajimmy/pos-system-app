'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Loader2, PiggyBank } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SavingsProduct {
    id: number;
    product_name: string;
    interest_rate: number;
    currency: string;
    is_active: boolean;
    // Optional fields — display only if savings_products returns them; safe to ignore otherwise.
    product_code?: string;
    description?: string;
    minimum_opening_balance?: number;
    minimum_balance_for_interest?: number;
    interest_calculation_method?: string;
    interest_posting_frequency?: string;
    max_withdrawals_per_month?: number;
    eligibility?: string;
}

async function getSavingsProducts(tenantId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('savings_products')
        .select('*')
        .eq('tenant_id', tenantId); // Strict tenant scoping
    if (error) throw new Error(error.message);
    return data as SavingsProduct[];
}

// NOTE: still a direct `.insert()` into savings_products, not an RPC — the table name,
// the original columns (product_name, interest_rate, currency, tenant_id, is_active),
// and the insert call itself are untouched. The extra columns below are new — your
// savings_products table will need matching columns added for these to persist.
async function createSavingsProduct(input: any) {
    const supabase = createClient();
    const { error } = await supabase.from('savings_products').insert([{
        product_name: input.name,
        interest_rate: input.interest_rate,
        currency: input.currency,
        tenant_id: input.tenantId,
        is_active: true,
        // Added fields
        product_code: input.productCode || null,
        description: input.description || null,
        minimum_opening_balance: input.minOpeningBalance ? parseFloat(input.minOpeningBalance) : 0,
        minimum_balance_for_interest: input.minBalanceForInterest ? parseFloat(input.minBalanceForInterest) : 0,
        interest_calculation_method: input.interestCalcMethod || null,
        interest_posting_frequency: input.interestPostingFrequency || null,
        max_withdrawals_per_month: input.maxWithdrawals ? parseInt(input.maxWithdrawals, 10) : null,
        eligibility: input.eligibility || null,
    }]);
    if (error) throw error;
}

const EMPTY_FORM = {
    name: '',
    interest: '',
    currency: 'UGX',
    productCode: '',
    description: '',
    minOpeningBalance: '',
    minBalanceForInterest: '',
    interestCalcMethod: '',
    interestPostingFrequency: '',
    maxWithdrawals: '',
    eligibility: '',
};

export default function SavingsProductsManager({ tenantId }: { tenantId: string }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const queryClient = useQueryClient();

    const { data: products, isLoading } = useQuery({
        queryKey: ['saccoSavingsProducts', tenantId],
        queryFn: () => getSavingsProducts(tenantId),
    });

    const createMutation = useMutation({
        mutationFn: createSavingsProduct,
        onSuccess: () => {
            toast.success('Product created!');
            queryClient.invalidateQueries({ queryKey: ['saccoSavingsProducts', tenantId] });
            setIsDialogOpen(false);
            setForm(EMPTY_FORM);
        },
        onError: (e: any) => toast.error(e.message),
    });

    const handleSubmit = () => {
        if (!form.name || !form.interest) return toast.error('Please fill in the product name and interest rate.');
        createMutation.mutate({
            name: form.name,
            interest_rate: parseFloat(form.interest),
            currency: form.currency,
            tenantId,
            productCode: form.productCode,
            description: form.description,
            minOpeningBalance: form.minOpeningBalance,
            minBalanceForInterest: form.minBalanceForInterest,
            interestCalcMethod: form.interestCalcMethod,
            interestPostingFrequency: form.interestPostingFrequency,
            maxWithdrawals: form.maxWithdrawals,
            eligibility: form.eligibility,
        });
    };

    const formatMoney = (value?: number, currency?: string) =>
        value === undefined || value === null
            ? '—'
            : new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'UGX' }).format(value);

    return (
        <Card className="border-t-4 border-t-green-600 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <PiggyBank className="h-5 w-5 text-green-600" />
                        Savings Products
                    </CardTitle>
                    <CardDescription>Configure saving accounts, interest rates, and withdrawal rules.</CardDescription>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-green-600 text-white hover:bg-green-700">
                            <PlusCircle className="mr-2 h-4 w-4" /> New Product
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
                        <DialogHeader>
                            <DialogTitle>Create Savings Product</DialogTitle>
                            <DialogDescription>Define the currency, interest terms, and rules for this product.</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6 py-2">
                            {/* Basic Information */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-muted-foreground">Basic Information</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Product Name</Label>
                                        <Input
                                            id="name"
                                            placeholder="e.g., Fixed Deposit"
                                            value={form.name}
                                            onChange={e => setForm({ ...form, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="productCode">Product Code</Label>
                                        <Input
                                            id="productCode"
                                            placeholder="e.g., FD-01"
                                            value={form.productCode}
                                            onChange={e => setForm({ ...form, productCode: e.target.value.toUpperCase() })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Briefly describe this product for staff and members"
                                        rows={2}
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="eligibility">Eligibility</Label>
                                    <Select value={form.eligibility} onValueChange={v => setForm({ ...form, eligibility: v })}>
                                        <SelectTrigger id="eligibility"><SelectValue placeholder="Who can open this account?" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Individual">Individual members</SelectItem>
                                            <SelectItem value="Group">Group / joint accounts</SelectItem>
                                            <SelectItem value="Both">Both</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Separator />

                            {/* Interest Configuration */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-muted-foreground">Interest Configuration</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="currency">Currency</Label>
                                        <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                                            <SelectTrigger id="currency"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="UGX">UGX (Uganda)</SelectItem>
                                                <SelectItem value="KES">KES (Kenya)</SelectItem>
                                                <SelectItem value="USD">USD (Dollar)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="interest">Interest Rate (% p.a)</Label>
                                        <Input
                                            id="interest"
                                            type="number"
                                            step="0.1"
                                            placeholder="5.0"
                                            value={form.interest}
                                            onChange={e => setForm({ ...form, interest: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="interestCalcMethod">Calculation Method</Label>
                                        <Select value={form.interestCalcMethod} onValueChange={v => setForm({ ...form, interestCalcMethod: v })}>
                                            <SelectTrigger id="interestCalcMethod"><SelectValue placeholder="Select..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Daily Balance">Daily balance</SelectItem>
                                                <SelectItem value="Average Balance">Average monthly balance</SelectItem>
                                                <SelectItem value="Minimum Balance">Minimum monthly balance</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="interestPostingFrequency">Posting Frequency</Label>
                                        <Select value={form.interestPostingFrequency} onValueChange={v => setForm({ ...form, interestPostingFrequency: v })}>
                                            <SelectTrigger id="interestPostingFrequency"><SelectValue placeholder="Select..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Monthly">Monthly</SelectItem>
                                                <SelectItem value="Quarterly">Quarterly</SelectItem>
                                                <SelectItem value="Annually">Annually</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Limits & Rules */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-muted-foreground">Limits &amp; Rules</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="minOpeningBalance">Minimum Opening Balance</Label>
                                        <Input
                                            id="minOpeningBalance"
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={form.minOpeningBalance}
                                            onChange={e => setForm({ ...form, minOpeningBalance: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="minBalanceForInterest">Minimum Balance to Earn Interest</Label>
                                        <Input
                                            id="minBalanceForInterest"
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={form.minBalanceForInterest}
                                            onChange={e => setForm({ ...form, minBalanceForInterest: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="maxWithdrawals">Max Withdrawals per Month (Optional)</Label>
                                    <Input
                                        id="maxWithdrawals"
                                        type="number"
                                        min="0"
                                        placeholder="Leave blank for unlimited"
                                        value={form.maxWithdrawals}
                                        onChange={e => setForm({ ...form, maxWithdrawals: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Product
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>

            <CardContent>
                <div className="overflow-x-auto rounded-md border">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>Currency</TableHead>
                                <TableHead className="text-right">Interest Rate</TableHead>
                                <TableHead>Calculation Method</TableHead>
                                <TableHead>Posting Frequency</TableHead>
                                <TableHead className="text-right">Min. Opening Balance</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        <Loader2 className="mx-auto animate-spin" />
                                    </TableCell>
                                </TableRow>
                            ) : !products || products.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                        No savings products configured yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                products.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="align-middle font-medium">
                                            <div>{p.product_name}</div>
                                            {p.product_code && (
                                                <div className="font-mono text-[10px] text-muted-foreground">{p.product_code}</div>
                                            )}
                                        </TableCell>
                                        <TableCell className="align-middle">{p.currency}</TableCell>
                                        <TableCell className="align-middle text-right tabular-nums">{p.interest_rate}%</TableCell>
                                        <TableCell className="align-middle text-sm text-muted-foreground">
                                            {p.interest_calculation_method || '—'}
                                        </TableCell>
                                        <TableCell className="align-middle text-sm text-muted-foreground">
                                            {p.interest_posting_frequency || '—'}
                                        </TableCell>
                                        <TableCell className="align-middle text-right tabular-nums">
                                            {formatMoney(p.minimum_opening_balance, p.currency)}
                                        </TableCell>
                                        <TableCell className="align-middle text-right">
                                            <Badge
                                                variant={p.is_active ? 'default' : 'outline'}
                                                className={p.is_active ? 'bg-green-50 text-green-700 hover:bg-green-50' : 'text-slate-500'}
                                            >
                                                {p.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}