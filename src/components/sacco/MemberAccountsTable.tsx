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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import toast from 'react-hot-toast';
import { UserPlus, MoreHorizontal, Landmark, Wallet, Users } from 'lucide-react';
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
// Accepts tenantId to filter data correctly
async function fetchMemberAccounts(tenantId: string) {
    const supabase = createClient();
    // Assuming the RPC accepts a tenant_id parameter for security.
    // If your RPC doesn't accept it yet, you might need to update the RPC or
    // rely on RLS (Row Level Security) if supabase.auth.user() is set correctly.
    const { data, error } = await supabase.rpc('get_sacco_member_accounts', { p_tenant_id: tenantId });
    if (error) throw error;
    return data as MemberAccount[];
}

async function fetchSavingsProducts(tenantId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('sacco_savings_products')
        .select('id, product_name')
        .eq('tenant_id', tenantId);
    if (error) throw error;
    return data as SavingsProduct[];
}

// --- Mutations ---
// NOTE: RPC names and the core parameter contract (p_tenant_id, p_member_id, p_amount,
// p_savings_product_id) are untouched. Extra fields added below (payment method,
// reference, notes, and the extended registration fields) are appended to the same
// params object. Your underlying SQL functions will need matching parameters added
// on the database side before these new values will actually persist — nothing here
// changes how the functions are invoked or named.
async function processTransaction(data: {
    memberId: bigint;
    type: 'DEPOSIT' | 'WITHDRAWAL';
    amount: number;
    accountType: 'Shares' | bigint;
    tenantId: string;
    paymentMethod?: string;
    referenceNumber?: string;
    notes?: string;
}) {
    const supabase = createClient();
    let rpcName = '';
    let params: any = { p_tenant_id: data.tenantId };

    if (data.accountType === 'Shares') {
        if (data.type === 'WITHDRAWAL') throw new Error("Shares cannot be withdrawn directly.");
        rpcName = 'process_share_purchase';
        params = { ...params, p_member_id: data.memberId, p_amount: data.amount };
    } else {
        rpcName = data.type === 'DEPOSIT' ? 'process_savings_deposit' : 'process_savings_withdrawal';
        params = { ...params, p_member_id: data.memberId, p_savings_product_id: data.accountType, p_amount: data.amount };
    }

    // Additional context fields — remove if your RPCs don't yet accept them.
    params = {
        ...params,
        p_payment_method: data.paymentMethod || null,
        p_reference_number: data.referenceNumber || null,
        p_notes: data.notes || null,
    };

    const { error } = await supabase.rpc(rpcName, params);
    if (error) throw error;
}

async function registerMember(data: any) {
    const supabase = createClient();
    const { error } = await supabase.rpc('register_sacco_member', data);
    if (error) throw error;
}

