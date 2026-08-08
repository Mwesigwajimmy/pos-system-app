"use client";

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Loader2, Lock, Unlock, Search, X, History, AlertTriangle,
    ChevronLeft, ChevronRight, ShieldAlert, CalendarRange, Layers,
} from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
    AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LedgerScope = 'gl' | 'ap' | 'ar' | 'payroll';
type LockAction = 'lock' | 'unlock';

const LEDGER_SCOPES: { key: LedgerScope; label: string }[] = [
    { key: 'gl', label: 'General Ledger' },
    { key: 'ap', label: 'Accounts Payable' },
    { key: 'ar', label: 'Accounts Receivable' },
    { key: 'payroll', label: 'Payroll' },
];

// Roles permitted to act. Adjust to match your actual role taxonomy/column.
const ROLES_CAN_LOCK = ['owner', 'admin', 'controller', 'accountant'];
const ROLES_CAN_UNLOCK = ['owner', 'admin', 'controller'];

interface LedgerLockState {
    locked: boolean;
    locked_by_user_id?: string | null;
    locked_by_name?: string | null;
    locked_at?: string | null;
}

// Existing interface fields are untouched. New fields are additive and
// optional so this keeps working against rows that don't have them yet —
// add the corresponding columns on `accounting_fiscal_periods` when ready:
//   start_date date, end_date date, updated_at timestamptz,
//   locked_by_user_id uuid, lock_reason text, unlock_reason text,
//   ledger_locks jsonb
interface FiscalPeriod {
    id: string;
    entity: string;
    country: string;
    period_name: string;
    fiscal_year: number;
    is_locked: boolean;
    locked_at: string | null;
    locked_by: string | null;
    tenant_id: string;
    // additive
    start_date?: string | null;
    end_date?: string | null;
    updated_at?: string | null;
    ledger_locks?: Record<LedgerScope, LedgerLockState> | null;
}

// New table to add on the backend: fiscal_period_lock_history
//   id uuid pk, tenant_id uuid, period_id uuid references accounting_fiscal_periods,
//   action text ('lock' | 'unlock'), ledger_scope text ('gl'|'ap'|'ar'|'payroll'|'all'),
//   reason text, performed_by_user_id uuid, performed_by_name text, performed_at timestamptz
interface LockHistoryEntry {
    id: string;
    period_id: string;
    action: LockAction;
    ledger_scope: LedgerScope | 'all';
    reason: string;
    performed_by_name: string | null;
    performed_at: string;
}

