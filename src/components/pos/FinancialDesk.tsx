'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import { Check, ChevronsUpDown, User, Loader2, Landmark, TrendingUp, HandCoins, FilePenLine } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Types
interface MemberOption { value: number; label: string; }
interface DeskSummary { 
    dailyStats: {
        deposits_today: number;
        loans_disbursed_today: number;
    }
    // Add other properties based on your RPC function's return type
}

const supabase = createClient();
const fetchDeskSummary = async (): Promise<DeskSummary> => { const { data, error } = await supabase.rpc('get_financial_desk_summary'); if (error) throw new Error(error.message); return data; };
// In a real app, you would have functions to get member details and process transactions.

const StatCard = ({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{title}</CardTitle><Icon className="h-4 w-4 text-muted-foreground" /></CardHeader>
    <CardContent><div className="text-2xl font-bold">{value}</div></CardContent>
  </Card>
);

const MemberSelector = ({ onSelectMember }: { onSelectMember: (member: MemberOption) => void }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const { data: members, isLoading } = useQuery<MemberOption[]>({ queryKey: ['searchMembers', search], queryFn: async () => { const { data } = await supabase.rpc('search_members', { search_term: search }); return data || []; }, enabled: open });

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between">Select Member...<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command><CommandInput placeholder="Search member by name..." onValueChange={setSearch} /><CommandList>
                    {isLoading && <div className="p-2 text-sm">Searching...</div>}
                    <CommandEmpty>No member found.</CommandEmpty>
                    <CommandGroup>
                        {members?.map(member => (
                            <CommandItem key={member.value} onSelect={() => { onSelectMember(member); setOpen(false); }}>
                                <Check className="mr-2 h-4 w-4 opacity-0" />{member.label}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList></Command>
            </PopoverContent>
        </Popover>
    );
};

const MemberDashboard = ({ member, onAction }: { member: MemberOption, onAction: (type: string, data?: any) => void }) => {
    // In a real app, this would useQuery to fetch member-specific details
    const summary = { accountBalance: 1250000, activeLoan: 5000000 };
    const formatCurrency = (val: number) => `UGX ${val.toLocaleString()}`;

    return (
        <Card className="mt-4">
            <CardHeader><CardTitle>{member.label}</CardTitle><CardDescription>Member ID: {member.value}</CardDescription></CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <div><p className="text-sm text-muted-foreground">Account Balance</p><p className="font-bold text-lg">{formatCurrency(summary.accountBalance)}</p></div>
                    <div><p className="text-sm text-muted-foreground">Active Loan</p><p className="font-bold text-lg">{formatCurrency(summary.activeLoan)}</p></div>
                </div>
                <Button className="w-full" onClick={() => onAction('transaction', member)}><HandCoins className="mr-2 h-4 w-4" />Process Deposit / Withdrawal</Button>
            </CardContent>
        </Card>
    );
};

export default function FinancialDesk() {
    const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null);
    const [action, setAction] = useState<{ type: string; data?: any } | null>(null);
    const { data: summary, isLoading } = useQuery({ queryKey: ['financialDeskSummary'], queryFn: fetchDeskSummary });
    
    // Placeholder mutation
    const transactionMutation = useMutation({
      mutationFn: async (data: any) => { /* RPC call to process transaction */ console.log("Processing transaction:", data); },
      onSuccess: () => { toast.success("Transaction processed successfully!"); setAction(null); },
      onError: (err: any) => toast.error(`Error: ${err.message}`)
    });

    const formatCurrency = (val: number) => `UGX ${val.toLocaleString()}`;

    return (
        <div className="grid md:grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
            <aside>
                <Card>
                    <CardHeader><CardTitle>Member Workspace</CardTitle></CardHeader>
                    <CardContent>
                        <MemberSelector onSelectMember={setSelectedMember} />
                        {selectedMember ? <MemberDashboard member={selectedMember} onAction={(type, data) => setAction({ type, data })} /> : 
                            <div className="mt-4 text-center p-8 border-2 border-dashed rounded-md">
                                <User className="mx-auto h-12 w-12 text-muted-foreground" />
                                <p className="mt-2 text-sm text-muted-foreground">Select a member to view their dashboard and perform actions.</p>
                            </div>
                        }
                    </CardContent>
                </Card>
                <Card className="mt-6">
                    <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                         <Button asChild className="w-full" variant="secondary"><Link href="/lending/applications/new"><FilePenLine className="mr-2 h-4 w-4" />Start New Loan Application</Link></Button>
                         <Button asChild className="w-full" variant="outline"><Link href="/customers/new">Register New Member</Link></Button>
                    </CardContent>
                </Card>
            </aside>
            <main>
                <Tabs defaultValue="summary">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="summary">Daily Summary</TabsTrigger>
                        <TabsTrigger value="pending">Pending Actions</TabsTrigger>
                    </TabsList>
                    <TabsContent value="summary" className="mt-4 space-y-4">
                        {isLoading ? <div className="grid md:grid-cols-2 gap-4"><Skeleton className="h-24"/><Skeleton className="h-24"/></div> :
                            <div className="grid md:grid-cols-2 gap-4">
                                <StatCard title="Deposits Today" value={formatCurrency(summary?.dailyStats?.deposits_today || 0)} icon={Landmark} />
                                <StatCard title="Loans Disbursed Today" value={formatCurrency(summary?.dailyStats?.loans_disbursed_today || 0)} icon={TrendingUp} />
                            </div>
                        }
                        <Card>
                            <CardHeader><CardTitle>Recent Transactions</CardTitle></CardHeader>
                            <CardContent>{/* List of recent tx */}</CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="pending" className="mt-4">
                         <Card>
                            <CardHeader><CardTitle>Pending Loan Applications</CardTitle></CardHeader>
                            <CardContent>{/* List of pending loans */}</CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>

             <Dialog open={!!action && action.type === 'transaction'} onOpenChange={() => setAction(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Process Transaction for {action?.data?.label}</DialogTitle></DialogHeader>
                    <div className="py-4 space-y-4">{/* Form for deposit/withdrawal */}</div>
                    <DialogFooter><Button onClick={() => transactionMutation.mutate({})}>Confirm Transaction</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}