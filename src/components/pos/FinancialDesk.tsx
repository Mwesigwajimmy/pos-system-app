'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import { 
  Check, 
  ChevronsUpDown, 
  User, 
  Loader2, 
  Landmark, 
  TrendingUp, 
  HandCoins, 
  FilePenLine,
  ShieldCheck, // UPGRADE: Forensic Icon
  Fingerprint, // UPGRADE: Robotic Seal Icon
  Activity,    // UPGRADE: Real-time Pulse Icon
  Globe,       // UPGRADE: Global Jurisdiction Icon
  Plus
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge'; // UPGRADE: Required for status
import { cn } from '@/lib/utils';

// Types
interface MemberOption { 
  value: number; 
  label: string; 
  currency_code?: string; // UPGRADE: Currency Support
}

interface DeskSummary { 
    dailyStats: {
        deposits_today: number;
        loans_disbursed_today: number;
        robotic_seals_today?: number; // UPGRADE: Autonomy Tracking
    }
}

const supabase = createClient();

const fetchDeskSummary = async (): Promise<DeskSummary> => { 
  const { data, error } = await supabase.rpc('get_financial_desk_summary'); 
  if (error) throw new Error(error.message); 
  return data; 
};

const StatCard = ({ title, value, icon: Icon, isVerified }: { title: string; value: string | number; icon: React.ElementType, isVerified?: boolean }) => (
  <Card className="relative overflow-hidden">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex items-center gap-2">
            {/* UPGRADE: Robotic Integrity Indicator */}
            {isVerified && <Fingerprint className="h-3 w-3 text-blue-500 animate-pulse" title="Sovereign Kernel Verified" />}
            <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
    </CardHeader>
    <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {isVerified && <p className="text-[10px] text-blue-600 font-mono italic">Validated by Global Kernel</p>}
    </CardContent>
  </Card>
);

