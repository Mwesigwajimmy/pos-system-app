// src/app/(dashboard)/sacco/collections/page.tsx
// FINAL & DEFINITIVE VERSION — now with Group / Individual switcher

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {
    Loader2,
    Search,
    AlertCircle,
    RefreshCw,
    Users,
    UserCheck,
    UserX,
    Wallet,
    ClipboardList,
    CalendarClock,
    Inbox,
    User,
    ArrowDownCircle,
    ArrowUpCircle,
    Banknote,
    Smartphone,
    Landmark,
    X
} from 'lucide-react';
import { format } from 'date-fns';

// --- TYPE DEFINITIONS (GROUP) ---
interface SaccoGroup {
    id: string;
    group_name: string;
    contribution_amount: number;
}
interface GroupMember {
    member_id: string;
    member_name: string;
}
interface CollectionEntry {
    member_id: string;
    is_present: boolean;
    contribution: number;
    fine: number;
    loan_repayment: number;
    absence_reason?: string;
}

const ABSENCE_REASONS = [
    { value: 'excused', label: 'Excused (notified in advance)' },
    { value: 'unexcused', label: 'Unexcused' },
    { value: 'sick', label: 'Sick / Medical' },
    { value: 'travel', label: 'Travel' },
    { value: 'other', label: 'Other' },
];

// --- TYPE DEFINITIONS (INDIVIDUAL) ---
interface MemberSearchResult {
    member_id: string;
    member_name: string;
    member_number: string;
    phone?: string;
}
interface MemberSavingsAccount {
    account_id: string;
    product_name: string;
    balance: number;
}
interface MemberRecentTransaction {
    id: string;
    created_at: string;
    type: string;
    amount: number;
}

const PAYMENT_METHODS = [
    { value: 'cash', label: 'Cash', icon: Banknote },
    { value: 'mobile_money', label: 'Mobile Money', icon: Smartphone },
    { value: 'bank_transfer', label: 'Bank Transfer', icon: Landmark },
];

// --- ASYNC FUNCTIONS (GROUP — unchanged) ---
async function fetchSaccoGroups(): Promise<SaccoGroup[]> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('fetch_sacco_groups');
    if (error) throw new Error('Failed to fetch groups: ' + error.message);
    return data;
}

async function fetchGroupMembers(groupId: string): Promise<GroupMember[]> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('fetch_group_members', { p_group_id: groupId });
    if (error) throw new Error('Failed to fetch group members: ' + error.message);
    return data;
}

async function submitGroupCollections(collectionData: {
    groupId: string;
    meetingDate: string;
    entries: CollectionEntry[];
    meetingNotes: string;
    nextMeetingDate: string;
}) {
    const supabase = createClient();
    const { error } = await supabase.rpc('process_group_collections', {
        p_group_id: collectionData.groupId,
        p_meeting_date: collectionData.meetingDate,
        p_collections: collectionData.entries.map(e => ({
            member_id: e.member_id,
            is_present: e.is_present,
            contribution_amount: e.contribution,
            fine_amount: e.fine,
            loan_repayment_amount: e.loan_repayment,
            absence_reason: e.is_present ? null : (e.absence_reason || null)
        })),
        p_meeting_notes: collectionData.meetingNotes || null,
        p_next_meeting_date: collectionData.nextMeetingDate || null
    });
    if (error) throw new Error('Failed to submit collections: ' + error.message);
}

// --- ASYNC FUNCTIONS (INDIVIDUAL — new; backend RPCs to be added) ---
async function searchMembers(query: string): Promise<MemberSearchResult[]> {
    const supabase = createClient();
    // NEW RPC — searches by name, member number, or phone
    const { data, error } = await supabase.rpc('search_sacco_members', { p_query: query });
    if (error) throw new Error('Failed to search members: ' + error.message);
    return data || [];
}

async function fetchMemberSavingsAccounts(memberId: string): Promise<MemberSavingsAccount[]> {
    const supabase = createClient();
    // NEW RPC — returns the member's active savings products with current balances
    const { data, error } = await supabase.rpc('fetch_member_savings_accounts', { p_member_id: memberId });
    if (error) throw new Error('Failed to fetch member accounts: ' + error.message);
    return data || [];
}

