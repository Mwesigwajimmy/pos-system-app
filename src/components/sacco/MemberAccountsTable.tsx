// src/components/sacco/MemberAccountsTable.tsx

'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import { UserPlus, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Link from 'next/link';

// --- Type Definitions ---
interface MemberAccount { 
    member_id: bigint; 
    member_name: string; 
    member_status: string; 
    total_shares: number; 
    total_loans: number; 
    savings_balances: { product_name: string; balance: number }[]; 
}
interface SavingsProduct { 
    id: bigint; 
    product_name: string; 
}

// --- Data Fetching ---
// UPDATED: Now accepts tenantId to filter data correctly
async function fetchMemberAccounts(tenantId: string) {
    const supabase = createClient();
    // Assuming the RPC accepts a tenant_id parameter for security
    // If your RPC doesn't accept it yet, you might need to update the RPC or 
    // rely on RLS (Row Level Security) if supabase.auth.user() is set correctly.
    const { data, error } = await supabase.rpc('get_sacco_member_accounts', { p_tenant_id: tenantId });
    if (error) throw error;
    return data as MemberAccount[];
}

async function fetchSavingsProducts(tenantId: string) {
    const supabase = createClient();
    // UPDATED: Filter by tenant_id
    const { data, error } = await supabase
        .from('sacco_savings_products')
        .select('id, product_name')
        .eq('tenant_id', tenantId); 
    if (error) throw error;
    return data as SavingsProduct[];
}

// --- Mutations ---
async function processTransaction(data: { memberId: bigint; type: 'DEPOSIT' | 'WITHDRAWAL'; amount: number; accountType: 'Shares' | bigint; tenantId: string }) {
    const supabase = createClient();
    let rpcName = '';
    let params: any = { p_tenant_id: data.tenantId }; // Pass tenantId to RPCs

    if (data.accountType === 'Shares') {
        if (data.type === 'WITHDRAWAL') throw new Error("Shares cannot be withdrawn directly.");
        rpcName = 'process_share_purchase';
        params = { ...params, p_member_id: data.memberId, p_amount: data.amount };
    } else {
        rpcName = data.type === 'DEPOSIT' ? 'process_savings_deposit' : 'process_savings_withdrawal';
        params = { ...params, p_member_id: data.memberId, p_savings_product_id: data.accountType, p_amount: data.amount };
    }
    
    const { error } = await supabase.rpc(rpcName, params);
    if (error) throw error;
}

async function registerMember(data: any) {
    const supabase = createClient();
    const { error } = await supabase.rpc('register_sacco_member', data);
    if (error) throw error;
}