interface Props {
    tenantId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLedgerLocks(period: FiscalPeriod): Record<LedgerScope, LedgerLockState> {
    if (period.ledger_locks) return period.ledger_locks;
    // Backward compatibility: rows without ledger_locks yet fall back to the
    // legacy single is_locked flag, treated as a General Ledger–only lock.
    return {
        gl: { locked: period.is_locked, locked_by_name: period.locked_by, locked_at: period.locked_at },
        ap: { locked: false },
        ar: { locked: false },
        payroll: { locked: false },
    };
}

function overallStatus(period: FiscalPeriod): 'locked' | 'partial' | 'open' {
    const locks = getLedgerLocks(period);
    const values = LEDGER_SCOPES.map(s => locks[s.key]?.locked);
    if (values.every(Boolean)) return 'locked';
    if (values.some(Boolean)) return 'partial';
    return 'open';
}

function formatDateRange(period: FiscalPeriod) {
    if (!period.start_date || !period.end_date) return '—';
    return `${format(new Date(period.start_date), 'd MMM')} – ${format(new Date(period.end_date), 'd MMM yyyy')}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LockDatesManager({ tenantId: propTenantId }: Props) {
    const { data: tenant } = useTenant();
    const tenantId = propTenantId || tenant?.id;
    const supabase = createClient();

    // -- Core state -----------------------------------------------------------

    const [periods, setPeriods] = useState<FiscalPeriod[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // -- Filters ----------------------------------------------------------------

    const [filter, setFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [yearFilter, setYearFilter] = useState<string>('all');
    const [entityFilter, setEntityFilter] = useState<string>('all');
    const [countryFilter, setCountryFilter] = useState<string>('all');

    // -- Pagination -------------------------------------------------------------

    const [page, setPage] = useState(1);
    const PAGE_SIZE = 12;

    // -- Selection / bulk actions --------------------------------------------------

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // -- Permissions -------------------------------------------------------------

    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentUserName, setCurrentUserName] = useState<string | null>(null);

    // -- Action dialog state -------------------------------------------------------

    const [pendingAction, setPendingAction] = useState<{
        periods: FiscalPeriod[];
        scope: LedgerScope | 'all';
        nextLocked: boolean;
    } | null>(null);
    const [reason, setReason] = useState('');
    const [typedConfirm, setTypedConfirm] = useState('');
    const [pendingTxCount, setPendingTxCount] = useState<number | null>(null);
    const [sequentialWarning, setSequentialWarning] = useState<string | null>(null);
    const [sequentialBlock, setSequentialBlock] = useState<string | null>(null);
    const [checkingGuards, setCheckingGuards] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // -- History dialog -------------------------------------------------------

    const [historyPeriod, setHistoryPeriod] = useState<FiscalPeriod | null>(null);
    const [historyEntries, setHistoryEntries] = useState<LockHistoryEntry[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // -- Bulk "close through" dialog -------------------------------------------------

    const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
    const [bulkEntity, setBulkEntity] = useState<string>('');
    const [bulkCountry, setBulkCountry] = useState<string>('');
    const [bulkCutoffId, setBulkCutoffId] = useState<string>('');
    const [bulkReason, setBulkReason] = useState('');
    const [bulkSubmitting, setBulkSubmitting] = useState(false);

    // -- Data fetching -------------------------------------------------------

    const fetchPeriods = useCallback(async () => {
        if (!tenantId) return;
        try {
            const { data, error } = await supabase
                .from('accounting_fiscal_periods')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('fiscal_year', { ascending: false })
                .order('period_name', { ascending: false });

            if (error) throw error;
            if (data) setPeriods(data as unknown as FiscalPeriod[]);
        } catch (error) {
            console.error("Error fetching fiscal periods:", error);
            toast.error('Could not load fiscal periods');
        } finally {
            setLoading(false);
        }
    }, [tenantId, supabase]);

    useEffect(() => {
        fetchPeriods();
    }, [fetchPeriods]);

    // Current user + role, for permission gating.
    useEffect(() => {
        const loadUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUserId(user.id);
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, full_name, email')
                .eq('id', user.id)
                .single();
            setCurrentUserRole(profile?.role ?? null);
            setCurrentUserName(profile?.full_name || profile?.email || user.email || null);
        };
        loadUser();
    }, [supabase]);

    // Realtime: pick up lock/unlock actions made by other users so the table
    // never shows a stale state and optimistic-concurrency conflicts are rare.
    useEffect(() => {
        if (!tenantId) return;
        const channel = supabase
            .channel(`fiscal_periods_${tenantId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'accounting_fiscal_periods', filter: `tenant_id=eq.${tenantId}` },
                () => fetchPeriods(),
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [tenantId, supabase, fetchPeriods]);

    // -- Derived: filters, dropdown option sources -------------------------------

    const fiscalYears = useMemo(() => Array.from(new Set(periods.map(p => p.fiscal_year))).sort((a, b) => b - a), [periods]);
    const entities = useMemo(() => Array.from(new Set(periods.map(p => p.entity))).sort(), [periods]);
    const countries = useMemo(() => Array.from(new Set(periods.map(p => p.country))).sort(), [periods]);

    const filtered = useMemo(() => {
        return periods.filter(p => {
            const matchesText =
                (p.entity || '').toLowerCase().includes(filter.toLowerCase()) ||
                (p.country || '').toLowerCase().includes(filter.toLowerCase()) ||
                (p.period_name || '').toLowerCase().includes(filter.toLowerCase());
            if (!matchesText) return false;
            if (statusFilter !== 'all' && overallStatus(p) !== statusFilter) return false;
            if (yearFilter !== 'all' && String(p.fiscal_year) !== yearFilter) return false;
            if (entityFilter !== 'all' && p.entity !== entityFilter) return false;
            if (countryFilter !== 'all' && p.country !== countryFilter) return false;
            return true;
        });
    }, [periods, filter, statusFilter, yearFilter, entityFilter, countryFilter]);