async function fetchMemberRecentTransactions(memberId: string): Promise<MemberRecentTransaction[]> {
    const supabase = createClient();
    // NEW RPC — last 5 transactions for the member, shown for front-desk verification
    const { data, error } = await supabase.rpc('fetch_member_recent_transactions', { p_member_id: memberId, p_limit: 5 });
    if (error) throw new Error('Failed to fetch recent activity: ' + error.message);
    return data || [];
}

async function submitIndividualCollection(payload: {
    memberId: string;
    accountId: string;
    transactionType: 'deposit' | 'withdrawal';
    amount: number;
    paymentMethod: string;
    referenceNumber: string;
    notes: string;
    transactionDate: string;
}) {
    const supabase = createClient();
    // NEW RPC — posts a single walk-in transaction to the member's account
    const { error } = await supabase.rpc('process_individual_collection', {
        p_member_id: payload.memberId,
        p_account_id: payload.accountId,
        p_transaction_type: payload.transactionType,
        p_amount: payload.amount,
        p_payment_method: payload.paymentMethod,
        p_reference_number: payload.referenceNumber || null,
        p_notes: payload.notes || null,
        p_transaction_date: payload.transactionDate
    });
    if (error) throw new Error('Failed to submit transaction: ' + error.message);
}

const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value)}`;

// --- MAIN COMPONENT ---
export default function GroupCollectionsPage() {
    return (
        <div className="container mx-auto space-y-6 py-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Collections</h1>
                <p className="text-muted-foreground">Run a group meeting session, or record a single walk-in member transaction.</p>
            </div>

            <Tabs defaultValue="group" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 bg-slate-100 lg:w-[420px]">
                    <TabsTrigger value="group">Group Collection</TabsTrigger>
                    <TabsTrigger value="individual">Individual Collection</TabsTrigger>
                </TabsList>

                <TabsContent value="group" className="mt-4 animate-in fade-in-50">
                    <GroupCollectionPanel />
                </TabsContent>

                <TabsContent value="individual" className="mt-4 animate-in fade-in-50">
                    <IndividualCollectionPanel />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ============================================================================
// GROUP COLLECTION PANEL (existing logic, unchanged, extracted into its own component)
// ============================================================================
function GroupCollectionPanel() {
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [collectionEntries, setCollectionEntries] = useState<Map<string, CollectionEntry>>(new Map());
    const [memberSearch, setMemberSearch] = useState('');
    const [meetingNotes, setMeetingNotes] = useState('');
    const [nextMeetingDate, setNextMeetingDate] = useState('');
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const queryClient = useQueryClient();

    const {
        data: groups,
        isLoading: isLoadingGroups,
        isError: isGroupsError,
        error: groupsError,
        refetch: refetchGroups
    } = useQuery({
        queryKey: ['saccoGroups'],
        queryFn: fetchSaccoGroups
    });

    const {
        data: members,
        isLoading: isLoadingMembers,
        isError: isMembersError,
        error: membersError,
        refetch: refetchMembers
    } = useQuery({
        queryKey: ['groupMembers', selectedGroupId],
        queryFn: () => fetchGroupMembers(selectedGroupId!),
        enabled: !!selectedGroupId,
    });

    useEffect(() => {
        if (members && groups) {
            const initialEntries = new Map<string, CollectionEntry>();
            const standardContribution = groups.find(g => g.id === selectedGroupId)?.contribution_amount || 0;
            members.forEach(member => {
                initialEntries.set(member.member_id, {
                    member_id: member.member_id,
                    is_present: false,
                    contribution: standardContribution,
                    fine: 0,
                    loan_repayment: 0,
                    absence_reason: undefined,
                });
            });
            setCollectionEntries(initialEntries);
            setMemberSearch('');
            setMeetingNotes('');
            setNextMeetingDate('');
        }
    }, [members, groups, selectedGroupId]);

    const collectionMutation = useMutation({
        mutationFn: submitGroupCollections,
        onSuccess: () => {
            toast.success("Group collections submitted successfully!");
            queryClient.invalidateQueries({ queryKey: ['saccoDashboardKPIs'] });
            setIsConfirmOpen(false);
            setSelectedGroupId(null);
            setCollectionEntries(new Map());
        },
        onError: (err: any) => toast.error(err.message),
    });

    const updateEntry = (memberId: string, field: keyof CollectionEntry, value: any) => {
        setCollectionEntries(prev => {
            const newEntries = new Map(prev);
            const entry = newEntries.get(memberId);
            if (entry) {
                if (field === 'is_present' && !value) {
                    newEntries.set(memberId, {
                        ...entry,
                        is_present: false,
                        contribution: 0,
                        fine: 0,
                        loan_repayment: 0,
                    });
                } else if (field === 'is_present' && value) {
                    newEntries.set(memberId, { ...entry, is_present: true, absence_reason: undefined });
                } else {
                    newEntries.set(memberId, { ...entry, [field]: value });
                }
            }
            return newEntries;
        });
    };

    const handleMarkAll = () => {
        setCollectionEntries(prev => {
            const newEntries = new Map(prev);
            const standardContribution = groups?.find(g => g.id === selectedGroupId)?.contribution_amount || 0;
            newEntries.forEach((entry, memberId) => {
                newEntries.set(memberId, {
                    ...entry,
                    is_present: true,
                    contribution: standardContribution,
                    fine: 0,
                    absence_reason: undefined,
                });
            });
            return newEntries;
        });
    };

    const handleSubmit = () => {
        if (!selectedGroupId) return;
        const entriesArray = Array.from(collectionEntries.values());
        collectionMutation.mutate({
            groupId: selectedGroupId,
            meetingDate: format(new Date(), 'yyyy-MM-dd'),
            entries: entriesArray,
            meetingNotes,
            nextMeetingDate,
        });
    };

    const selectedGroup = useMemo(() => groups?.find(g => g.id === selectedGroupId), [groups, selectedGroupId]);

    const filteredMembers = useMemo(() => {
        if (!members) return [];
        if (!memberSearch.trim()) return members;
        const q = memberSearch.trim().toLowerCase();
        return members.filter(m => m.member_name.toLowerCase().includes(q));
    }, [members, memberSearch]);

    const entriesArray = useMemo(() => Array.from(collectionEntries.values()), [collectionEntries]);
    const presentCount = useMemo(() => entriesArray.filter(e => e.is_present).length, [entriesArray]);
    const absentCount = entriesArray.length - presentCount;
    const attendanceRate = entriesArray.length > 0 ? Math.round((presentCount / entriesArray.length) * 100) : 0;

    const totalContributions = useMemo(() => entriesArray.reduce((acc, e) => acc + (e.contribution || 0), 0), [entriesArray]);
    const totalFines = useMemo(() => entriesArray.reduce((acc, e) => acc + (e.fine || 0), 0), [entriesArray]);
    const totalLoanRepayments = useMemo(() => entriesArray.reduce((acc, e) => acc + (e.loan_repayment || 0), 0), [entriesArray]);
    const totalCollected = totalContributions + totalFines + totalLoanRepayments;

    const canSubmit = presentCount > 0 && !collectionMutation.isPending;

    return (
        <div className="space-y-6">
            {!selectedGroupId && (
                <Card className="mx-auto max-w-lg shadow-sm">
                    <CardHeader>
                        <CardTitle>Start a Collection Session</CardTitle>
                        <CardDescription>Select the group that is holding a meeting right now.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {isLoadingGroups ? (
                            <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed bg-slate-50 p-6">
                                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                <span className="text-sm text-slate-500">Loading groups…</span>
                            </div>
                        ) : isGroupsError ? (
                            <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 text-center">
                                <AlertCircle className="mx-auto h-5 w-5 text-red-500" />
                                <p className="text-sm text-red-700">{(groupsError as Error)?.message || 'Could not load groups.'}</p>
                                <Button size="sm" variant="outline" onClick={() => refetchGroups()}>
                                    <RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry
                                </Button>
                            </div>
                        ) : !groups || groups.length === 0 ? (
                            <div className="space-y-1 rounded-lg border border-dashed bg-slate-50 p-6 text-center">
                                <Inbox className="mx-auto h-5 w-5 text-slate-400" />
                                <p className="text-sm font-medium text-slate-700">No groups found</p>
                                <p className="text-xs text-muted-foreground">Create a savings group before starting a collection session.</p>
                            </div>
                        ) : (
                            <Select onValueChange={(value) => setSelectedGroupId(value)}>
                                <SelectTrigger><SelectValue placeholder="Select a group..." /></SelectTrigger>
                                <SelectContent>
                                    {groups.map(group => (
                                        <SelectItem key={group.id} value={group.id}>{group.group_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </CardContent>
                </Card>
            )}

            {selectedGroupId && (
                <Card className="shadow-sm">
                    <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <CardTitle>Collection for: {selectedGroup?.group_name}</CardTitle>
                                <CardDescription>
                                    Meeting Date: {format(new Date(), "PPP")}. Standard contribution is {formatCurrency(selectedGroup?.contribution_amount || 0)}.
                                </CardDescription>
                            </div>
                            <Button variant="outline" onClick={() => setSelectedGroupId(null)}>Change Group</Button>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {isLoadingMembers ? (
                            <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed bg-slate-50 p-8">
                                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                <span className="text-sm text-slate-500">Loading members…</span>
                            </div>
                        ) : isMembersError ? (
                            <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-6 text-center">
                                <AlertCircle className="mx-auto h-5 w-5 text-red-500" />
                                <p className="text-sm text-red-700">{(membersError as Error)?.message || 'Could not load members.'}</p>
                                <Button size="sm" variant="outline" onClick={() => refetchMembers()}>
                                    <RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry
                                </Button>
                            </div>
                        ) : !members || members.length === 0 ? (
                            <div className="space-y-1 rounded-lg border border-dashed bg-slate-50 p-8 text-center">
                                <Inbox className="mx-auto h-5 w-5 text-slate-400" />
                                <p className="text-sm font-medium text-slate-700">No members in this group</p>
                                <p className="text-xs text-muted-foreground">Add members to this group before running a collection session.</p>
                            </div>
                        ) : (
                            <>
                                {/* Attendance Summary */}
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    <div className="flex items-center gap-2 rounded-lg border bg-slate-50 p-3">
                                        <Users className="h-4 w-4 text-slate-500" />
                                        <div>
                                            <div className="text-lg font-bold leading-none">{entriesArray.length}</div>
                                            <div className="text-[10px] uppercase text-muted-foreground">Total Members</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 p-3">
                                        <UserCheck className="h-4 w-4 text-green-600" />
                                        <div>
                                            <div className="text-lg font-bold leading-none text-green-700">{presentCount}</div>
                                            <div className="text-[10px] uppercase text-muted-foreground">Present</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 p-3">
                                        <UserX className="h-4 w-4 text-amber-600" />
                                        <div>
                                            <div className="text-lg font-bold leading-none text-amber-700">{absentCount}</div>
                                            <div className="text-[10px] uppercase text-muted-foreground">Absent</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 rounded-lg border bg-slate-50 p-3">
                                        <ClipboardList className="h-4 w-4 text-slate-500" />
                                        <div>
                                            <div className="text-lg font-bold leading-none">{attendanceRate}%</div>
                                            <div className="text-[10px] uppercase text-muted-foreground">Attendance</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Search + Bulk Action */}
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="relative w-full sm:max-w-xs">
                                        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <Input
                                            placeholder="Search members…"
                                            value={memberSearch}
                                            onChange={(e) => setMemberSearch(e.target.value)}
                                            className="pl-8"
                                        />
                                    </div>
                                    <Button onClick={handleMarkAll} variant="secondary">Mark All as Present & Paid</Button>
                                </div>

                                {/* Collections Table */}
                                <div className="overflow-x-auto rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[70px]">Present</TableHead>
                                                <TableHead>Member Name</TableHead>
                                                <TableHead className="w-[150px]">Contribution</TableHead>
                                                <TableHead className="w-[130px]">Fine</TableHead>
                                                <TableHead className="w-[150px]">Loan Repayment</TableHead>
                                                <TableHead className="w-[110px] text-right">Total</TableHead>
                                                <TableHead className="w-[200px]">Absence Reason</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredMembers.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                                                        No members match "{memberSearch}".
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredMembers.map(member => {
                                                    const entry = collectionEntries.get(member.member_id);
                                                    const rowTotal = (entry?.contribution || 0) + (entry?.fine || 0) + (entry?.loan_repayment || 0);
                                                    return (
                                                        <TableRow key={member.member_id} className={entry?.is_present ? '' : 'opacity-60'}>
                                                            <TableCell>
                                                                <Checkbox
                                                                    checked={entry?.is_present}
                                                                    onCheckedChange={(checked) => updateEntry(member.member_id, 'is_present', checked)}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="font-medium">{member.member_name}</TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    min={0}
                                                                    value={entry?.contribution ?? 0}
                                                                    onChange={(e) => updateEntry(member.member_id, 'contribution', Math.max(0, Number(e.target.value)))}
                                                                    disabled={!entry?.is_present}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    min={0}
                                                                    value={entry?.fine ?? 0}
                                                                    onChange={(e) => updateEntry(member.member_id, 'fine', Math.max(0, Number(e.target.value)))}
                                                                    disabled={!entry?.is_present}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    min={0}
                                                                    value={entry?.loan_repayment ?? 0}
                                                                    onChange={(e) => updateEntry(member.member_id, 'loan_repayment', Math.max(0, Number(e.target.value)))}
                                                                    disabled={!entry?.is_present}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono font-semibold tabular-nums">
                                                                {formatCurrency(rowTotal)}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Select
                                                                    value={entry?.absence_reason}
                                                                    onValueChange={(v) => updateEntry(member.member_id, 'absence_reason', v)}
                                                                    disabled={entry?.is_present}
                                                                >
                                                                    <SelectTrigger className="h-9">
                                                                        <SelectValue placeholder={entry?.is_present ? '—' : 'Select reason'} />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {ABSENCE_REASONS.map(r => (
                                                                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                <Separator />

                                {/* Meeting Minutes */}
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div className="space-y-1.5 sm:col-span-2">
                                        <Label htmlFor="meeting-notes" className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
                                            <ClipboardList className="h-3.5 w-3.5" /> Meeting Notes / Minutes (optional)
                                        </Label>
                                        <Textarea
                                            id="meeting-notes"
                                            placeholder="Key discussion points, decisions made, matters arising..."
                                            value={meetingNotes}
                                            onChange={(e) => setMeetingNotes(e.target.value)}
                                            rows={3}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="next-meeting" className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
                                            <CalendarClock className="h-3.5 w-3.5" /> Next Meeting Date
                                        </Label>
                                        <Input
                                            id="next-meeting"
                                            type="date"
                                            value={nextMeetingDate}
                                            onChange={(e) => setNextMeetingDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>

                    {members && members.length > 0 && (
                        <CardFooter className="flex flex-col gap-3 border-t bg-muted/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <Wallet className="h-3.5 w-3.5" /> Contributions: <strong className="text-slate-900">{formatCurrency(totalContributions)}</strong>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Fines: <strong className="text-slate-900">{formatCurrency(totalFines)}</strong>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Loan Repayments: <strong className="text-slate-900">{formatCurrency(totalLoanRepayments)}</strong>
                                </div>
                                <div className="text-lg font-bold">
                                    Total Today: <span className="text-primary">{formatCurrency(totalCollected)}</span>
                                </div>
                            </div>

                            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                                <AlertDialogTrigger asChild>
                                    <Button size="lg" disabled={!canSubmit}>
                                        {collectionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Submit Collections
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Confirm Collection Submission</AlertDialogTitle>
                                        <AlertDialogDescription asChild>
                                            <div className="space-y-3">
                                                <p>
                                                    You're about to submit today's collection for{" "}
                                                    <strong className="text-slate-900">{selectedGroup?.group_name}</strong>. This posts directly to member accounts and cannot be undone from here.
                                                </p>
                                                <div className="grid grid-cols-2 gap-3 rounded-lg border bg-slate-50 p-3 text-sm text-slate-700">
                                                    <div>Present: <strong>{presentCount}</strong> / {entriesArray.length}</div>
                                                    <div>Attendance: <strong>{attendanceRate}%</strong></div>
                                                    <div>Contributions: <strong>{formatCurrency(totalContributions)}</strong></div>
                                                    <div>Fines: <strong>{formatCurrency(totalFines)}</strong></div>
                                                    <div>Loan Repayments: <strong>{formatCurrency(totalLoanRepayments)}</strong></div>
                                                    <div>Grand Total: <strong>{formatCurrency(totalCollected)}</strong></div>
                                                </div>
                                                {absentCount > 0 && (
                                                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                                                        {absentCount} member{absentCount !== 1 ? 's' : ''} marked absent
                                                    </Badge>
                                                )}
                                            </div>
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Go Back</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={(e) => { e.preventDefault(); handleSubmit(); }}
                                            disabled={collectionMutation.isPending}
                                        >
                                            {collectionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Confirm & Submit
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardFooter>
                    )}
                </Card>
            )}
        </div>
    );
}

// ============================================================================
// INDIVIDUAL COLLECTION PANEL (new)
// ============================================================================
function IndividualCollectionPanel() {
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [selectedMember, setSelectedMember] = useState<MemberSearchResult | null>(null);
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [transactionType, setTransactionType] = useState<'deposit' | 'withdrawal'>('deposit');
    const [amount, setAmount] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [referenceNumber, setReferenceNumber] = useState('');
    const [notes, setNotes] = useState('');
    const [transactionDate, setTransactionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const queryClient = useQueryClient();

    // Debounce search input
    useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 350);
        return () => clearTimeout(t);
    }, [searchQuery]);

    const {
        data: searchResults,
        isLoading: isSearching,
        isError: isSearchError
    } = useQuery({
        queryKey: ['memberSearch', debouncedQuery],
        queryFn: () => searchMembers(debouncedQuery),
        enabled: debouncedQuery.length >= 2 && !selectedMember,
    });

    const {
        data: accounts,
        isLoading: isLoadingAccounts,
        isError: isAccountsError,
        error: accountsError,
        refetch: refetchAccounts
    } = useQuery({
        queryKey: ['memberSavingsAccounts', selectedMember?.member_id],
        queryFn: () => fetchMemberSavingsAccounts(selectedMember!.member_id),
        enabled: !!selectedMember,
    });

    const { data: recentTx, isLoading: isLoadingRecent } = useQuery({
        queryKey: ['memberRecentTransactions', selectedMember?.member_id],
        queryFn: () => fetchMemberRecentTransactions(selectedMember!.member_id),
        enabled: !!selectedMember,
    });

    // Reset dependent state whenever a new member is chosen
    useEffect(() => {
        setSelectedAccountId('');
        setAmount('');
        setReferenceNumber('');
        setNotes('');
        setTransactionType('deposit');
        setTransactionDate(format(new Date(), 'yyyy-MM-dd'));
    }, [selectedMember?.member_id]);

    const mutation = useMutation({
        mutationFn: submitIndividualCollection,
        onSuccess: () => {
            toast.success('Transaction posted successfully!');
            queryClient.invalidateQueries({ queryKey: ['saccoDashboardKPIs'] });
            queryClient.invalidateQueries({ queryKey: ['memberSavingsAccounts', selectedMember?.member_id] });
            queryClient.invalidateQueries({ queryKey: ['memberRecentTransactions', selectedMember?.member_id] });
            setIsConfirmOpen(false);
            setSelectedAccountId('');
            setAmount('');
            setReferenceNumber('');
            setNotes('');
        },
        onError: (err: any) => toast.error(err.message),
    });

    const selectedAccount = useMemo(
        () => accounts?.find(a => a.account_id === selectedAccountId),
        [accounts, selectedAccountId]
    );

    const numericAmount = Number(amount) || 0;
    const insufficientFunds = transactionType === 'withdrawal' && selectedAccount ? numericAmount > selectedAccount.balance : false;
    const requiresReference = paymentMethod !== 'cash';

    const canSubmit =
        !!selectedMember &&
        !!selectedAccountId &&
        numericAmount > 0 &&
        !insufficientFunds &&
        (!requiresReference || referenceNumber.trim().length > 0) &&
        !mutation.isPending;

    const handleClearMember = () => {
        setSelectedMember(null);
        setSearchQuery('');
        setDebouncedQuery('');
    };

    const handleSubmit = () => {
        if (!selectedMember || !selectedAccountId) return;
        mutation.mutate({
            memberId: selectedMember.member_id,
            accountId: selectedAccountId,
            transactionType,
            amount: numericAmount,
            paymentMethod,
            referenceNumber,
            notes,
            transactionDate,
        });
    };

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            {/* Member Search / Selection */}
            <Card className="shadow-sm lg:col-span-1">
                <CardHeader>
                    <CardTitle className="text-base">Find Member</CardTitle>
                    <CardDescription>Search by name, member number, or phone.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {selectedMember ? (
                        <div className="flex items-start justify-between rounded-lg border bg-slate-50 p-3">
                            <div className="flex items-start gap-2">
                                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
                                    <User className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">{selectedMember.member_name}</p>
                                    <p className="text-xs text-muted-foreground">#{selectedMember.member_number}{selectedMember.phone ? ` · ${selectedMember.phone}` : ''}</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClearMember}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    placeholder="Type at least 2 characters…"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8"
                                />
                            </div>

                            {isSearching && (
                                <div className="flex items-center justify-center gap-2 py-4 text-sm text-slate-500">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Searching…
                                </div>
                            )}

                            {isSearchError && (
                                <p className="flex items-center gap-1.5 text-sm text-red-600">
                                    <AlertCircle className="h-3.5 w-3.5" /> Search failed. Try again.
                                </p>
                            )}

                            {!isSearching && debouncedQuery.length >= 2 && searchResults?.length === 0 && (
                                <p className="py-4 text-center text-sm text-muted-foreground">No members match "{debouncedQuery}".</p>
                            )}

                            {searchResults && searchResults.length > 0 && (
                                <div className="max-h-72 space-y-1 overflow-y-auto">
                                    {searchResults.map((m) => (
                                        <button
                                            key={m.member_id}
                                            onClick={() => setSelectedMember(m)}
                                            className="flex w-full items-center gap-2 rounded-md border p-2 text-left transition-colors hover:bg-slate-50"
                                        >
                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100">
                                                <User className="h-3.5 w-3.5 text-slate-500" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-slate-900">{m.member_name}</p>
                                                <p className="truncate text-xs text-muted-foreground">#{m.member_number}{m.phone ? ` · ${m.phone}` : ''}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* Recent Activity — helps front desk avoid double entries */}
                    {selectedMember && (
                        <div className="space-y-2 pt-1">
                            <Separator />
                            <p className="text-xs font-semibold uppercase text-slate-500">Recent Activity</p>
                            {isLoadingRecent ? (
                                <div className="flex items-center gap-2 py-2 text-xs text-slate-500">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                                </div>
                            ) : !recentTx || recentTx.length === 0 ? (
                                <p className="py-2 text-xs text-muted-foreground">No recent transactions.</p>
                            ) : (
                                <div className="space-y-1.5">
                                    {recentTx.map((tx) => (
                                        <div key={tx.id} className="flex items-center justify-between text-xs">
                                            <span className="flex items-center gap-1 text-muted-foreground">
                                                {tx.type === 'deposit'
                                                    ? <ArrowUpCircle className="h-3 w-3 text-green-500" />
                                                    : <ArrowDownCircle className="h-3 w-3 text-orange-500" />}
                                                {format(new Date(tx.created_at), 'dd MMM, p')}
                                            </span>
                                            <span className="font-mono font-medium">{formatCurrency(tx.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Transaction Form */}
            <Card className="shadow-sm lg:col-span-2">
                <CardHeader>
                    <CardTitle className="text-base">Record Transaction</CardTitle>
                    <CardDescription>
                        {selectedMember ? `Posting a transaction for ${selectedMember.member_name}.` : 'Select a member to begin.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!selectedMember ? (
                        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-slate-50 p-10 text-center">
                            <Inbox className="h-6 w-6 text-slate-400" />
                            <p className="text-sm text-slate-500">Search and select a member on the left to record a deposit or withdrawal.</p>
                        </div>
                    ) : isLoadingAccounts ? (
                        <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed bg-slate-50 p-8">
                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                            <span className="text-sm text-slate-500">Loading accounts…</span>
                        </div>
                    ) : isAccountsError ? (
                        <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 text-center">
                            <AlertCircle className="mx-auto h-5 w-5 text-red-500" />
                            <p className="text-sm text-red-700">{(accountsError as Error)?.message || 'Could not load accounts.'}</p>
                            <Button size="sm" variant="outline" onClick={() => refetchAccounts()}>
                                <RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry
                            </Button>
                        </div>
                    ) : !accounts || accounts.length === 0 ? (
                        <div className="space-y-1 rounded-lg border border-dashed bg-slate-50 p-8 text-center">
                            <Inbox className="mx-auto h-5 w-5 text-slate-400" />
                            <p className="text-sm font-medium text-slate-700">No savings accounts found</p>
                            <p className="text-xs text-muted-foreground">This member has no active savings product to post against.</p>
                        </div>
                    ) : (
                        <>
                            {/* Transaction Type */}
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    type="button"
                                    variant={transactionType === 'deposit' ? 'default' : 'outline'}
                                    className={transactionType === 'deposit' ? 'bg-green-600 hover:bg-green-700' : ''}
                                    onClick={() => setTransactionType('deposit')}
                                >
                                    <ArrowUpCircle className="mr-2 h-4 w-4" /> Deposit
                                </Button>
                                <Button
                                    type="button"
                                    variant={transactionType === 'withdrawal' ? 'default' : 'outline'}
                                    className={transactionType === 'withdrawal' ? 'bg-orange-600 hover:bg-orange-700' : ''}
                                    onClick={() => setTransactionType('withdrawal')}
                                >
                                    <ArrowDownCircle className="mr-2 h-4 w-4" /> Withdrawal
                                </Button>
                            </div>

                            {/* Account Selection */}
                            <div className="space-y-1.5">
                                <Label htmlFor="account-select">Savings Account</Label>
                                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                                    <SelectTrigger id="account-select">
                                        <SelectValue placeholder="Select an account..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accounts.map(acc => (
                                            <SelectItem key={acc.account_id} value={acc.account_id}>
                                                {acc.product_name} — Balance: {formatCurrency(acc.balance)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {selectedAccount && (
                                    <p className="text-xs text-muted-foreground">
                                        Current balance: <strong className="text-slate-700">{formatCurrency(selectedAccount.balance)}</strong>
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="txn-amount">Amount (UGX)</Label>
                                    <Input
                                        id="txn-amount"
                                        type="number"
                                        min={0}
                                        placeholder="0"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                    />
                                    {insufficientFunds && (
                                        <p className="flex items-center gap-1 text-xs text-red-600">
                                            <AlertCircle className="h-3 w-3" /> Exceeds available balance.
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="txn-date">Transaction Date</Label>
                                    <Input
                                        id="txn-date"
                                        type="date"
                                        value={transactionDate}
                                        onChange={(e) => setTransactionDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div className="space-y-1.5">
                                <Label>Payment Method</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                                        <Button
                                            key={value}
                                            type="button"
                                            variant={paymentMethod === value ? 'default' : 'outline'}
                                            className={paymentMethod === value ? 'bg-slate-900 hover:bg-slate-800' : ''}
                                            onClick={() => setPaymentMethod(value)}
                                        >
                                            <Icon className="mr-2 h-4 w-4" /> {label}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {requiresReference && (
                                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                                    <Label htmlFor="ref-number">
                                        {paymentMethod === 'mobile_money' ? 'Mobile Money Transaction ID' : 'Bank Reference Number'}
                                    </Label>
                                    <Input
                                        id="ref-number"
                                        placeholder="e.g., MM240804.1234.A56789"
                                        value={referenceNumber}
                                        onChange={(e) => setReferenceNumber(e.target.value)}
                                    />
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <Label htmlFor="txn-notes">Notes (optional)</Label>
                                <Textarea
                                    id="txn-notes"
                                    placeholder="Any additional context for this transaction..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={2}
                                />
                            </div>
                        </>
                    )}
                </CardContent>

                {selectedMember && accounts && accounts.length > 0 && (
                    <CardFooter className="border-t bg-muted/50 px-6 py-4">
                        <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                            <AlertDialogTrigger asChild>
                                <Button className="ml-auto" size="lg" disabled={!canSubmit}>
                                    {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {transactionType === 'deposit' ? 'Record Deposit' : 'Record Withdrawal'}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm {transactionType === 'deposit' ? 'Deposit' : 'Withdrawal'}</AlertDialogTitle>
                                    <AlertDialogDescription asChild>
                                        <div className="space-y-3">
                                            <p>
                                                You're about to post a {transactionType} of{" "}
                                                <strong className="text-slate-900">{formatCurrency(numericAmount)}</strong> for{" "}
                                                <strong className="text-slate-900">{selectedMember?.member_name}</strong>.
                                            </p>
                                            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-slate-50 p-3 text-sm text-slate-700">
                                                <div>Account: <strong>{selectedAccount?.product_name}</strong></div>
                                                <div>Method: <strong className="capitalize">{paymentMethod.replace('_', ' ')}</strong></div>
                                                <div>Date: <strong>{format(new Date(transactionDate), 'PP')}</strong></div>
                                                <div>New Balance: <strong>
                                                    {formatCurrency(
                                                        (selectedAccount?.balance || 0) + (transactionType === 'deposit' ? numericAmount : -numericAmount)
                                                    )}
                                                </strong></div>
                                            </div>
                                        </div>
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Go Back</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={(e) => { e.preventDefault(); handleSubmit(); }}
                                        disabled={mutation.isPending}
                                    >
                                        {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Confirm & Post
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}