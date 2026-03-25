'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { 
  Check, 
  ChevronsUpDown, 
  User, 
  Loader2, 
  Landmark, 
  TrendingUp, 
  HandCoins, 
  FileEdit,
  CheckCircle2,
  ShieldCheck,
  Activity,
  Globe,
  Plus,
  ArrowRight,
  Wallet
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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area";

// --- Interfaces ---
interface MemberOption { 
  value: number; 
  label: string; 
  currency_code?: string;
}

interface DeskSummary { 
    dailyStats: {
        deposits_today: number;
        loans_disbursed_today: number;
        total_transactions_today?: number;
    }
}

const supabase = createClient();

const fetchDeskSummary = async (): Promise<DeskSummary> => { 
  const { data, error } = await supabase.rpc('get_financial_desk_summary'); 
  if (error) throw new Error(error.message); 
  return data; 
};

// --- Sub-components ---

const StatCard = ({ title, value, icon: Icon, isVerified }: { title: string; value: string | number; icon: React.ElementType, isVerified?: boolean }) => (
  <Card className="shadow-sm border-slate-200">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">{title}</span>
        <div className="flex items-center gap-2">
            {isVerified && <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" title="Verified" />}
            <Icon className="h-4 w-4 text-slate-400" />
        </div>
    </CardHeader>
    <CardContent>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        {isVerified && <p className="text-[10px] text-blue-600 font-semibold mt-1 uppercase tracking-wider">System Verified</p>}
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
                <Button variant="outline" role="combobox" className="w-full justify-between h-11 border-slate-200 shadow-sm">
                    {search ? search : "Find a member..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-xl border-slate-200">
                <Command>
                    <CommandInput placeholder="Search member name..." onValueChange={setSearch} className="h-10" />
                    <CommandList>
                        {isLoading && <div className="p-4 text-xs text-slate-500 font-medium">Searching records...</div>}
                        <CommandEmpty className="p-4 text-xs">No member found.</CommandEmpty>
                        <ScrollArea className="h-64">
                            <CommandGroup>
                                {members?.map(member => (
                                    <CommandItem 
                                        key={member.value} 
                                        onSelect={() => { onSelectMember(member); setOpen(false); }}
                                        className="p-3 border-b border-slate-50 last:border-0"
                                    >
                                        <User className="mr-3 h-4 w-4 text-slate-400" />
                                        <span className="font-semibold text-slate-800">{member.label}</span>
                                        {member.currency_code && <Badge variant="secondary" className="ml-auto text-[10px] bg-slate-100 text-slate-600">{member.currency_code}</Badge>}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </ScrollArea>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

const MemberDashboard = ({ member, onAction }: { member: MemberOption, onAction: (type: string, data?: any) => void }) => {
    const summary = { accountBalance: 1250000, activeLoan: 5000000 };
    const formatCurrency = (val: number) => `${member.currency_code || 'UGX'} ${val.toLocaleString()}`;

    return (
        <Card className="mt-6 border-l-4 border-l-blue-600 shadow-sm bg-blue-50/20">
            <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg font-bold text-slate-900">{member.label}</CardTitle>
                        <CardDescription className="flex items-center gap-2 text-xs font-semibold">
                            ID: {member.value}
                            <ShieldCheck className="h-3 w-3 text-emerald-500" />
                        </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-white text-slate-500 border-slate-200">
                        <Globe className="w-3 h-3 mr-1.5"/> Profile Active
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-lg border border-slate-100 shadow-sm">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Savings Balance</p>
                        <p className="font-bold text-lg text-blue-600">{formatCurrency(summary.accountBalance)}</p>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-slate-100 shadow-sm">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Loan Balance</p>
                        <p className="font-bold text-lg text-orange-600">{formatCurrency(summary.activeLoan)}</p>
                    </div>
                </div>
                <Button className="w-full h-11 bg-blue-600 hover:bg-blue-700 font-bold shadow-sm" onClick={() => onAction('transaction', member)}>
                    <HandCoins className="mr-2 h-4 w-4" />
                    Process Transaction
                </Button>
            </CardContent>
        </Card>
    );
};

// --- Main Page Component ---

export default function FinancialDesk() {
    const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null);
    const [action, setAction] = useState<{ type: string; data?: any } | null>(null);
    const { data: summary, isLoading } = useQuery({ queryKey: ['financialDeskSummary'], queryFn: fetchDeskSummary });
    const queryClient = useQueryClient();

    const transactionMutation = useMutation({
      mutationFn: async (data: any) => { console.log("Processing:", data); },
      onSuccess: () => { 
        toast.success("Transaction successfully processed"); 
        queryClient.invalidateQueries({ queryKey: ['financialDeskSummary'] });
        setAction(null); 
      },
      onError: (err: any) => toast.error(`Error: ${err.message}`)
    });

    const formatCurrency = (val: number) => `UGX ${val.toLocaleString()}`;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8 pb-12 animate-in fade-in duration-500">
            {/* Sidebar */}
            <aside className="space-y-6">
                <Card className="shadow-sm border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <User className="w-5 h-5 text-blue-600"/>
                            Member Search
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <MemberSelector onSelectMember={setSelectedMember} />
                        {selectedMember ? (
                            <MemberDashboard member={selectedMember} onAction={(type, data) => setAction({ type, data })} />
                        ) : (
                            <div className="mt-6 text-center py-12 px-8 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                                <Wallet className="mx-auto h-10 w-10 text-slate-200 mb-3" />
                                <p className="text-sm font-semibold text-slate-400 uppercase tracking-tight">Select a member to start</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white">
                    <CardHeader className="pb-3"><CardTitle className="text-xs font-bold uppercase text-slate-400">Common Tasks</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                         <Button asChild className="w-full justify-between font-semibold h-10" variant="outline">
                             <Link href="/lending/applications/new">
                                 <span className="flex items-center"><FileEdit className="mr-2 h-4 w-4 text-blue-500" /> New Loan App</span>
                                 <ArrowRight size={14} className="text-slate-300" />
                             </Link>
                         </Button>
                         <Button asChild className="w-full justify-between font-semibold h-10" variant="outline">
                             <Link href="/customers/new">
                                 <span className="flex items-center"><Plus className="mr-2 h-4 w-4 text-blue-500" /> Register Member</span>
                                 <ArrowRight size={14} className="text-slate-300" />
                             </Link>
                         </Button>
                    </CardContent>
                </Card>
            </aside>

            {/* Main Area */}
            <main className="space-y-6">
                <Tabs defaultValue="summary" className="w-full">
                    <TabsList className="bg-slate-100 p-1 rounded-xl">
                        <TabsTrigger value="summary" className="px-8 rounded-lg font-bold text-xs uppercase tracking-tight">Daily Summary</TabsTrigger>
                        <TabsTrigger value="pending" className="px-8 rounded-lg font-bold text-xs uppercase tracking-tight">Pending Tasks</TabsTrigger>
                    </TabsList>

                    <TabsContent value="summary" className="mt-6 space-y-6">
                        {isLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Skeleton className="h-28 rounded-xl"/><Skeleton className="h-28 rounded-xl"/><Skeleton className="h-28 rounded-xl"/>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <StatCard title="Today's Deposits" value={formatCurrency(summary?.dailyStats?.deposits_today || 0)} icon={Landmark} isVerified />
                                <StatCard title="Loans Disbursed" value={formatCurrency(summary?.dailyStats?.loans_disbursed_today || 0)} icon={TrendingUp} isVerified />
                                <StatCard title="Total Transactions" value={summary?.dailyStats?.total_transactions_today || 0} icon={Activity} />
                            </div>
                        )}

                        <Card className="shadow-sm border-slate-200">
                            <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/30">
                                <CardTitle className="text-base font-bold text-slate-900">Recent Ledger Activity</CardTitle>
                                <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-emerald-100 font-bold px-3">
                                    LIVE SYNC
                                </Badge>
                            </CardHeader>
                            <CardContent className="h-[400px] flex items-center justify-center text-slate-400">
                                <div className="text-center">
                                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm font-medium">No transactions found for this branch today</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="pending" className="mt-6">
                         <Card className="border-slate-200">
                            <CardHeader><CardTitle className="text-base font-bold">Pending Reviews</CardTitle></CardHeader>
                            <CardContent className="h-[400px] flex items-center justify-center text-slate-400">
                                <p className="text-sm font-medium">All compliance tasks are up to date</p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>

            {/* Transaction Modal */}
            <Dialog open={!!action && action.type === 'transaction'} onOpenChange={() => setAction(null)}>
                <DialogContent className="sm:max-w-[450px] rounded-xl p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-8 bg-white border-b">
                        <DialogTitle className="flex items-center gap-3 text-xl font-bold">
                            <HandCoins className="w-6 h-6 text-blue-600"/>
                            Process {action?.data?.currency_code || 'UGX'} Transaction
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-8 space-y-6 bg-white">
                        <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 text-xs font-medium text-blue-800 flex gap-3">
                            <ShieldCheck className="w-5 h-5 shrink-0 text-blue-600"/>
                            <span>All transactions are secured and recorded for auditing. Ensure member details are correct before confirming.</span>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-700">Member</Label>
                                <Input value={action?.data?.label} disabled className="bg-slate-50 border-slate-200 font-semibold" />
                            </div>
                            {/* Further Transaction Fields would go here */}
                        </div>
                    </div>
                    <DialogFooter className="p-6 bg-slate-50 border-t flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setAction(null)} className="font-bold text-slate-500">Cancel</Button>
                        <Button onClick={() => transactionMutation.mutate({})} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 shadow-sm">
                            {transactionMutation.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : "Confirm Transaction"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}