    useEffect(() => { setPage(1); }, [filter, statusFilter, yearFilter, entityFilter, countryFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    // -- Permission helpers -------------------------------------------------------

    const canLock = !!currentUserRole && ROLES_CAN_LOCK.includes(currentUserRole);
    const canUnlock = !!currentUserRole && ROLES_CAN_UNLOCK.includes(currentUserRole);

    // -- Sequential-close guard -------------------------------------------------

    // Periods must close/reopen in order. You cannot unlock a period while a
    // more recent period (same entity + country) is still fully locked, and
    // locking a period while an earlier one is still open is allowed but flagged.
    function checkUnlockGuard(period: FiscalPeriod, all: FiscalPeriod[]): string | null {
        if (!period.end_date) return null;
        const later = all
            .filter(p => p.id !== period.id && p.entity === period.entity && p.country === period.country && p.end_date)
            .filter(p => new Date(p.end_date!).getTime() > new Date(period.end_date!).getTime())
            .filter(p => overallStatus(p) === 'locked')
            .sort((a, b) => new Date(b.end_date!).getTime() - new Date(a.end_date!).getTime());
        if (later.length > 0) {
            return `Unlock ${later[0].period_name} ${later[0].fiscal_year} first — periods must reopen in reverse chronological order.`;
        }
        return null;
    }

    function checkLockWarning(period: FiscalPeriod, all: FiscalPeriod[]): string | null {
        if (!period.start_date) return null;
        const earlier = all
            .filter(p => p.id !== period.id && p.entity === period.entity && p.country === period.country && p.end_date)
            .filter(p => new Date(p.end_date!).getTime() < new Date(period.start_date!).getTime())
            .filter(p => overallStatus(p) !== 'locked');
        if (earlier.length > 0) {
            return `${earlier.length} earlier period(s) for ${period.entity} are still open.`;
        }
        return null;
    }

    // Best-effort check for unposted/draft transactions in the period's date
    // range. Adjust table/column names to your actual transactions schema —
    // this fails silently (no warning shown) if the table doesn't match.
    async function checkPendingTransactions(period: FiscalPeriod): Promise<number | null> {
        if (!period.start_date || !period.end_date) return null;
        try {
            const { count, error } = await supabase
                .from('transactions')
                .select('id', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)
                .eq('entity', period.entity)
                .in('status', ['draft', 'pending'])
                .gte('date', period.start_date)
                .lte('date', period.end_date);
            if (error) return null;
            return count ?? 0;
        } catch {
            return null;
        }
    }

    // -- Opening the confirm dialog -------------------------------------------------

    async function openActionDialog(period: FiscalPeriod, scope: LedgerScope | 'all', nextLocked: boolean) {
        if (nextLocked && !canLock) {
            toast.error('You do not have permission to lock periods.');
            return;
        }
        if (!nextLocked && !canUnlock) {
            toast.error('You do not have permission to reopen a locked period.');
            return;
        }

        setPendingAction({ periods: [period], scope, nextLocked });
        setReason('');
        setTypedConfirm('');
        setPendingTxCount(null);
        setSequentialWarning(null);
        setSequentialBlock(null);
        setCheckingGuards(true);

        if (!nextLocked) {
            setSequentialBlock(checkUnlockGuard(period, periods));
        } else {
            setSequentialWarning(checkLockWarning(period, periods));
            const count = await checkPendingTransactions(period);
            setPendingTxCount(count);
        }
        setCheckingGuards(false);
    }

    // -- Executing lock/unlock (single or bulk) -------------------------------------

    async function applyLockChange(period: FiscalPeriod, scope: LedgerScope | 'all', nextLocked: boolean, reasonText: string) {
        const locks = getLedgerLocks(period);
        const nextLocks: Record<LedgerScope, LedgerLockState> = { ...locks };
        const scopesToUpdate: LedgerScope[] = scope === 'all' ? LEDGER_SCOPES.map(s => s.key) : [scope];

        for (const s of scopesToUpdate) {
            nextLocks[s] = {
                locked: nextLocked,
                locked_by_user_id: nextLocked ? currentUserId : null,
                locked_by_name: nextLocked ? currentUserName : null,
                locked_at: nextLocked ? new Date().toISOString() : null,
            };
        }

        const glLocked = nextLocks.gl.locked;
        const updates: Partial<FiscalPeriod> & Record<string, unknown> = {
            is_locked: glLocked,
            locked_at: glLocked ? nextLocks.gl.locked_at : null,
            locked_by: glLocked ? currentUserName : null,
            ledger_locks: nextLocks,
            [nextLocked ? 'lock_reason' : 'unlock_reason']: reasonText,
        };

        // Optimistic concurrency: only apply if nobody else changed this row
        // since we loaded it. Falls back to an unconditional match while the
        // updated_at column doesn't exist yet on older schemas.
        let query = supabase.from('accounting_fiscal_periods').update(updates).eq('id', period.id).eq('tenant_id', tenantId);
        if (period.updated_at) query = query.eq('updated_at', period.updated_at);
        const { data, error } = await query.select();

        if (error) return { ok: false, message: error.message };
        if (!data || data.length === 0) {
            return { ok: false, message: `${period.period_name} ${period.fiscal_year} was modified by someone else — refresh and try again.` };
        }

        // Audit trail. Non-fatal if this table doesn't exist yet.
        try {
            await supabase.from('fiscal_period_lock_history').insert({
                tenant_id: tenantId,
                period_id: period.id,
                action: nextLocked ? 'lock' : 'unlock',
                ledger_scope: scope,
                reason: reasonText,
                performed_by_user_id: currentUserId,
                performed_by_name: currentUserName,
                performed_at: new Date().toISOString(),
            });
        } catch (e) {
            console.warn('Lock history not recorded:', e);
        }

        return { ok: true };
    }

    async function executeAction() {
        if (!pendingAction) return;
        if (reason.trim().length < 10) {
            toast.error('Enter a reason of at least 10 characters.');
            return;
        }
        if (!pendingAction.nextLocked && typedConfirm !== 'UNLOCK') {
            toast.error('Type UNLOCK to confirm reopening this period.');
            return;
        }
        if (!pendingAction.nextLocked && sequentialBlock) {
            toast.error(sequentialBlock);
            return;
        }

        setSubmitting(true);
        let successCount = 0;
        let failCount = 0;

        for (const period of pendingAction.periods) {
            setProcessingId(period.id);
            const result = await applyLockChange(period, pendingAction.scope, pendingAction.nextLocked, reason.trim());
            if (result.ok) successCount++;
            else { failCount++; toast.error(result.message || `Failed to update ${period.period_name}`); }
        }

        setProcessingId(null);
        setSubmitting(false);
        setPendingAction(null);
        setSelectedIds(new Set());

        if (successCount > 0) {
            toast.success(
                pendingAction.nextLocked
                    ? `${successCount} period(s) locked`
                    : `${successCount} period(s) reopened`,
                failCount > 0 ? { description: `${failCount} could not be updated.` } : undefined,
            );
        }
        fetchPeriods();
    }

    // -- History dialog -------------------------------------------------------

    async function openHistory(period: FiscalPeriod) {
        setHistoryPeriod(period);
        setHistoryLoading(true);
        try {
            const { data, error } = await supabase
                .from('fiscal_period_lock_history')
                .select('*')
                .eq('period_id', period.id)
                .order('performed_at', { ascending: false });
            if (error) throw error;
            setHistoryEntries((data as unknown as LockHistoryEntry[]) || []);
        } catch (e) {
            setHistoryEntries([]);
        } finally {
            setHistoryLoading(false);
        }
    }

    // -- Bulk selection -------------------------------------------------------

    function toggleSelect(id: string) {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    function toggleSelectPage() {
        setSelectedIds(prev => {
            const next = new Set(prev);
            const allSelected = pageRows.every(p => next.has(p.id));
            for (const p of pageRows) {
                if (allSelected) next.delete(p.id); else next.add(p.id);
            }
            return next;
        });
    }

    function openBulkFromSelection(nextLocked: boolean) {
        const selected = periods.filter(p => selectedIds.has(p.id));
        if (selected.length === 0) return;
        if (nextLocked && !canLock) { toast.error('You do not have permission to lock periods.'); return; }
        if (!nextLocked && !canUnlock) { toast.error('You do not have permission to reopen locked periods.'); return; }
        setPendingAction({ periods: selected, scope: 'all', nextLocked });
        setReason('');
        setTypedConfirm('');
        setSequentialBlock(null);
        setSequentialWarning(null);
        setPendingTxCount(null);
    }

    // -- Bulk "close periods through" dialog -------------------------------------

    const bulkEntityCountries = useMemo(
        () => Array.from(new Set(periods.filter(p => p.entity === bulkEntity).map(p => p.country))),
        [periods, bulkEntity],
    );
    const bulkEligiblePeriods = useMemo(
        () => periods
            .filter(p => p.entity === bulkEntity && p.country === bulkCountry && p.end_date)
            .sort((a, b) => new Date(a.end_date!).getTime() - new Date(b.end_date!).getTime()),
        [periods, bulkEntity, bulkCountry],
    );
    const bulkCutoffPeriod = bulkEligiblePeriods.find(p => p.id === bulkCutoffId) || null;
    const bulkTargets = useMemo(() => {
        if (!bulkCutoffPeriod?.end_date) return [];
        return bulkEligiblePeriods.filter(
            p => new Date(p.end_date!).getTime() <= new Date(bulkCutoffPeriod.end_date!).getTime() && overallStatus(p) !== 'locked',
        );
    }, [bulkEligiblePeriods, bulkCutoffPeriod]);

    async function submitBulkClose() {
        if (bulkReason.trim().length < 10) { toast.error('Enter a reason of at least 10 characters.'); return; }
        if (bulkTargets.length === 0) { toast.error('No open periods in this range.'); return; }
        setBulkSubmitting(true);
        let successCount = 0;
        for (const period of bulkTargets) {
            const result = await applyLockChange(period, 'all', true, bulkReason.trim());
            if (result.ok) successCount++;
        }
        setBulkSubmitting(false);
        setBulkDialogOpen(false);
        setBulkReason('');
        setBulkCutoffId('');
        toast.success(`${successCount} of ${bulkTargets.length} periods locked`);
        fetchPeriods();
    }

    // ---------------------------------------------------------------------------

    if (loading && !periods.length) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Fiscal Period Lock Dates</CardTitle>
                    <CardDescription>Loading period configuration...</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <CardTitle>Fiscal Period Lock Dates</CardTitle>
                        <CardDescription>
                            Close or reopen fiscal periods by entity, tenant, and country, with full audit trail for global compliance.
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setBulkDialogOpen(true)} className="gap-2 shrink-0">
                        <CalendarRange className="h-4 w-4" /> Close periods through…
                    </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                    <div className="relative max-w-xs flex-1 min-w-[180px]">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filter periods..."
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            className="pl-8"
                        />
                        {filter && (
                            <X
                                className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground"
                                onClick={() => setFilter('')}
                            />
                        )}
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            <SelectItem value="locked">Fully locked</SelectItem>
                            <SelectItem value="partial">Partially locked</SelectItem>
                            <SelectItem value="open">Open</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={yearFilter} onValueChange={setYearFilter}>
                        <SelectTrigger className="w-[120px]"><SelectValue placeholder="Year" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All years</SelectItem>
                            {fiscalYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={entityFilter} onValueChange={setEntityFilter}>
                        <SelectTrigger className="w-[160px]"><SelectValue placeholder="Entity" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All entities</SelectItem>
                            {entities.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={countryFilter} onValueChange={setCountryFilter}>
                        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Country" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All countries</SelectItem>
                            {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-3 mt-3 px-3 py-2 rounded-md bg-muted">
                        <span className="text-sm font-medium">{selectedIds.size} selected</span>
                        <Button size="sm" variant="outline" onClick={() => openBulkFromSelection(true)} className="gap-1.5">
                            <Lock className="h-3.5 w-3.5" /> Lock selected
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openBulkFromSelection(false)} className="gap-1.5">
                            <Unlock className="h-3.5 w-3.5" /> Unlock selected
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
                    </div>
                )}

                {!currentUserRole && (
                    <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                        <ShieldAlert className="h-3.5 w-3.5" /> Your role could not be verified — lock/unlock actions are disabled.
                    </div>
                )}
            </CardHeader>

            <CardContent>
                <ScrollArea className="h-[480px] border rounded-md">
                    <Table>
                        <TableHeader className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="w-10">
                                    <Checkbox
                                        checked={pageRows.length > 0 && pageRows.every(p => selectedIds.has(p.id))}
                                        onCheckedChange={toggleSelectPage}
                                    />
                                </TableHead>
                                <TableHead>Entity</TableHead>
                                <TableHead>Country</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead>Date range</TableHead>
                                <TableHead>Year</TableHead>
                                <TableHead>Sub-ledgers</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Locked by</TableHead>
                                <TableHead>Lock date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                                        No fiscal periods found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pageRows.map(p => {
                                    const locks = getLedgerLocks(p);
                                    const status = overallStatus(p);
                                    return (
                                        <TableRow key={p.id}>
                                            <TableCell>
                                                <Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                                            </TableCell>
                                            <TableCell className="font-medium">{p.entity}</TableCell>
                                            <TableCell>{p.country}</TableCell>
                                            <TableCell>{p.period_name}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDateRange(p)}</TableCell>
                                            <TableCell>{p.fiscal_year}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    {LEDGER_SCOPES.map(s => (
                                                        <button
                                                            key={s.key}
                                                            title={`${s.label}: ${locks[s.key]?.locked ? 'Locked' : 'Open'} — click to toggle`}
                                                            onClick={() => openActionDialog(p, s.key, !locks[s.key]?.locked)}
                                                            className={`h-6 w-6 rounded text-[10px] font-bold flex items-center justify-center border transition-colors ${
                                                                locks[s.key]?.locked
                                                                    ? 'bg-red-50 border-red-200 text-red-600'
                                                                    : 'bg-green-50 border-green-200 text-green-600'
                                                            }`}
                                                        >
                                                            {s.key.slice(0, 2).toUpperCase()}
                                                        </button>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {status === 'locked' && (
                                                    <Badge variant="destructive" className="flex w-fit items-center gap-1">
                                                        <Lock className="h-3 w-3" /> Locked
                                                    </Badge>
                                                )}
                                                {status === 'partial' && (
                                                    <Badge variant="outline" className="flex w-fit items-center gap-1 text-amber-700 border-amber-200 bg-amber-50">
                                                        <Layers className="h-3 w-3" /> Partial
                                                    </Badge>
                                                )}
                                                {status === 'open' && (
                                                    <Badge variant="outline" className="flex w-fit items-center gap-1 text-green-600 border-green-200 bg-green-50">
                                                        <Unlock className="h-3 w-3" /> Open
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{p.locked_by || "-"}</TableCell>
                                            <TableCell className="text-xs">
                                                {p.locked_at ? format(new Date(p.locked_at), 'MMM d, yyyy') : "-"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1.5">
                                                    <Button size="sm" variant="ghost" onClick={() => openHistory(p)} title="View history">
                                                        <History className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant={status === 'locked' ? "outline" : "default"}
                                                        disabled={processingId === p.id || (status === 'locked' ? !canUnlock : !canLock)}
                                                        onClick={() => openActionDialog(p, 'all', status !== 'locked')}
                                                        className={status === 'locked' ? "" : "bg-red-600 hover:bg-red-700"}
                                                    >
                                                        {processingId === p.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : status === 'locked' ? (
                                                            <><Unlock className="h-4 w-4 mr-2" />Unlock</>
                                                        ) : (
                                                            <><Lock className="h-4 w-4 mr-2" />Lock</>
                                                        )}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>

                {filtered.length > 0 && (
                    <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-muted-foreground">
                            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                        </span>
                        <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-xs">{page} / {totalPages}</span>
                            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>

            {/* ---------------------------------------------------------- LOCK / UNLOCK CONFIRM */}
            <AlertDialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {pendingAction?.nextLocked ? 'Lock' : 'Reopen'} {pendingAction && pendingAction.periods.length > 1
                                ? `${pendingAction.periods.length} periods`
                                : `${pendingAction?.periods[0]?.period_name} ${pendingAction?.periods[0]?.fiscal_year}`}
                            {pendingAction?.scope !== 'all' && ` — ${LEDGER_SCOPES.find(s => s.key === pendingAction?.scope)?.label}`}
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3 text-sm text-foreground">
                                {!pendingAction?.nextLocked && (
                                    <p className="text-amber-700">
                                        Reopening a closed period allows new postings against it. This action is recorded in the audit trail.
                                    </p>
                                )}

                                {checkingGuards && (
                                    <p className="text-muted-foreground flex items-center gap-2 text-xs">
                                        <Loader2 className="h-3 w-3 animate-spin" /> Checking dependencies…
                                    </p>
                                )}

                                {sequentialBlock && (
                                    <p className="flex items-center gap-2 text-red-600 text-xs font-medium">
                                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {sequentialBlock}
                                    </p>
                                )}
                                {sequentialWarning && (
                                    <p className="flex items-center gap-2 text-amber-600 text-xs font-medium">
                                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {sequentialWarning}
                                    </p>
                                )}
                                {pendingTxCount !== null && pendingTxCount > 0 && (
                                    <p className="flex items-center gap-2 text-amber-600 text-xs font-medium">
                                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {pendingTxCount} unposted transaction(s) fall inside this period.
                                    </p>
                                )}

                                <div className="space-y-1.5 pt-1">
                                    <label className="text-xs font-medium text-muted-foreground">Reason (required)</label>
                                    <Textarea
                                        value={reason}
                                        onChange={e => setReason(e.target.value)}
                                        placeholder="e.g. Month-end close completed and reconciled"
                                        rows={3}
                                    />
                                </div>

                                {!pendingAction?.nextLocked && (
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-muted-foreground">
                                            Type <span className="font-mono font-semibold">UNLOCK</span> to confirm
                                        </label>
                                        <Input value={typedConfirm} onChange={e => setTypedConfirm(e.target.value)} />
                                    </div>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPendingAction(null)}>Cancel</AlertDialogCancel>
                        <Button
                            onClick={executeAction}
                            disabled={submitting || !!sequentialBlock}
                            variant={pendingAction?.nextLocked ? 'default' : 'destructive'}
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : pendingAction?.nextLocked ? 'Confirm lock' : 'Confirm unlock'}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ---------------------------------------------------------- HISTORY */}
            <Dialog open={!!historyPeriod} onOpenChange={(open) => !open && setHistoryPeriod(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{historyPeriod?.period_name} {historyPeriod?.fiscal_year} — history</DialogTitle>
                        <DialogDescription>{historyPeriod?.entity} · {historyPeriod?.country}</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[400px]">
                        {historyLoading ? (
                            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                        ) : historyEntries.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-6 text-center">No history recorded yet.</p>
                        ) : (
                            <div className="space-y-3 py-2">
                                {historyEntries.map(entry => (
                                    <div key={entry.id} className="flex gap-3 text-sm border-b pb-3 last:border-none">
                                        <div className="shrink-0 pt-0.5">
                                            {entry.action === 'lock' ? <Lock className="h-4 w-4 text-red-500" /> : <Unlock className="h-4 w-4 text-green-600" />}
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="font-medium">
                                                {entry.action === 'lock' ? 'Locked' : 'Reopened'}
                                                {entry.ledger_scope !== 'all' && ` — ${LEDGER_SCOPES.find(s => s.key === entry.ledger_scope)?.label}`}
                                            </p>
                                            <p className="text-muted-foreground text-xs">{entry.reason}</p>
                                            <p className="text-muted-foreground text-xs">
                                                {entry.performed_by_name || 'Unknown'} · {format(new Date(entry.performed_at), 'MMM d, yyyy p')}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            {/* ---------------------------------------------------------- BULK CLOSE THROUGH */}
            <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Close periods through…</DialogTitle>
                        <DialogDescription>Locks every open period up to and including the cutoff you choose.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Entity</label>
                                <Select value={bulkEntity} onValueChange={v => { setBulkEntity(v); setBulkCountry(''); setBulkCutoffId(''); }}>
                                    <SelectTrigger><SelectValue placeholder="Select entity" /></SelectTrigger>
                                    <SelectContent>{entities.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Country</label>
                                <Select value={bulkCountry} onValueChange={v => { setBulkCountry(v); setBulkCutoffId(''); }} disabled={!bulkEntity}>
                                    <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                                    <SelectContent>{bulkEntityCountries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Cutoff period</label>
                            <Select value={bulkCutoffId} onValueChange={setBulkCutoffId} disabled={!bulkCountry}>
                                <SelectTrigger><SelectValue placeholder="Select cutoff period" /></SelectTrigger>
                                <SelectContent>
                                    {bulkEligiblePeriods.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.period_name} {p.fiscal_year}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {bulkCutoffPeriod && (
                            <div className="rounded-md border p-3 text-sm">
                                <p className="font-medium mb-1">{bulkTargets.length} period(s) will be locked:</p>
                                <p className="text-muted-foreground text-xs">
                                    {bulkTargets.map(p => `${p.period_name} ${p.fiscal_year}`).join(', ') || 'None — all already locked.'}
                                </p>
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Reason (required)</label>
                            <Textarea value={bulkReason} onChange={e => setBulkReason(e.target.value)} rows={3} placeholder="e.g. FY2025 year-end close" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
                        <Button onClick={submitBulkClose} disabled={bulkSubmitting || bulkTargets.length === 0}>
                            {bulkSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : `Lock ${bulkTargets.length} period(s)`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}