'use client';

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { format } from "date-fns";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Smartphone, History, CheckCircle2, Search, X, Wallet, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// --- Types ---
interface Collection {
    id: string;
    member_name: string;
    amount: number;
    type: 'DEPOSIT' | 'LOAN_REPAYMENT' | 'SHARE_CAPITAL';
    status: 'PENDING' | 'POSTED' | 'REJECTED';
    payment_method?: 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER';
    created_at: string;
    reference_no: string;
}

interface MemberOption {
    id: string;
    name: string;
    account_no: string;
    phone_number?: string;
}

const CURRENCY = "UGX";

function formatCurrency(value: number) {
    return `${CURRENCY} ${value.toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
}

function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

const STATUS_STYLES: Record<Collection['status'], string> = {
    PENDING: "bg-amber-100 text-amber-700 border-amber-200",
    POSTED: "bg-green-100 text-green-700 border-green-200",
    REJECTED: "bg-red-100 text-red-700 border-red-200",
};

// --- API (data reads — plain table queries) ---
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

async function fetchTodayCollections(tenantId: string, agentId: string) {
    const db = createClient();
    const { data, error } = await db
        .from('collections')
        .select('amount, status')
        .eq('tenant_id', tenantId)
        .eq('agent_id', agentId)
        .gte('created_at', startOfToday().toISOString());

    if (error) throw error;
    return data as Pick<Collection, 'amount' | 'status'>[];
}

async function searchMember(query: string, tenantId: string) {
    const db = createClient();
    const { data, error } = await db
        .from('members')
        .select('id, first_name, last_name, account_no, phone_number')
        .eq('tenant_id', tenantId)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,account_no.eq.${query}`)
        .limit(5);

    if (error) throw error;

    return data?.map((m: any) => ({
        id: m.id,
        name: `${m.first_name} ${m.last_name}`,
        account_no: m.account_no,
        phone_number: m.phone_number
    })) as MemberOption[];
}

