'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, DollarSign, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface TenantContext { 
    tenantId: string; 
    currency: string;
}

interface ExpenseClaim {
    id: string;
    description: string;
    amount: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
    created_at: string;
    employee_id: string; // Ideally this matches user.id
}

async function fetchClaims(tenantId: string) {
    const db = createClient();
    const { data, error } = await db
        .from('expense_claims')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
    
    if (error) throw error; 
    return data as ExpenseClaim[];
}

async function submitClaim(payload: any) {
    const db = createClient();
    const { error } = await db.from('expense_claims').insert([payload]);
    if (error) throw error;
}

export default function ExpenseClaimManager({ tenant, employeeId }: { tenant: TenantContext, employeeId: string }) {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    
    // Form State
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState<string>('');

    const { data: claims, isLoading } = useQuery({ 
        queryKey: ['claims', tenant.tenantId], 
        queryFn: () => fetchClaims(tenant.tenantId) 
    });

    const mutation = useMutation({
        mutationFn: () => submitClaim({ 
            tenant_id: tenant.tenantId,
            employee_id: employeeId, 
            description,
            amount: parseFloat(amount), 
            currency: tenant.currency, 
            status: 'PENDING' 
        }),
        onSuccess: () => { 
            toast.success('Claim submitted for approval'); 
            setIsOpen(false);
            setDescription(''); 
            setAmount(''); 
            queryClient.invalidateQueries({ queryKey: ['claims', tenant.tenantId] });
        },
        onError: (e) => toast.error(e.message || 'Submission failed')
    });

    const getStatusBadge = (status: string) => {
        switch(status) {
            case 'APPROVED': return <Badge className="bg-green-600">Approved</Badge>;
            case 'PAID': return <Badge className="bg-blue-600">Paid</Badge>;
            case 'REJECTED': return <Badge variant="destructive">Rejected</Badge>;
            default: return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200">Pending</Badge>;
        }
    };

    return (
        <Card className="h-full border-t-4 border-t-blue-600 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-blue-600"/> Expense Claims
                    </CardTitle>
                    <CardDescription>Manage your personal reimbursement requests.</CardDescription>
                </div>
                
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="w-4 h-4 mr-2"/> New Claim</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Submit Expense Claim</DialogTitle>
                            <DialogDescription>Enter details for reimbursement.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <Input 
                                    placeholder="e.g. Travel to HQ" 
                                    value={description} 
                                    onChange={e => setDescription(e.target.value)} 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Amount ({tenant.currency})</label>
                                <Input 
                                    type="number" 
                                    placeholder="0.00" 
                                    value={amount} 
                                    onChange={e => setAmount(e.target.value)} 
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button onClick={() => mutation.mutate()} disabled={!description || !amount || mutation.isPending}>
                                {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>} Submit
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>

            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto animate-spin"/></TableCell></TableRow>
                            ) : !claims || claims.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No claims found.</TableCell></TableRow>
                            ) : (
                                claims.map((c) => (
                                    <TableRow key={c.id}>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {format(new Date(c.created_at), 'MMM d, yyyy')}
                                        </TableCell>
                                        <TableCell className="font-medium">{c.description}</TableCell>
                                        <TableCell className="text-right font-mono">
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: tenant.currency }).format(c.amount)}
                                        </TableCell>
                                        <TableCell className="text-right">{getStatusBadge(c.status)}</TableCell>
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