const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value ?? 0)}`;

const statusBadgeVariant = (status: string): 'default' | 'outline' | 'destructive' | 'secondary' => {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'active') return 'default';
    if (normalized === 'suspended' || normalized === 'dormant') return 'destructive';
    if (normalized === 'pending') return 'secondary';
    return 'outline';
};

// --- Main Component ---
export default function MemberAccountsTable({ tenantId }: { tenantId: string }) {
    const [isTxDialogOpen, setIsTxDialogOpen] = useState(false);
    const [isRegDialogOpen, setIsRegDialogOpen] = useState(false);
    const [transactionType, setTransactionType] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');
    const [selectedMember, setSelectedMember] = useState<MemberAccount | null>(null);
    const queryClient = useQueryClient();

    const { data: members, isLoading } = useQuery({
        queryKey: ['saccoMemberAccounts', tenantId],
        queryFn: () => fetchMemberAccounts(tenantId),
    });

    const { data: savingsProducts } = useQuery({
        queryKey: ['saccoSavingsProducts', tenantId],
        queryFn: () => fetchSavingsProducts(tenantId),
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
        onSuccess: () => handleMutationSuccess(`${transactionType === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'} successful!`),
        onError: handleMutationError,
    });

    const registrationMutation = useMutation({
        mutationFn: registerMember,
        onSuccess: () => handleMutationSuccess('Member registered successfully!'),
        onError: (error: any) => toast.error(`Registration failed: ${error.message}`),
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
            tenantId,
            memberId: selectedMember!.member_id,
            type: transactionType,
            amount: Number(formData.get('amount')),
            accountType: accountType === 'Shares' ? 'Shares' : BigInt(accountType),
            paymentMethod: formData.get('paymentMethod') as string,
            referenceNumber: formData.get('referenceNumber') as string,
            notes: formData.get('notes') as string,
        });
    };

    const handleRegSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        registrationMutation.mutate({
            p_tenant_id: tenantId,
            // Personal information
            p_full_name: formData.get('fullName'),
            p_date_of_birth: formData.get('dateOfBirth'),
            p_gender: formData.get('gender'),
            p_marital_status: formData.get('maritalStatus'),
            p_national_id: formData.get('nationalId'),
            p_occupation: formData.get('occupation'),
            // Contact information
            p_phone: formData.get('phone'),
            p_email: formData.get('email'),
            p_address: formData.get('address'),
            p_district: formData.get('district'),
            // Next of kin
            p_next_of_kin_name: formData.get('nextOfKinName'),
            p_next_of_kin_phone: formData.get('nextOfKinPhone'),
            p_next_of_kin_relationship: formData.get('nextOfKinRelationship'),
            // Initial contribution
            p_initial_shares_amount: formData.get('initialShares') ? Number(formData.get('initialShares')) : 0,
        });
    };

    const accountOptions = useMemo(() => [
        { value: 'Shares', label: 'Shares (Capital)' },
        ...(savingsProducts?.map(p => ({ value: p.id.toString(), label: p.product_name })) || []),
    ], [savingsProducts]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                        <Landmark className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                        <CardTitle>SACCO Member Accounts</CardTitle>
                        <CardDescription>Manage member shares, savings, and loan balances</CardDescription>
                    </div>
                </div>

                <Dialog open={isRegDialogOpen} onOpenChange={setIsRegDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Register New Member
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
                        <DialogHeader>
                            <DialogTitle>Register New SACCO Member</DialogTitle>
                            <DialogDescription>
                                Onboard a new member into the SACCO. Their savings accounts will be created automatically.
                            </DialogDescription>
                        </DialogHeader>

                        <form id="regForm" onSubmit={handleRegSubmit} className="space-y-6 py-2">
                            {/* Personal Information */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-muted-foreground">Personal Information</h4>
                                <div className="space-y-2">
                                    <Label htmlFor="fullName">Full Name</Label>
                                    <Input id="fullName" name="fullName" required placeholder="e.g. Nakato Sarah" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="dateOfBirth">Date of Birth</Label>
                                        <Input id="dateOfBirth" name="dateOfBirth" type="date" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="gender">Gender</Label>
                                        <Select name="gender" required>
                                            <SelectTrigger id="gender"><SelectValue placeholder="Select..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Female">Female</SelectItem>
                                                <SelectItem value="Male">Male</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="maritalStatus">Marital Status</Label>
                                        <Select name="maritalStatus">
                                            <SelectTrigger id="maritalStatus"><SelectValue placeholder="Select..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Single">Single</SelectItem>
                                                <SelectItem value="Married">Married</SelectItem>
                                                <SelectItem value="Divorced">Divorced</SelectItem>
                                                <SelectItem value="Widowed">Widowed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="nationalId">National ID / NIN</Label>
                                        <Input id="nationalId" name="nationalId" required placeholder="CM XXXXXXXXXXXX" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="occupation">Occupation</Label>
                                    <Input id="occupation" name="occupation" placeholder="e.g. Teacher, Trader, Farmer" />
                                </div>
                            </div>

                            <Separator />

                            {/* Contact Information */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-muted-foreground">Contact Information</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <Input id="phone" name="phone" required placeholder="+256 7XX XXX XXX" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input id="email" name="email" type="email" placeholder="name@example.com" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Physical Address</Label>
                                    <Input id="address" name="address" placeholder="Street / village, parish" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="district">District</Label>
                                    <Input id="district" name="district" placeholder="e.g. Kampala" />
                                </div>
                            </div>

                            <Separator />

                            {/* Next of Kin */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-muted-foreground">Next of Kin</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="nextOfKinName">Full Name</Label>
                                        <Input id="nextOfKinName" name="nextOfKinName" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="nextOfKinRelationship">Relationship</Label>
                                        <Input id="nextOfKinRelationship" name="nextOfKinRelationship" placeholder="e.g. Spouse, Parent" required />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="nextOfKinPhone">Phone Number</Label>
                                    <Input id="nextOfKinPhone" name="nextOfKinPhone" required placeholder="+256 7XX XXX XXX" />
                                </div>
                            </div>

                            <Separator />

                            {/* Initial Contribution */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-muted-foreground">Initial Contribution (Optional)</h4>
                                <div className="space-y-2">
                                    <Label htmlFor="initialShares">Initial Share Amount (UGX)</Label>
                                    <Input id="initialShares" name="initialShares" type="number" min="0" placeholder="0" />
                                </div>
                            </div>
                        </form>

                        <DialogFooter>
                            <Button variant="outline" type="button" onClick={() => setIsRegDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" form="regForm" disabled={registrationMutation.isPending}>
                                {registrationMutation.isPending ? 'Registering...' : 'Complete Registration'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>

            <CardContent>
                <div className="overflow-x-auto rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Member</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Total Shares</TableHead>
                                <TableHead className="text-right">Active Loans</TableHead>
                                <TableHead>Savings</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        Loading members...
                                    </TableCell>
                                </TableRow>
                            )}

                            {!isLoading && members?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <Users className="h-6 w-6" />
                                            <span>No members registered yet.</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}

                            {members?.map(member => (
                                <TableRow key={member.member_id.toString()}>
                                    <TableCell className="align-middle font-medium">
                                        <div className="flex flex-col">
                                            <span>{member.member_name}</span>
                                            <span className="text-xs text-muted-foreground">ID: {member.member_id.toString()}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-middle">
                                        <Badge variant={statusBadgeVariant(member.member_status)}>
                                            {member.member_status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="align-middle text-right tabular-nums">
                                        {formatCurrency(member.total_shares)}
                                    </TableCell>
                                    <TableCell className="align-middle text-right tabular-nums">
                                        {formatCurrency(member.total_loans)}
                                    </TableCell>
                                    <TableCell className="align-middle">
                                        {member.savings_balances?.length ? (
                                            <div className="flex flex-col gap-0.5">
                                                {member.savings_balances.map(s => (
                                                    <div key={s.product_name} className="flex items-center justify-between gap-4 text-xs">
                                                        <span className="text-muted-foreground">{s.product_name}</span>
                                                        <span className="font-semibold tabular-nums">{formatCurrency(s.balance)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">No accounts</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="align-middle text-right">
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
                </div>
            </CardContent>

            {/* Transaction Dialog */}
            <Dialog open={isTxDialogOpen} onOpenChange={setIsTxDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <Wallet className="h-5 w-5 text-muted-foreground" />
                            <DialogTitle>
                                {transactionType === 'DEPOSIT' ? 'Process Deposit' : 'Process Withdrawal'} — {selectedMember?.member_name}
                            </DialogTitle>
                        </div>
                        <DialogDescription>
                            Member ID: {selectedMember?.member_id.toString()}
                        </DialogDescription>
                    </DialogHeader>

                    <form id="saccoTxForm" onSubmit={handleTxSubmit} className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="amount">Amount (UGX)</Label>
                                <Input id="amount" name="amount" type="number" required min="1" placeholder="0" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="paymentMethod">Payment Method</Label>
                                <Select name="paymentMethod" required>
                                    <SelectTrigger id="paymentMethod"><SelectValue placeholder="Select..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Cash">Cash</SelectItem>
                                        <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                        <SelectItem value="Cheque">Cheque</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="accountType">Destination Account</Label>
                            <Select name="accountType" required>
                                <SelectTrigger id="accountType"><SelectValue placeholder="Select account..." /></SelectTrigger>
                                <SelectContent>
                                    {accountOptions.map(opt => (
                                        <SelectItem
                                            key={opt.value}
                                            value={opt.value}
                                            disabled={transactionType === 'WITHDRAWAL' && opt.value === 'Shares'}
                                        >
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="referenceNumber">Reference Number</Label>
                            <Input id="referenceNumber" name="referenceNumber" placeholder="e.g. transaction / receipt number" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea id="notes" name="notes" placeholder="Optional notes about this transaction" rows={3} />
                        </div>
                    </form>

                    <DialogFooter>
                        <Button variant="outline" type="button" onClick={() => setIsTxDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" form="saccoTxForm" disabled={transactionMutation.isPending}>
                            {transactionMutation.isPending ? 'Processing...' : 'Confirm Transaction'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}