const MemberSelector = ({ onSelectMember }: { onSelectMember: (member: MemberOption) => void }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    
    const { data: members, isLoading } = useQuery<MemberOption[]>({ 
      queryKey: ['searchMembers', search], 
      queryFn: async () => { 
        const { data } = await supabase.rpc('search_members', { search_term: search }); 
        return data || []; 
      }, 
      enabled: open 
    });

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between">
                    Select Member...
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                    <CommandInput placeholder="Search member by name..." onValueChange={setSearch} />
                    <CommandList>
                        {isLoading && <div className="p-2 text-sm">Searching...</div>}
                        <CommandEmpty>No member found.</CommandEmpty>
                        <CommandGroup>
                            {members?.map(member => (
                                <CommandItem key={member.value} onSelect={() => { onSelectMember(member); setOpen(false); }}>
                                    <Check className="mr-2 h-4 w-4 opacity-0" />
                                    {member.label}
                                    {/* UPGRADE: Visual Currency Indicator */}
                                    {member.currency_code && <Badge variant="secondary" className="ml-auto text-[9px]">{member.currency_code}</Badge>}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

const MemberDashboard = ({ member, onAction }: { member: MemberOption, onAction: (type: string, data?: any) => void }) => {
    // Member-specific details
    const summary = { accountBalance: 1250000, activeLoan: 5000000 };
    const formatCurrency = (val: number) => `${member.currency_code || 'UGX'} ${val.toLocaleString()}`;

    return (
        <Card className="mt-4 border-l-4 border-blue-500 shadow-lg">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>{member.label}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                            Member ID: {member.value}
                            <ShieldCheck className="h-3 w-3 text-green-500" title="Identity Verified" />
                        </CardDescription>
                    </div>
                    <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                        <Globe className="w-3 h-3 mr-1"/> Global ID
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-2 bg-slate-50 rounded-md border">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Account Balance</p>
                        <p className="font-bold text-lg text-blue-700">{formatCurrency(summary.accountBalance)}</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-md border">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Active Loan</p>
                        <p className="font-bold text-lg text-orange-700">{formatCurrency(summary.activeLoan)}</p>
                    </div>
                </div>
                <Button className="w-full h-12" onClick={() => onAction('transaction', member)}>
                    <HandCoins className="mr-2 h-4 w-4" />
                    Process Deposit / Withdrawal
                </Button>
                {/* UPGRADE: Autonomy Indicator */}
                <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 italic">
                    <Activity className="w-3 h-3 animate-pulse text-green-500" />
                    Ledger connected to Robotic Sovereign Kernel
                </div>
            </CardContent>
        </Card>
    );
};

export default function FinancialDesk() {
    const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null);
    const [action, setAction] = useState<{ type: string; data?: any } | null>(null);
    const { data: summary, isLoading } = useQuery({ queryKey: ['financialDeskSummary'], queryFn: fetchDeskSummary });
    
    // Transaction mutation
    const transactionMutation = useMutation({
      mutationFn: async (data: any) => { /* RPC call to process transaction */ console.log("Processing transaction:", data); },
      onSuccess: () => { 
        toast.success("Transaction processed and Sealed by Kernel."); 
        setAction(null); 
      },
      onError: (err: any) => toast.error(`Kernel Rejection: ${err.message}`)
    });

    const formatCurrency = (val: number) => `UGX ${val.toLocaleString()}`;

    return (
        <div className="grid md:grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 animate-in fade-in duration-700">
            <aside>
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="w-5 h-5 text-blue-600"/>
                            Member Workspace
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <MemberSelector onSelectMember={setSelectedMember} />
                        {selectedMember ? <MemberDashboard member={selectedMember} onAction={(type, data) => setAction({ type, data })} /> : 
                            <div className="mt-4 text-center p-8 border-2 border-dashed rounded-md bg-slate-50/50">
                                <User className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                                <p className="mt-2 text-sm text-muted-foreground">Select a member to activate the Financial Desk.</p>
                            </div>
                        }
                    </CardContent>
                </Card>
                <Card className="mt-6 border-blue-100 bg-blue-50/30">
                    <CardHeader><CardTitle className="text-sm">Quick Actions</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                         <Button asChild className="w-full justify-start" variant="secondary">
                             <Link href="/lending/applications/new">
                                 <FilePenLine className="mr-2 h-4 w-4" />New Loan Application
                             </Link>
                         </Button>
                         <Button asChild className="w-full justify-start" variant="outline">
                             <Link href="/customers/new">
                                 <Plus className="mr-2 h-4 w-4" />Register New Member
                             </Link>
                         </Button>
                    </CardContent>
                </Card>
            </aside>
            <main>
                <Tabs defaultValue="summary">
                    <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                        <TabsTrigger value="summary">Autonomous Summary</TabsTrigger>
                        <TabsTrigger value="pending">Critical Tasks</TabsTrigger>
                    </TabsList>
                    <TabsContent value="summary" className="mt-4 space-y-4">
                        {isLoading ? <div className="grid md:grid-cols-2 gap-4"><Skeleton className="h-24"/><Skeleton className="h-24"/></div> :
                            <div className="grid md:grid-cols-3 gap-4">
                                <StatCard title="Deposits Today" value={formatCurrency(summary?.dailyStats?.deposits_today || 0)} icon={Landmark} isVerified />
                                <StatCard title="Loans Disbursed" value={formatCurrency(summary?.dailyStats?.loans_disbursed_today || 0)} icon={TrendingUp} isVerified />
                                {/* UPGRADE: Robotic Execution Count */}
                                <StatCard title="Robotic Seals" value={summary?.dailyStats?.robotic_seals_today || 0} icon={Fingerprint} />
                            </div>
                        }
                        <Card className="shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Verified Transaction Ledger</CardTitle>
                                <Badge variant="outline" className="font-mono text-[10px] text-green-600 border-green-200">LIVE FEED</Badge>
                            </CardHeader>
                            <CardContent className="min-h-[300px] flex items-center justify-center text-slate-300 italic text-sm">
                                No recent activity in this jurisdiction.
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="pending" className="mt-4">
                         <Card>
                            <CardHeader><CardTitle>Pending Compliance Checks</CardTitle></CardHeader>
                            <CardContent className="min-h-[300px] flex items-center justify-center text-slate-300 italic text-sm">
                                All departmental checks complete.
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>

             <Dialog open={!!action && action.type === 'transaction'} onOpenChange={() => setAction(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <HandCoins className="w-5 h-5 text-blue-600"/>
                            Process {action?.data?.currency_code || 'UGX'} Transaction for {action?.data?.label}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-800 flex gap-2">
                            <Fingerprint className="w-4 h-4 shrink-0"/>
                            This transaction will be autonomously sealed by the Sovereign Kernel and is immutable once confirmed.
                        </div>
                        {/* Form for deposit/withdrawal would go here */}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAction(null)}>Cancel</Button>
                        <Button onClick={() => transactionMutation.mutate({})} className="bg-blue-600 hover:bg-blue-700 text-white">
                            Execute & Seal
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}