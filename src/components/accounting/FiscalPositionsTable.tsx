"use client";

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Loader2, Search, X, Plus, Pencil, History, Download, ArrowUpDown,
    AlertTriangle, ShieldAlert, RefreshCw, Star, Trash2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
    AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';

// ---------------------------------------------------------------------------
// Types
//
// Nothing about jurisdictions, tax types, treatments, or categories is
// hardcoded anywhere in this file. Every dropdown/autocomplete is built from
// values that already exist in your data so this works identically for
// VAT/GST regimes, US-style stacked sales tax, and anything else, in any
// country or subdivision, worldwide.
// ---------------------------------------------------------------------------

interface TaxRateComponent {
    id: string;
    label: string;            // e.g. "State Sales Tax", "County Tax", "VAT Standard" — free text
    tax_type: string;         // free text, autocompletes from values already in use
    rate: number;              // percentage
    compound: boolean;         // applies on top of the cumulative amount rather than the flat base
    account_id?: string | null;
    account_name?: string | null;
}

// Existing columns are untouched. New columns are additive — add these to
// `accounting_fiscal_positions` when ready:
//   country_code text, region text, region_code text, locality text,
//   jurisdiction_code text, tax_treatment text, registration_number text,
//   is_default boolean, rate_components jsonb, valid_from date, valid_to date,
//   created_by uuid, created_by_name text, created_at timestamptz,
//   updated_by uuid, updated_by_name text, updated_at timestamptz
interface FiscalPosition {
    id: string;
    tenant_id: string;
    entity: string;
    country: string;
    country_code?: string | null;
    region?: string | null;
    region_code?: string | null;
    locality?: string | null;
    jurisdiction_code?: string | null;
    description: string;
    vat_category: string;
    applies_to: string;
    tax_treatment?: string | null;
    registration_number?: string | null;
    is_default?: boolean | null;
    active: boolean;
    rate_components?: TaxRateComponent[] | null;
    valid_from?: string | null;
    valid_to?: string | null;
    created_by_name?: string | null;
    created_at?: string | null;
    updated_by_name?: string | null;
    updated_at?: string | null;
}

// New table to add on the backend: fiscal_position_history
//   id uuid pk, tenant_id uuid, position_id uuid references accounting_fiscal_positions,
//   action text ('created'|'updated'|'activated'|'deactivated'),
//   summary text, performed_by_name text, performed_at timestamptz
interface PositionHistoryEntry {
    id: string;
    position_id: string;
    action: string;
    summary: string | null;
    performed_by_name: string | null;
    performed_at: string;
}

interface AccountOption {
    id: string;
    name: string;
    code?: string | null;
}

interface Props {
    tenantId?: string;
}

// Roles permitted to create/edit/deactivate. This is an authorization list,
// not tax data — adjust to your role taxonomy, or better, drive it from a
// permissions table if you have one.
const ROLES_CAN_MANAGE = ['owner', 'admin', 'controller', 'tax_manager'];