// --- API (write — RPC, structure left in place) ---
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

  // Member search state
  const [memberQuery, setMemberQuery] = React.useState('');
  const [selectedMember, setSelectedMember] = React.useState<MemberOption | null>(null);
  const [members, setMembers] = React.useState<MemberOption[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [searchAttempted, setSearchAttempted] = React.useState(false);

  // Transaction form state
  const [type, setType] = React.useState('DEPOSIT');
  const [amount, setAmount] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState('CASH');
  const [referenceNo, setReferenceNo] = React.useState('');
  const [notes, setNotes] = React.useState('');

  // History filter
  const [historyFilter, setHistoryFilter] = React.useState('');

  // Queries
  const { data: collections, isLoading, isError: isHistoryError } = useQuery({
      queryKey: ['agent-collections', tenantId, agentId],
      queryFn: () => fetchAgentCollections(tenantId, agentId)
  });

  const { data: todayCollections } = useQuery({
      queryKey: ['agent-collections-today', tenantId, agentId],
      queryFn: () => fetchTodayCollections(tenantId, agentId)
  });

  const todayTotal = React.useMemo(
      () => (todayCollections ?? []).reduce((sum, c) => sum + (c.amount || 0), 0),
      [todayCollections]
  );
  const todayCount = todayCollections?.length ?? 0;
  const todayPendingCount = React.useMemo(
      () => (todayCollections ?? []).filter(c => c.status === 'PENDING').length,
      [todayCollections]
  );

  // Search logic
  const handleSearch = React.useCallback(async () => {
      if (!memberQuery.trim()) {
          setMembers([]);
          return;
      }
      setSearching(true);
      try {
          const results = await searchMember(memberQuery.trim(), tenantId);
          setMembers(results || []);
      } catch (e: any) {
          toast.error(e.message || "Member search failed");
      } finally {
          setSearching(false);
          setSearchAttempted(true);
      }
  }, [memberQuery, tenantId]);

  // Debounced auto-search as the agent types
  React.useEffect(() => {
      if (selectedMember) return;
      if (!memberQuery.trim()) {
          setMembers([]);
          setSearchAttempted(false);
          return;
      }
      const handle = setTimeout(() => { handleSearch(); }, 450);
      return () => clearTimeout(handle);
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberQuery, selectedMember]);

  const handleChangeMember = () => {
      setSelectedMember(null);
      setMemberQuery('');
      setMembers([]);
      setSearchAttempted(false);
  };

  // Validation
  const parsedAmount = parseFloat(amount);
  const amountTouched = amount.trim().length > 0;
  const amountValid = amountTouched && !Number.isNaN(parsedAmount) && parsedAmount > 0;
  const referenceRequired = paymentMethod !== 'CASH';
  const referenceValid = !referenceRequired || referenceNo.trim().length > 0;
  const canSubmit = !!selectedMember && amountValid && referenceValid;

  const mutation = useMutation({
      mutationFn: () => submitCollection({
          p_tenant_id: tenantId,
          p_agent_id: agentId,
          p_member_id: selectedMember?.id,
          p_amount: parsedAmount,
          p_type: type,
          p_payment_method: paymentMethod,
          p_reference_no: referenceNo.trim() || null,
          p_notes: notes.trim() || null
      }),
      onSuccess: () => {
          toast.success("Transaction logged successfully.");
          handleChangeMember();
          setAmount('');
          setPaymentMethod('CASH');
          setReferenceNo('');
          setNotes('');
          queryClient.invalidateQueries({ queryKey: ['agent-collections', tenantId, agentId] });
          queryClient.invalidateQueries({ queryKey: ['agent-collections-today', tenantId, agentId] });
      },
      onError: (e: any) => toast.error(e.message || "Submission failed")
  });

  const filteredCollections = React.useMemo(() => {
      if (!collections) return [];
      if (!historyFilter.trim()) return collections;
      const q = historyFilter.trim().toLowerCase();
      return collections.filter(c =>
          c.member_name.toLowerCase().includes(q) ||
          c.reference_no?.toLowerCase().includes(q)
      );
  }, [collections, historyFilter]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
        {/* Transaction Form */}
        <Card className="border-t-4 border-t-green-600 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-green-600" /> Agent Portal
                </CardTitle>
                <CardDescription>Record field collections instantly.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">

                {/* Today's Summary */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 border rounded-lg p-3 text-center">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-semibold uppercase text-slate-500">Today's Total</span>
                        <span className="text-sm font-bold text-slate-900 leading-tight">{formatCurrency(todayTotal)}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 border-x">
                        <span className="text-[10px] font-semibold uppercase text-slate-500">Transactions</span>
                        <span className="text-sm font-bold text-slate-900 leading-tight">{todayCount}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-semibold uppercase text-slate-500">Pending</span>
                        <span className={`text-sm font-bold leading-tight ${todayPendingCount ? "text-amber-600" : "text-slate-900"}`}>
                            {todayPendingCount}
                        </span>
                    </div>
                </div>

                {/* Member Search */}
                <div className="space-y-2">
                    <Label htmlFor="member-search">Find Member</Label>
                    <div className="flex gap-2">
                        <Input
                            id="member-search"
                            placeholder="Name or Account #"
                            value={memberQuery}
                            onChange={e => setMemberQuery(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
                            disabled={!!selectedMember}
                        />
                        <Button variant="secondary" onClick={handleSearch} disabled={searching || !!selectedMember}>
                            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        </Button>
                    </div>

                    {/* Search Results Dropdown */}
                    {members.length > 0 && !selectedMember && (
                        <div className="border rounded-md bg-slate-50 p-2 space-y-1">
                            {members.map(m => (
                                <div
                                    key={m.id}
                                    className="p-2 hover:bg-white cursor-pointer rounded flex items-center justify-between text-sm"
                                    onClick={() => { setSelectedMember(m); setMembers([]); }}
                                >
                                    <span className="flex flex-col">
                                        <span className="font-medium text-slate-800">{m.name}</span>
                                        {m.phone_number && (
                                            <span className="text-[11px] text-muted-foreground">{m.phone_number}</span>
                                        )}
                                    </span>
                                    <span className="text-muted-foreground">{m.account_no}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* No results state */}
                    {searchAttempted && !searching && members.length === 0 && !selectedMember && memberQuery.trim() && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 px-1">
                            <AlertCircle className="w-3.5 h-3.5" /> No members found for "{memberQuery.trim()}".
                        </p>
                    )}

                    {selectedMember && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-md flex justify-between items-center text-sm">
                            <span className="flex flex-col">
                                <span className="font-bold text-green-800">{selectedMember.name}</span>
                                <span className="text-[11px] text-green-700">
                                    {selectedMember.account_no}
                                    {selectedMember.phone_number ? ` • ${selectedMember.phone_number}` : ''}
                                </span>
                            </span>
                            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleChangeMember}>
                                <X className="w-3 h-3 mr-1" /> Change
                            </Button>
                        </div>
                    )}
                </div>

                {/* Transaction Type + Amount */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="txn-type">Transaction Type</Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger id="txn-type">
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
                        <Label htmlFor="txn-amount">Amount ({CURRENCY})</Label>
                        <Input
                            id="txn-amount"
                            type="number"
                            inputMode="decimal"
                            min="0"
                            placeholder="0.00"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                        />
                        {amountTouched && !amountValid && (
                            <p className="text-[11px] text-red-600">Enter a valid amount greater than 0.</p>
                        )}
                    </div>
                </div>

                {/* Payment Method + Reference */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="payment-method">Payment Method</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger id="payment-method">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CASH">Cash</SelectItem>
                                <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="reference-no">
                            Reference No.{referenceRequired && <span className="text-red-600"> *</span>}
                        </Label>
                        <Input
                            id="reference-no"
                            placeholder={paymentMethod === 'MOBILE_MONEY' ? "e.g. Mobile money code" : "Optional"}
                            value={referenceNo}
                            onChange={e => setReferenceNo(e.target.value)}
                        />
                        {referenceRequired && !referenceValid && (
                            <p className="text-[11px] text-red-600">Required for non-cash payments.</p>
                        )}
                    </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                    <Label htmlFor="txn-notes">Notes (optional)</Label>
                    <Textarea
                        id="txn-notes"
                        placeholder="Any context worth recording for this collection..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        rows={2}
                    />
                </div>

                <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => mutation.mutate()}
                    disabled={!canSubmit || mutation.isPending}
                >
                    {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Submit Collection
                </Button>
            </CardContent>
        </Card>

        {/* Recent History */}
        <Card className="h-full flex flex-col">
            <CardHeader className="space-y-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <History className="w-4 h-4 text-slate-500" /> Recent Activity
                </CardTitle>
                <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <Input
                        placeholder="Filter by member or reference..."
                        value={historyFilter}
                        onChange={e => setHistoryFilter(e.target.value)}
                        className="pl-8 h-8 text-sm"
                    />
                </div>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
                    {isLoading ? (
                        <div className="flex justify-center py-4"><Loader2 className="animate-spin text-slate-400" /></div>
                    ) : isHistoryError ? (
                        <p className="text-center text-sm text-red-600 py-4 flex items-center justify-center gap-1">
                            <AlertCircle className="w-4 h-4" /> Couldn't load recent activity.
                        </p>
                    ) : filteredCollections.map((c) => (
                        <div key={c.id} className="flex justify-between items-start gap-3 p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                            <div className="min-w-0">
                                <p className="font-medium text-sm text-slate-800 truncate">{c.member_name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {format(new Date(c.created_at), 'MMM d, h:mm a')}
                                    {c.reference_no ? ` • ${c.reference_no}` : ''}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <Badge variant="outline" className="text-[10px] uppercase">{c.type.replace('_', ' ')}</Badge>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium uppercase leading-none ${STATUS_STYLES[c.status]}`}>
                                        {c.status}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="font-bold text-slate-900 flex items-center gap-1 justify-end">
                                    <Wallet className="w-3.5 h-3.5 text-slate-400" />
                                    {formatCurrency(c.amount)}
                                </p>
                            </div>
                        </div>
                    ))}
                    {!isLoading && !isHistoryError && !filteredCollections.length && (
                        <p className="text-center text-sm text-muted-foreground py-4">
                            {historyFilter.trim() ? "No transactions match your filter." : "No recent transactions."}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    </div>
  )
}