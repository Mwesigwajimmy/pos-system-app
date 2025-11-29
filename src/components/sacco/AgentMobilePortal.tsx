'use client';

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { format } from "date-fns";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Smartphone, History, CheckCircle2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// --- Types ---
interface Collection { 
    id: string; 
    member_name: string; 
    amount: number; 
    type: 'DEPOSIT' | 'LOAN_REPAYMENT' | 'SHARE_CAPITAL'; 
    status: 'PENDING' | 'POSTED' | 'REJECTED'; 
    created_at: string;
    reference_no: string;
}

interface MemberOption {
    id: string;
    name: string;
    account_no: string;
}

// --- API ---
async function fetchAgentCollections(tenantId: string, agentId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('collections')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(20); // Last 20 transactions for mobile efficiency
  
  if (error) throw error; 
  return data as Collection[];
}

async function searchMember(query: string, tenantId: string) {
    const db = createClient();
    const { data } = await db
        .from('members')
        .select('id, first_name, last_name, account_no')
        .eq('tenant_id', tenantId)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,account_no.eq.${query}`)
        .limit(5);
    
    return data?.map((m: any) => ({
        id: m.id,
        name: `${m.first_name} ${m.last_name}`,
        account_no: m.account_no
    })) as MemberOption[];
}

async function submitCollection(payload: any) {
  const db = createClient();
  // Using an RPC ensures transaction ID generation and immediate ledger posting if configured
  const { data, error } = await db.rpc('submit_agent_collection', payload);
  if (error) throw new Error(error.message);
  return data;
}

// --- Component ---
export function AgentMobilePortal({ tenantId, agentId }: { tenantId: string, agentId: string }) {
  const queryClient = useQueryClient();
  
  // Form State
  const [memberQuery, setMemberQuery] = React.useState('');
  const [selectedMember, setSelectedMember] = React.useState<MemberOption | null>(null);
  const [amount, setAmount] = React.useState('');
  const [type, setType] = React.useState('DEPOSIT');
  const [members, setMembers] = React.useState<MemberOption[]>([]);
  const [searching, setSearching] = React.useState(false);

  // Queries
  const { data: collections, isLoading } = useQuery({ 
      queryKey: ['agent-collections', tenantId, agentId], 
      queryFn: () => fetchAgentCollections(tenantId, agentId) 
  });

  // Search Logic
  const handleSearch = async () => {
      if (!memberQuery) return;
      setSearching(true);
      const results = await searchMember(memberQuery, tenantId);
      setMembers(results || []);
      setSearching(false);
  };

  const mutation = useMutation({ 
      mutationFn: () => submitCollection({ 
          p_tenant_id: tenantId, 
          p_agent_id: agentId, 
          p_member_id: selectedMember?.id, 
          p_amount: parseFloat(amount), 
          p_type: type 
      }),
      onSuccess: () => {
          toast.success("Transaction Logged Successfully");
          setMemberQuery('');
          setSelectedMember(null);
          setAmount('');
          setMembers([]);
          queryClient.invalidateQueries({ queryKey: ['agent-collections', tenantId, agentId] });
      },
      onError: (e) => toast.error(e.message || "Submission Failed") 
  });

  return (
    <div className="grid gap-6 md:grid-cols-2">
        {/* Transaction Form */}
        <Card className="border-t-4 border-t-green-600 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-green-600"/> Agent Portal
                </CardTitle>
                <CardDescription>Record field collections instantly.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                
                {/* Member Search */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Find Member</label>
                    <div className="flex gap-2">
                        <Input 
                            placeholder="Name or Account #" 
                            value={memberQuery} 
                            onChange={e => setMemberQuery(e.target.value)}
                        />
                        <Button variant="secondary" onClick={handleSearch} disabled={searching}>
                            {searching ? <Loader2 className="w-4 h-4 animate-spin"/> : <Search className="w-4 h-4"/>}
                        </Button>
                    </div>
                    {/* Search Results Dropdown */}
                    {members.length > 0 && !selectedMember && (
                        <div className="border rounded-md bg-slate-50 p-2 space-y-1">
                            {members.map(m => (
                                <div 
                                    key={m.id} 
                                    className="p-2 hover:bg-white cursor-pointer rounded flex justify-between text-sm"
                                    onClick={() => { setSelectedMember(m); setMembers([]); }}
                                >
                                    <span className="font-medium">{m.name}</span>
                                    <span className="text-muted-foreground">{m.account_no}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {selectedMember && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-md flex justify-between items-center text-sm">
                            <span className="font-bold text-green-800">{selectedMember.name}</span>
                            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedMember(null)}>Change</Button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Transaction Type</label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DEPOSIT">Savings Deposit</SelectItem>
                                <SelectItem value="LOAN_REPAYMENT">Loan Repayment</SelectItem>
                                <SelectItem value="SHARE_CAPITAL">Shares Purchase</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Amount</label>
                        <Input 
                            type="number" 
                            placeholder="0.00" 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)} 
                        />
                    </div>
                </div>

                <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white" 
                    onClick={() => mutation.mutate()} 
                    disabled={!selectedMember || !amount || mutation.isPending}
                >
                    {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <CheckCircle2 className="w-4 h-4 mr-2"/>}
                    Submit Collection
                </Button>
            </CardContent>
        </Card>

        {/* Recent History */}
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <History className="w-4 h-4 text-slate-500"/> Recent Activity
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {isLoading ? (
                        <div className="flex justify-center py-4"><Loader2 className="animate-spin text-slate-400"/></div>
                    ) : collections?.map((c) => (
                        <div key={c.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                            <div>
                                <p className="font-medium text-sm text-slate-800">{c.member_name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {format(new Date(c.created_at), 'MMM d, h:mm a')} • {c.reference_no}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-slate-900">{c.amount.toLocaleString()}</p>
                                <Badge variant="outline" className="text-[10px] uppercase">{c.type.replace('_', ' ')}</Badge>
                            </div>
                        </div>
                    ))}
                    {!collections?.length && !isLoading && (
                        <p className="text-center text-sm text-muted-foreground py-4">No recent transactions.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    </div>
  )
}