const EMPTY_COMPONENT = (): TaxRateComponent => ({
    id: crypto.randomUUID(),
    label: '',
    tax_type: '',
    rate: 0,
    compound: false,
    account_id: null,
    account_name: null,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function distinct(values: (string | null | undefined)[]): string[] {
    return Array.from(new Set(values.filter((v): v is string => !!v && v.trim().length > 0))).sort();
}

function computeEffectiveRate(components: TaxRateComponent[] | null | undefined): number {
    if (!components || components.length === 0) return 0;
    let multiplier = 1;
    let flatSum = 0;
    for (const c of components) {
        if (c.compound) multiplier *= 1 + (c.rate || 0) / 100;
        else flatSum += c.rate || 0;
    }
    const compoundContribution = (multiplier - 1) * 100;
    return flatSum + compoundContribution;
}

function getEffectiveStatus(p: FiscalPosition, asOf: Date): 'current' | 'future' | 'expired' {
    if (p.valid_from && isAfter(parseISO(p.valid_from), asOf)) return 'future';
    if (p.valid_to && isBefore(parseISO(p.valid_to), asOf)) return 'expired';
    return 'current';
}

function isExpiringSoon(p: FiscalPosition, asOf: Date): boolean {
    if (!p.valid_to) return false;
    const to = parseISO(p.valid_to);
    return !isBefore(to, asOf) && isBefore(to, addDays(asOf, 30));
}

function exportCsv(rows: FiscalPosition[]) {
    const headers = [
        'Entity', 'Country', 'Region', 'Locality', 'Jurisdiction Code', 'Description', 'VAT/GST Category',
        'Applies To', 'Tax Treatment', 'Registration No.', 'Effective Rate %', 'Valid From', 'Valid To',
        'Status', 'Default',
    ];
    const csvRows = rows.map(p => [
        p.entity, p.country, p.region || '', p.locality || '', p.jurisdiction_code || '', p.description,
        p.vat_category, p.applies_to, p.tax_treatment || '', p.registration_number || '',
        computeEffectiveRate(p.rate_components).toFixed(3), p.valid_from || '', p.valid_to || '',
        p.active ? 'Active' : 'Inactive', p.is_default ? 'Yes' : 'No',
    ]);
    const csv = [headers, ...csvRows]
        .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fiscal-positions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// Native <input list> + <datalist> autocomplete: offers existing values but
// never restricts input to them, so nothing is ever hardcoded or locked down.
function ComboField({ id, value, onChange, options, placeholder, className }: {
    id: string; value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; className?: string;
}) {
    return (
        <>
            <Input list={id} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={className} />
            <datalist id={id}>
                {options.map(o => <option key={o} value={o} />)}
            </datalist>
        </>
    );
}

type SortKey = 'entity' | 'country' | 'region' | 'description' | 'rate' | 'status';

const emptyForm = (): Omit<FiscalPosition, 'id' | 'tenant_id'> => ({
    entity: '',
    country: '',
    country_code: '',
    region: '',
    region_code: '',
    locality: '',
    jurisdiction_code: '',
    description: '',
    vat_category: '',
    applies_to: '',
    tax_treatment: '',
    registration_number: '',
    is_default: false,
    active: true,
    rate_components: [EMPTY_COMPONENT()],
    valid_from: format(new Date(), 'yyyy-MM-dd'),
    valid_to: '',
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FiscalPositionsTable({ tenantId: propTenantId }: Props) {
    const { data: tenant } = useTenant();
    const tenantId = propTenantId || tenant?.id;
    const supabase = createClient();

    // -- Core state -----------------------------------------------------------

    const [positions, setPositions] = useState<FiscalPosition[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [accounts, setAccounts] = useState<AccountOption[]>([]);

    // -- Permissions -------------------------------------------------------------

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentUserName, setCurrentUserName] = useState<string | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const canManage = !!currentUserRole && ROLES_CAN_MANAGE.includes(currentUserRole);

    // -- Filters ----------------------------------------------------------------

    const [filter, setFilter] = useState('');
    const [countryFilter, setCountryFilter] = useState('all');
    const [regionFilter, setRegionFilter] = useState('all');
    const [taxTypeFilter, setTaxTypeFilter] = useState('all');
    const [treatmentFilter, setTreatmentFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all'); // all | active | inactive
    const [asOfDate, setAsOfDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    // -- Sorting / pagination -------------------------------------------------------

    const [sortKey, setSortKey] = useState<SortKey>('country');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 15;

    // -- Expand descriptions -------------------------------------------------------

    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    // -- Create / edit dialog -------------------------------------------------------

    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm());
    const [saving, setSaving] = useState(false);

    // -- Deactivate / reactivate confirm -------------------------------------------------

    const [statusChangeTarget, setStatusChangeTarget] = useState<FiscalPosition | null>(null);
    const [statusChangeReason, setStatusChangeReason] = useState('');
    const [usageCount, setUsageCount] = useState<number | null>(null);
    const [checkingUsage, setCheckingUsage] = useState(false);
    const [statusChangeSubmitting, setStatusChangeSubmitting] = useState(false);

    // -- History dialog -------------------------------------------------------

    const [historyTarget, setHistoryTarget] = useState<FiscalPosition | null>(null);
    const [historyEntries, setHistoryEntries] = useState<PositionHistoryEntry[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // -- Data fetching -------------------------------------------------------

    const fetchPositions = useCallback(async () => {
        if (!tenantId) return;
        setLoading(true);
        setLoadError(null);
        const { data, error } = await supabase
            .from('accounting_fiscal_positions')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('country', { ascending: true });

        if (error) {
            setLoadError(error.message);
            setPositions([]);
        } else {
            setPositions((data ?? []) as FiscalPosition[]);
        }
        setLoading(false);
    }, [tenantId, supabase]);

    useEffect(() => { fetchPositions(); }, [fetchPositions]);

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

    // GL accounts for rate-component mapping — fetched, never hardcoded.
    useEffect(() => {
        const loadAccounts = async () => {
            if (!tenantId) return;
            const { data, error } = await supabase
                .from('accounting_accounts')
                .select('id, name, code')
                .eq('tenant_id', tenantId)
                .eq('is_active', true);
            if (!error && data) setAccounts(data as AccountOption[]);
        };
        loadAccounts();
    }, [tenantId, supabase]);

    // -- Dynamic option sources (all derived from real data) -------------------------

    const countryOptions = useMemo(() => distinct(positions.map(p => p.country)), [positions]);
    const regionOptionsForFilter = useMemo(
        () => distinct(positions.filter(p => countryFilter === 'all' || p.country === countryFilter).map(p => p.region)),
        [positions, countryFilter],
    );
    const taxTypeOptions = useMemo(
        () => distinct(positions.flatMap(p => (p.rate_components || []).map(c => c.tax_type))),
        [positions],
    );
    const treatmentOptions = useMemo(() => distinct(positions.map(p => p.tax_treatment)), [positions]);
    const entityOptions = useMemo(() => distinct(positions.map(p => p.entity)), [positions]);
    const vatCategoryOptions = useMemo(() => distinct(positions.map(p => p.vat_category)), [positions]);
    const appliesToOptions = useMemo(() => distinct(positions.map(p => p.applies_to)), [positions]);
    const regionOptionsForForm = useMemo(
        () => distinct(positions.filter(p => !form.country || p.country === form.country).map(p => p.region)),
        [positions, form.country],
    );
    const localityOptionsForForm = useMemo(
        () => distinct(positions.filter(p => !form.region || p.region === form.region).map(p => p.locality)),
        [positions, form.region],
    );

    // -- Filtering, sorting, pagination -------------------------------------------------

    const asOf = useMemo(() => parseISO(asOfDate), [asOfDate]);

    const filtered = useMemo(() => {
        return positions.filter(p => {
            const text = filter.toLowerCase();
            const matchesText =
                !text ||
                (p.entity || '').toLowerCase().includes(text) ||
                (p.country || '').toLowerCase().includes(text) ||
                (p.region || '').toLowerCase().includes(text) ||
                (p.locality || '').toLowerCase().includes(text) ||
                (p.vat_category || '').toLowerCase().includes(text) ||
                (p.description || '').toLowerCase().includes(text) ||
                (p.registration_number || '').toLowerCase().includes(text);
            if (!matchesText) return false;
            if (countryFilter !== 'all' && p.country !== countryFilter) return false;
            if (regionFilter !== 'all' && p.region !== regionFilter) return false;
            if (treatmentFilter !== 'all' && p.tax_treatment !== treatmentFilter) return false;
            if (taxTypeFilter !== 'all' && !(p.rate_components || []).some(c => c.tax_type === taxTypeFilter)) return false;
            if (statusFilter === 'active' && !p.active) return false;
            if (statusFilter === 'inactive' && p.active) return false;
            return true;
        });
    }, [positions, filter, countryFilter, regionFilter, treatmentFilter, taxTypeFilter, statusFilter]);

    const sorted = useMemo(() => {
        const copy = [...filtered];
        copy.sort((a, b) => {
            let av: string | number = '';
            let bv: string | number = '';
            if (sortKey === 'rate') { av = computeEffectiveRate(a.rate_components); bv = computeEffectiveRate(b.rate_components); }
            else if (sortKey === 'status') { av = a.active ? 1 : 0; bv = b.active ? 1 : 0; }
            else { av = (a[sortKey] as string) || ''; bv = (b[sortKey] as string) || ''; }
            if (av < bv) return sortDir === 'asc' ? -1 : 1;
            if (av > bv) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        return copy;
    }, [filtered, sortKey, sortDir]);

    useEffect(() => { setPage(1); }, [filter, countryFilter, regionFilter, treatmentFilter, taxTypeFilter, statusFilter]);
    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    function toggleSort(key: SortKey) {
        if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        else { setSortKey(key); setSortDir('asc'); }
    }

    // -- Summary strip -------------------------------------------------------

    const summary = useMemo(() => {
        const active = positions.filter(p => p.active).length;
        const countries = distinct(positions.map(p => p.country)).length;
        const regions = distinct(positions.map(p => p.region)).length;
        const expiringSoon = positions.filter(p => p.active && isExpiringSoon(p, asOf)).length;
        return { total: positions.length, active, countries, regions, expiringSoon };
    }, [positions, asOf]);

    // -- Create / edit dialog handlers -------------------------------------------------

    function openCreate() {
        if (!canManage) { toast.error('You do not have permission to manage fiscal positions.'); return; }
        setEditingId(null);
        setForm(emptyForm());
        setFormOpen(true);
    }

    function openEdit(p: FiscalPosition) {
        if (!canManage) { toast.error('You do not have permission to manage fiscal positions.'); return; }
        setEditingId(p.id);
        setForm({
            entity: p.entity, country: p.country, country_code: p.country_code || '',
            region: p.region || '', region_code: p.region_code || '', locality: p.locality || '',
            jurisdiction_code: p.jurisdiction_code || '', description: p.description,
            vat_category: p.vat_category, applies_to: p.applies_to, tax_treatment: p.tax_treatment || '',
            registration_number: p.registration_number || '', is_default: !!p.is_default, active: p.active,
            rate_components: p.rate_components && p.rate_components.length > 0 ? p.rate_components : [EMPTY_COMPONENT()],
            valid_from: p.valid_from || '', valid_to: p.valid_to || '',
        });
        setFormOpen(true);
    }

    function updateComponent(index: number, patch: Partial<TaxRateComponent>) {
        setForm(f => {
            const next = [...(f.rate_components || [])];
            next[index] = { ...next[index], ...patch };
            return { ...f, rate_components: next };
        });
    }
    function addComponent() {
        setForm(f => ({ ...f, rate_components: [...(f.rate_components || []), EMPTY_COMPONENT()] }));
    }
    function removeComponent(index: number) {
        setForm(f => ({ ...f, rate_components: (f.rate_components || []).filter((_, i) => i !== index) }));
    }

    async function submitForm() {
        if (!form.entity.trim() || !form.country.trim() || !form.description.trim()) {
            toast.error('Entity, country, and description are required.');
            return;
        }
        const components = (form.rate_components || []).filter(c => c.label.trim() || c.tax_type.trim() || c.rate);
        if (components.some(c => !c.label.trim() || !c.tax_type.trim())) {
            toast.error('Each rate component needs a label and tax type.');
            return;
        }

        setSaving(true);
        const payload = {
            tenant_id: tenantId,
            entity: form.entity.trim(),
            country: form.country.trim(),
            country_code: form.country_code?.trim() || null,
            region: form.region?.trim() || null,
            region_code: form.region_code?.trim() || null,
            locality: form.locality?.trim() || null,
            jurisdiction_code: form.jurisdiction_code?.trim() || null,
            description: form.description.trim(),
            vat_category: form.vat_category.trim(),
            applies_to: form.applies_to.trim(),
            tax_treatment: form.tax_treatment?.trim() || null,
            registration_number: form.registration_number?.trim() || null,
            is_default: !!form.is_default,
            active: !!form.active,
            rate_components: components,
            valid_from: form.valid_from || null,
            valid_to: form.valid_to || null,
            updated_by: currentUserId,
            updated_by_name: currentUserName,
            updated_at: new Date().toISOString(),
        };

        let error;
        let positionId = editingId;
        if (editingId) {
            ({ error } = await supabase.from('accounting_fiscal_positions').update(payload).eq('id', editingId).eq('tenant_id', tenantId));
        } else {
            const insertPayload = { ...payload, created_by: currentUserId, created_by_name: currentUserName, created_at: new Date().toISOString() };
            const { data, error: insertError } = await supabase.from('accounting_fiscal_positions').insert(insertPayload).select().single();
            error = insertError;
            positionId = data?.id ?? null;
        }

        if (error) {
            toast.error('Could not save fiscal position', { description: error.message });
            setSaving(false);
            return;
        }

        // If marked default, clear the flag on other positions in the same scope.
        if (payload.is_default && positionId) {
            try {
                await supabase
                    .from('accounting_fiscal_positions')
                    .update({ is_default: false })
                    .eq('tenant_id', tenantId)
                    .eq('entity', payload.entity)
                    .eq('country', payload.country)
                    .eq('region', payload.region ?? '')
                    .neq('id', positionId);
            } catch (e) { console.warn('Could not clear other default flags:', e); }
        }

        try {
            await supabase.from('fiscal_position_history').insert({
                tenant_id: tenantId,
                position_id: positionId,
                action: editingId ? 'updated' : 'created',
                summary: `${payload.entity} · ${payload.country}${payload.region ? ' / ' + payload.region : ''} — ${payload.description}`,
                performed_by_name: currentUserName,
                performed_at: new Date().toISOString(),
            });
        } catch (e) { console.warn('History not recorded:', e); }

        toast.success(editingId ? 'Fiscal position updated' : 'Fiscal position created');
        setSaving(false);
        setFormOpen(false);
        fetchPositions();
    }

    // -- Deactivate / reactivate -------------------------------------------------

    async function openStatusChange(p: FiscalPosition) {
        if (!canManage) { toast.error('You do not have permission to manage fiscal positions.'); return; }
        setStatusChangeTarget(p);
        setStatusChangeReason('');
        setUsageCount(null);
        setCheckingUsage(true);
        try {
            const { count, error } = await supabase
                .from('transactions')
                .select('id', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)
                .eq('fiscal_position_id', p.id);
            setUsageCount(error ? null : count ?? 0);
        } catch { setUsageCount(null); }
        setCheckingUsage(false);
    }

    async function confirmStatusChange() {
        if (!statusChangeTarget) return;
        if (statusChangeReason.trim().length < 5) { toast.error('Enter a brief reason.'); return; }
        setStatusChangeSubmitting(true);
        const nextActive = !statusChangeTarget.active;
        const { error } = await supabase
            .from('accounting_fiscal_positions')
            .update({ active: nextActive, updated_by: currentUserId, updated_by_name: currentUserName, updated_at: new Date().toISOString() })
            .eq('id', statusChangeTarget.id)
            .eq('tenant_id', tenantId);

        if (error) {
            toast.error('Could not update status', { description: error.message });
        } else {
            try {
                await supabase.from('fiscal_position_history').insert({
                    tenant_id: tenantId,
                    position_id: statusChangeTarget.id,
                    action: nextActive ? 'activated' : 'deactivated',
                    summary: statusChangeReason.trim(),
                    performed_by_name: currentUserName,
                    performed_at: new Date().toISOString(),
                });
            } catch (e) { console.warn('History not recorded:', e); }
            toast.success(nextActive ? 'Fiscal position reactivated' : 'Fiscal position deactivated');
            fetchPositions();
        }
        setStatusChangeSubmitting(false);
        setStatusChangeTarget(null);
    }

    // -- History dialog -------------------------------------------------------

    async function openHistory(p: FiscalPosition) {
        setHistoryTarget(p);
        setHistoryLoading(true);
        try {
            const { data, error } = await supabase
                .from('fiscal_position_history')
                .select('*')
                .eq('position_id', p.id)
                .order('performed_at', { ascending: false });
            if (error) throw error;
            setHistoryEntries((data ?? []) as PositionHistoryEntry[]);
        } catch {
            setHistoryEntries([]);
        } finally {
            setHistoryLoading(false);
        }
    }

    function toggleExpanded(id: string) {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    // ---------------------------------------------------------------------------

    if (!tenantId || loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Fiscal Positions</CardTitle>
                    <CardDescription>Loading global tax configurations...</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (loadError) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Fiscal Positions</CardTitle>
                    <CardDescription className="text-red-600 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" /> Could not load fiscal positions: {loadError}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" size="sm" onClick={fetchPositions} className="gap-2">
                        <RefreshCw className="h-4 w-4" /> Retry
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <CardTitle>Fiscal Positions</CardTitle>
                        <CardDescription>
                            Tax rules by entity, country, and subnational jurisdiction — compound-rate aware, effective-dated, and fully auditable.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => exportCsv(sorted)} className="gap-2">
                            <Download className="h-4 w-4" /> Export
                        </Button>
                        <Button size="sm" onClick={openCreate} className="gap-2" disabled={!canManage}>
                            <Plus className="h-4 w-4" /> New position
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
                    <SummaryStat label="Total" value={summary.total} />
                    <SummaryStat label="Active" value={summary.active} />
                    <SummaryStat label="Countries" value={summary.countries} />
                    <SummaryStat label="Regions" value={summary.regions} />
                    <SummaryStat label="Expiring ≤30d" value={summary.expiringSoon} warn={summary.expiringSoon > 0} />
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-4">
                    <div className="relative max-w-xs flex-1 min-w-[180px]">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search positions..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8" />
                        {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => setFilter('')} />}
                    </div>
                    <Select value={countryFilter} onValueChange={v => { setCountryFilter(v); setRegionFilter('all'); }}>
                        <SelectTrigger className="w-[150px]"><SelectValue placeholder="Country" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All countries</SelectItem>
                            {countryOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={regionFilter} onValueChange={setRegionFilter}>
                        <SelectTrigger className="w-[150px]"><SelectValue placeholder="Region / State" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All regions</SelectItem>
                            {regionOptionsForFilter.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={taxTypeFilter} onValueChange={setTaxTypeFilter}>
                        <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tax type" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All tax types</SelectItem>
                            {taxTypeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={treatmentFilter} onValueChange={setTreatmentFilter}>
                        <SelectTrigger className="w-[160px]"><SelectValue placeholder="Treatment" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All treatments</SelectItem>
                            {treatmentOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>As of</span>
                        <Input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} className="h-9 w-[150px]" />
                    </div>
                </div>

                {!currentUserRole && (
                    <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                        <ShieldAlert className="h-3.5 w-3.5" /> Your role could not be verified — editing is disabled.
                    </div>
                )}
            </CardHeader>

            <CardContent>
                <ScrollArea className="h-[520px] border rounded-md">
                    <Table>
                        <TableHeader className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                            <TableRow>
                                <SortableHead label="Entity" sortKey="entity" current={sortKey} dir={sortDir} onClick={toggleSort} />
                                <SortableHead label="Jurisdiction" sortKey="country" current={sortKey} dir={sortDir} onClick={toggleSort} />
                                <SortableHead label="Description" sortKey="description" current={sortKey} dir={sortDir} onClick={toggleSort} />
                                <TableHead>Treatment</TableHead>
                                <TableHead>Registration No.</TableHead>
                                <SortableHead label="Effective Rate" sortKey="rate" current={sortKey} dir={sortDir} onClick={toggleSort} />
                                <TableHead>Valid</TableHead>
                                <SortableHead label="Status" sortKey="status" current={sortKey} dir={sortDir} onClick={toggleSort} />
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sorted.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                        No fiscal positions found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pageRows.map(p => {
                                    const effStatus = getEffectiveStatus(p, asOf);
                                    const rate = computeEffectiveRate(p.rate_components);
                                    const expanded = expandedIds.has(p.id);
                                    return (
                                        <TableRow key={p.id}>
                                            <TableCell className="font-medium align-top">
                                                <div className="flex items-center gap-1.5">
                                                    {p.entity}
                                                    {p.is_default && <Star className="h-3 w-3 text-amber-500 fill-amber-400" />}
                                                </div>
                                            </TableCell>
                                            <TableCell className="align-top text-sm">
                                                <div>{p.country}{p.region ? ` — ${p.region}` : ''}{p.locality ? ` / ${p.locality}` : ''}</div>
                                                {p.jurisdiction_code && <div className="text-xs text-muted-foreground">{p.jurisdiction_code}</div>}
                                            </TableCell>
                                            <TableCell className="align-top max-w-[220px]">
                                                <div
                                                    onClick={() => toggleExpanded(p.id)}
                                                    title={p.description}
                                                    className={`text-sm cursor-pointer ${expanded ? '' : 'line-clamp-2'}`}
                                                >
                                                    {p.description}
                                                </div>
                                                <div className="text-xs text-muted-foreground">{p.vat_category}{p.applies_to ? ` · ${p.applies_to}` : ''}</div>
                                            </TableCell>
                                            <TableCell className="align-top text-sm capitalize">{p.tax_treatment || '—'}</TableCell>
                                            <TableCell className="align-top text-xs text-muted-foreground">{p.registration_number || '—'}</TableCell>
                                            <TableCell className="align-top">
                                                <div className="text-sm font-semibold tabular-nums">{rate.toFixed(2)}%</div>
                                                {p.rate_components && p.rate_components.length > 1 && (
                                                    <div className="text-[10px] text-muted-foreground">{p.rate_components.length} components</div>
                                                )}
                                            </TableCell>
                                            <TableCell className="align-top text-xs text-muted-foreground whitespace-nowrap">
                                                {p.valid_from ? format(parseISO(p.valid_from), 'd MMM yyyy') : '—'}
                                                {p.valid_to ? ` – ${format(parseISO(p.valid_to), 'd MMM yyyy')}` : ' – open'}
                                                {isExpiringSoon(p, asOf) && p.active && (
                                                    <div className="flex items-center gap-1 text-amber-600 mt-0.5">
                                                        <AlertTriangle className="h-3 w-3" /> Expiring soon
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="align-top space-y-1">
                                                <Badge variant={p.active ? 'default' : 'secondary'} className="block w-fit">
                                                    {p.active ? 'Active' : 'Inactive'}
                                                </Badge>
                                                {effStatus !== 'current' && (
                                                    <Badge variant="outline" className="block w-fit text-[10px] capitalize">{effStatus}</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right align-top">
                                                <div className="flex justify-end gap-1">
                                                    <Button size="sm" variant="ghost" onClick={() => openHistory(p)} title="History"><History className="h-4 w-4" /></Button>
                                                    <Button size="sm" variant="ghost" onClick={() => openEdit(p)} disabled={!canManage} title="Edit"><Pencil className="h-4 w-4" /></Button>
                                                    <Button
                                                        size="sm" variant="ghost" onClick={() => openStatusChange(p)} disabled={!canManage}
                                                        title={p.active ? 'Deactivate' : 'Reactivate'}
                                                    >
                                                        {p.active ? <Trash2 className="h-4 w-4 text-red-500" /> : <RefreshCw className="h-4 w-4 text-green-600" />}
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

                {sorted.length > 0 && (
                    <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-muted-foreground">
                            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
                        </span>
                        <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(pg => pg - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                            <span className="text-xs">{page} / {totalPages}</span>
                            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(pg => pg + 1)}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                    </div>
                )}
            </CardContent>

            {/* ---------------------------------------------------------- CREATE / EDIT */}
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit fiscal position' : 'New fiscal position'}</DialogTitle>
                        <DialogDescription>Jurisdiction, treatment, and rate components — every field autocompletes from your existing data, nothing is fixed.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Entity">
                                <ComboField id="entity-list" value={form.entity} onChange={v => setForm(f => ({ ...f, entity: v }))} options={entityOptions} />
                            </Field>
                            <Field label="Registration number">
                                <Input value={form.registration_number || ''} onChange={e => setForm(f => ({ ...f, registration_number: e.target.value }))} />
                            </Field>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <Field label="Country">
                                <ComboField id="country-list" value={form.country} onChange={v => setForm(f => ({ ...f, country: v, region: '', locality: '' }))} options={countryOptions} />
                            </Field>
                            <Field label="Region / State / Province">
                                <ComboField id="region-list" value={form.region || ''} onChange={v => setForm(f => ({ ...f, region: v, locality: '' }))} options={regionOptionsForForm} placeholder="Optional" />
                            </Field>
                            <Field label="Locality / City / County">
                                <ComboField id="locality-list" value={form.locality || ''} onChange={v => setForm(f => ({ ...f, locality: v }))} options={localityOptionsForForm} placeholder="Optional" />
                            </Field>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Jurisdiction code">
                                <Input value={form.jurisdiction_code || ''} onChange={e => setForm(f => ({ ...f, jurisdiction_code: e.target.value }))} placeholder="e.g. US-CA, IN-KA, CA-ON" />
                            </Field>
                            <Field label="Tax treatment">
                                <ComboField id="treatment-list" value={form.tax_treatment || ''} onChange={v => setForm(f => ({ ...f, tax_treatment: v }))} options={treatmentOptions} placeholder="e.g. Standard, Reverse charge, Zero-rated, Exempt" />
                            </Field>
                        </div>

                        <Field label="Description">
                            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
                        </Field>

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="VAT / GST category">
                                <ComboField id="vatcat-list" value={form.vat_category} onChange={v => setForm(f => ({ ...f, vat_category: v }))} options={vatCategoryOptions} />
                            </Field>
                            <Field label="Applies to">
                                <ComboField id="appliesto-list" value={form.applies_to} onChange={v => setForm(f => ({ ...f, applies_to: v }))} options={appliesToOptions} placeholder="e.g. Sales, Purchases, Both" />
                            </Field>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Valid from">
                                <Input type="date" value={form.valid_from || ''} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} />
                            </Field>
                            <Field label="Valid to">
                                <Input type="date" value={form.valid_to || ''} onChange={e => setForm(f => ({ ...f, valid_to: e.target.value }))} placeholder="Leave blank for open-ended" />
                            </Field>
                        </div>

                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox checked={!!form.is_default} onCheckedChange={c => setForm(f => ({ ...f, is_default: !!c }))} />
                                Default for this entity / jurisdiction
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox checked={!!form.active} onCheckedChange={c => setForm(f => ({ ...f, active: !!c }))} />
                                Active
                            </label>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Rate components</Label>
                                <Button size="sm" variant="outline" onClick={addComponent} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add component</Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Add one row per stacked tax (state, county, city, GST, PST, withholding, etc.). Mark "compound" if it applies on top of the running total rather than the flat base — this is how the effective rate is calculated.
                            </p>
                            <div className="space-y-2">
                                {(form.rate_components || []).map((c, i) => (
                                    <div key={c.id} className="grid grid-cols-12 gap-2 items-center border rounded-md p-2">
                                        <div className="col-span-3">
                                            <ComboField id={`comp-type-${i}`} value={c.tax_type} onChange={v => updateComponent(i, { tax_type: v })} options={taxTypeOptions} placeholder="Tax type" />
                                        </div>
                                        <div className="col-span-3">
                                            <Input value={c.label} onChange={e => updateComponent(i, { label: e.target.value })} placeholder="Label" />
                                        </div>
                                        <div className="col-span-2">
                                            <Input type="number" step="0.001" value={c.rate} onChange={e => updateComponent(i, { rate: parseFloat(e.target.value) || 0 })} placeholder="Rate %" />
                                        </div>
                                        <div className="col-span-2">
                                            <Select value={c.account_id || ''} onValueChange={v => updateComponent(i, { account_id: v, account_name: accounts.find(a => a.id === v)?.name || null })}>
                                                <SelectTrigger><SelectValue placeholder="GL account" /></SelectTrigger>
                                                <SelectContent>
                                                    {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-1 flex items-center justify-center">
                                            <label className="flex items-center gap-1 text-[10px]">
                                                <Checkbox checked={c.compound} onCheckedChange={ch => updateComponent(i, { compound: !!ch })} /> Cmp.
                                            </label>
                                        </div>
                                        <div className="col-span-1 flex justify-end">
                                            <Button size="sm" variant="ghost" onClick={() => removeComponent(i)}><X className="h-3.5 w-3.5" /></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="text-sm font-medium text-right">
                                Effective rate: {computeEffectiveRate(form.rate_components).toFixed(3)}%
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
                        <Button onClick={submitForm} disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? 'Save changes' : 'Create position'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ---------------------------------------------------------- DEACTIVATE / REACTIVATE */}
            <AlertDialog open={!!statusChangeTarget} onOpenChange={open => !open && setStatusChangeTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {statusChangeTarget?.active ? 'Deactivate' : 'Reactivate'} {statusChangeTarget?.entity} — {statusChangeTarget?.country}
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3 text-sm text-foreground">
                                {checkingUsage ? (
                                    <p className="text-muted-foreground flex items-center gap-2 text-xs"><Loader2 className="h-3 w-3 animate-spin" /> Checking usage…</p>
                                ) : usageCount !== null && usageCount > 0 ? (
                                    <p className="flex items-center gap-2 text-amber-600 text-xs font-medium">
                                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Referenced by {usageCount} existing transaction(s). Deactivating won't change those records, only future ones.
                                    </p>
                                ) : null}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">Reason (required)</label>
                                    <Textarea value={statusChangeReason} onChange={e => setStatusChangeReason(e.target.value)} rows={3} />
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <Button onClick={confirmStatusChange} disabled={statusChangeSubmitting} variant={statusChangeTarget?.active ? 'destructive' : 'default'}>
                            {statusChangeSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : statusChangeTarget?.active ? 'Confirm deactivate' : 'Confirm reactivate'}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ---------------------------------------------------------- HISTORY */}
            <Dialog open={!!historyTarget} onOpenChange={open => !open && setHistoryTarget(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{historyTarget?.entity} — {historyTarget?.country} history</DialogTitle>
                        <DialogDescription>{historyTarget?.description}</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[400px]">
                        {historyLoading ? (
                            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                        ) : historyEntries.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-6 text-center">No history recorded yet.</p>
                        ) : (
                            <div className="space-y-3 py-2">
                                {historyEntries.map(entry => (
                                    <div key={entry.id} className="text-sm border-b pb-3 last:border-none">
                                        <p className="font-medium capitalize">{entry.action}</p>
                                        {entry.summary && <p className="text-muted-foreground text-xs">{entry.summary}</p>}
                                        <p className="text-muted-foreground text-xs">
                                            {entry.performed_by_name || 'Unknown'} · {format(new Date(entry.performed_at), 'MMM d, yyyy p')}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

// ---------------------------------------------------------------------------

function SummaryStat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
    return (
        <div className={`rounded-md border p-3 ${warn ? 'border-amber-200 bg-amber-50' : ''}`}>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className={`text-lg font-semibold tabular-nums ${warn ? 'text-amber-700' : ''}`}>{value}</div>
        </div>
    );
}

function SortableHead({ label, sortKey, current, dir, onClick }: {
    label: string; sortKey: SortKey; current: SortKey; dir: 'asc' | 'desc'; onClick: (k: SortKey) => void;
}) {
    return (
        <TableHead className="cursor-pointer select-none" onClick={() => onClick(sortKey)}>
            <div className="flex items-center gap-1">
                {label}
                <ArrowUpDown className={`h-3 w-3 ${current === sortKey ? 'opacity-100' : 'opacity-30'}`} />
                {current === sortKey && <span className="text-[10px] text-muted-foreground">{dir === 'asc' ? '↑' : '↓'}</span>}
            </div>
        </TableHead>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            {children}
        </div>
    );
}

function Label({ children }: { children: React.ReactNode }) {
    return <label className="text-xs font-medium text-muted-foreground">{children}</label>;
}