const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value)}`;

// --- Main Component ---
// UPDATED: Destructure tenantId from props
export default function MemberAccountsTable({ tenantId }: { tenantId: string }) {
    const [isTxDialogOpen, setIsTxDialogOpen] = useState(false);
    const [isRegDialogOpen, setIsRegDialogOpen] = useState(false);
    const [transactionType, setTransactionType] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');
    const [selectedMember, setSelectedMember] = useState<MemberAccount | null>(null);
    const queryClient = useQueryClient();

    // UPDATED: Pass tenantId to fetch functions and query keys
    const { data: members, isLoading } = useQuery({ 
        queryKey: ['saccoMemberAccounts', tenantId], 
        queryFn: () => fetchMemberAccounts(tenantId) 
    });
    
    const { data: savingsProducts } = useQuery({ 
        queryKey: ['saccoSavingsProducts', tenantId], 
        queryFn: () => fetchSavingsProducts(tenantId) 
    });

    const handleMutationSuccess = (message: string) => {
        toast.success(message);
        queryClient.invalidateQueries({ queryKey: ['saccoMemberAccounts', tenantId] });
        queryClient.invalidateQueries({ queryKey: ['saccoDashboardKPIs', tenantId] });
        setIsTxDialogOpen(false);
        setIsRegDialogOpen(false);
    };

    const handleMutationError = (error: any) => toast.error(`Transaction failed: ${error.message}`);

    const transactionMutation = useMutation({ 
        mutationFn: processTransaction, 
        onSuccess: () => handleMutationSuccess(`${transactionType} successful!`), 
        onError: handleMutationError 
    });
    
    const registrationMutation = useMutation({ 
        mutationFn: registerMember, 
        onSuccess: () => handleMutationSuccess("Member registered successfully!"), 
        onError: handleMutationError 
    });

    const handleOpenTxDialog = (member: MemberAccount, type: 'DEPOSIT' | 'WITHDRAWAL') => {
        setSelectedMember(member);
        setTransactionType(type);
        setIsTxDialogOpen(true);
    };

    const handleTxSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const accountType = formData.get('accountType') as 'Shares' | string;
        
        transactionMutation.mutate({
            tenantId, // Pass tenantId here
            memberId: selectedMember!.member_id,
            type: transactionType,
            amount: Number(formData.get('amount')),
            accountType: accountType === 'Shares' ? 'Shares' : BigInt(accountType),
        });
    };
    
    const handleRegSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        registrationMutation.mutate({
            p_tenant_id: tenantId, // Pass tenantId here
            p_full_name: formData.get('fullName'),
            p_phone: formData.get('phone'),
            p_email: formData.get('email'),
            p_address: formData.get('address'),
        });
    };

    const accountOptions = useMemo(() => [
        { value: 'Shares', label: 'Shares (Capital)' },
        ...(savingsProducts?.map(p => ({ value: p.id.toString(), label: p.product_name })) || [])
    ], [savingsProducts]);

    return (
        <div className="space-y-4">
            <div className="text-right">
                <Dialog open={isRegDialogOpen} onOpenChange={setIsRegDialogOpen}>
                    <DialogTrigger asChild><Button><UserPlus className="mr-2 h-4 w-4" />Register New Member</Button></DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader><DialogTitle>Register New SACCO Member</DialogTitle><DialogDescription>Onboard a new member into the SACCO. Their savings accounts will be created automatically.</DialogDescription></DialogHeader>
                        <form id="regForm" onSubmit={handleRegSubmit} className="space-y-4 py-4">
                            <Label>Full Name</Label><Input name="fullName" required />
                            <Label>Phone Number</Label><Input name="phone" />
                            <Label>Email</Label><Input name="email" type="email" />
                            <Label>Address</Label><Input name="address" />
                        </form>
                        <DialogFooter><Button type="submit" form="regForm" disabled={registrationMutation.isPending}>{registrationMutation.isPending ? "Registering..." : "Complete Registration"}</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            <Table>
                <TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Status</TableHead><TableHead>Total Shares</TableHead><TableHead>Active Loans</TableHead><TableHead>Savings</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                    {isLoading && <TableRow><TableCell colSpan={6} className="text-center h-24">Loading members...</TableCell></TableRow>}
                    {members?.map(member => (
                        <TableRow key={member.member_id.toString()}>
                            <TableCell className="font-medium">{member.member_name}</TableCell>
                            <TableCell><Badge variant={member.member_status === 'Active' ? 'default' : 'outline'}>{member.member_status}</Badge></TableCell>
                            <TableCell>{formatCurrency(member.total_shares)}</TableCell>
                            <TableCell>{formatCurrency(member.total_loans)}</TableCell>
                            <TableCell>
                                {member.savings_balances?.map(s => <div key={s.product_name} className="text-xs">{s.product_name}: <span className="font-semibold">{formatCurrency(s.balance)}</span></div>)}
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleOpenTxDialog(member, 'DEPOSIT')}>
                                            Process Deposit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleOpenTxDialog(member, 'WITHDRAWAL')}>
                                            Process Withdrawal
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href={`/sacco/members/${member.member_id}`}>
                                                View Full Profile
                                            </Link>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <Dialog open={isTxDialogOpen} onOpenChange={setIsTxDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{transactionType} for {selectedMember?.member_name}</DialogTitle></DialogHeader>
                    <form id="saccoTxForm" onSubmit={handleTxSubmit} className="space-y-4 py-4">
                        <Label>Amount (UGX)</Label><Input name="amount" type="number" required min="1" />
                        <Label>Destination Account</Label>
                        <Select name="accountType" required>
                            <SelectTrigger><SelectValue placeholder="Select account..." /></SelectTrigger>
                            <SelectContent>
                                {accountOptions.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value} disabled={transactionType === 'WITHDRAWAL' && opt.value === 'Shares'}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </form>
                    <DialogFooter><Button type="submit" form="saccoTxForm" disabled={transactionMutation.isPending}>{transactionMutation.isPending ? "Processing..." : "Confirm Transaction"}</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}