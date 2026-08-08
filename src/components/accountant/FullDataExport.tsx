"use client";

// Requires these packages on top of what the app already uses:
//   npm install xlsx jszip jspdf jspdf-autotable
// All four are dynamically imported below so nothing loads unless that
// export format is actually used.

import React, { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
    Download, Loader2, ShieldCheck, FileJson, FileSpreadsheet, FileText, FileArchive,
    Building2, CalendarRange, AlertTriangle, CheckCircle2, Copy, ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { format as formatDate } from 'date-fns';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ExportFormat = 'json' | 'csv' | 'xlsx' | 'pdf';
type PeriodType = 'all' | 'fiscal_year' | 'quarter' | 'month' | 'custom';

interface BusinessOption {
    business_id: string;
    business_name: string;
}

interface ExportResult {
    filename: string;
    format: ExportFormat;
    sha256: string;
    recordCounts: Record<string, number>;
    periodLabel: string;
    businessName: string;
}

// Roles permitted to export. This is an authorization list, not tenant
// data — adjust to your role taxonomy, or drive it from a permissions table.
const ROLES_CAN_EXPORT = ['owner', 'admin', 'controller', 'accountant'];

const FORMAT_META: Record<ExportFormat, { label: string; icon: React.ElementType; ext: string; description: string }> = {
    json: { label: 'JSON', icon: FileJson, ext: 'json', description: 'Raw structured data — best for feeding into other systems or APIs.' },
    xlsx: { label: 'Excel (XLSX)', icon: FileSpreadsheet, ext: 'xlsx', description: 'One sheet per section plus a manifest sheet — opens directly in Excel or Google Sheets.' },
    csv: { label: 'CSV', icon: FileArchive, ext: 'csv', description: 'One CSV per section, bundled as a .zip if there is more than one section.' },
    pdf: { label: 'PDF report', icon: FileText, ext: 'pdf', description: 'Formatted, paginated tables — best for sharing with auditors directly.' },
};

// ---------------------------------------------------------------------------
// Helpers — none of these encode any tenant-specific data or business logic;
// they only compute calendar boundaries and generic file structures.
// ---------------------------------------------------------------------------

function pad(n: number) { return String(n).padStart(2, '0'); }
function toISODate(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

// Fiscal year is labeled by its start year (e.g. a fiscal year starting
// April 2025 is "FY2025", running through March 2026). fiscalStartMonth is
// 1–12; defaults to January (calendar year) unless the business record says
// otherwise — never hardcoded to a specific business's convention.
function getFiscalYearRange(startYear: number, fiscalStartMonth: number) {
    const start = new Date(startYear, fiscalStartMonth - 1, 1);
    const end = new Date(startYear + 1, fiscalStartMonth - 1, 0);
    return { start, end };
}

function getQuarterRange(startYear: number, quarter: 1 | 2 | 3 | 4, fiscalStartMonth: number) {
    const offsetMonths = (fiscalStartMonth - 1) + (quarter - 1) * 3;
    const qStartYear = startYear + Math.floor(offsetMonths / 12);
    const qStartMonth = offsetMonths % 12;
    const start = new Date(qStartYear, qStartMonth, 1);
    const end = new Date(qStartYear, qStartMonth + 3, 0);
    return { start, end };
}

function getMonthRange(monthValue: string) {
    // monthValue is "YYYY-MM" from an <input type="month">
    const [y, m] = monthValue.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    return { start, end };
}

async function sha256Hex(input: string): Promise<string> {
    const enc = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// The RPC's response shape isn't assumed beyond "an object of named arrays,
// or a single array". Section names come straight from whatever top-level
// keys the RPC returns — nothing here is hardcoded to specific table names,
// so this works whether the backend returns
// { general_ledger, chart_of_accounts, audit_history } or any other shape.
function flattenSections(data: unknown): Record<string, Record<string, unknown>[]> {
    const sections: Record<string, Record<string, unknown>[]> = {};
    if (data && typeof data === 'object' && !Array.isArray(data)) {
        for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
            if (Array.isArray(value)) sections[key] = value as Record<string, unknown>[];
        }
        if (Object.keys(sections).length > 0) return sections;
    }
    if (Array.isArray(data)) return { export: data as Record<string, unknown>[] };
    return { export: [data as Record<string, unknown>] };
}

function arrayToCsv(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) return '';
    const headerSet = new Set<string>();
    rows.forEach(r => Object.keys(r || {}).forEach(k => headerSet.add(k)));
    const headers = Array.from(headerSet);
    const escape = (v: unknown) => {
        if (v === null || v === undefined) return '';
        const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
        return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))];
    return lines.join('\n');
}

function slugify(s: string) {
    return (s || 'business').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FullDataExport() {
    const supabase = createClient();

    // -- Identity / tenant context ---------------------------------------------------
    // The RPC itself must resolve the tenant strictly from auth.uid() —
    // nothing here is trusted as a security boundary. This is purely so the
    // person exporting can see, and if applicable choose, which business
    // they're about to pull data for, sourced only from businesses their
    // own account already has access to (never an arbitrary ID).

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentUserName, setCurrentUserName] = useState<string | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
    const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
    const [fiscalStartMonth, setFiscalStartMonth] = useState<number>(1);

    const canExport = !!currentUserRole && ROLES_CAN_EXPORT.includes(currentUserRole);

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUserId(user.id);

            const { data: profile } = await supabase
                .from('profiles')
                .select('role, full_name, email, business_id, business_name, fiscal_year_start_month')
                .eq('id', user.id)
                .single();

            setCurrentUserRole(profile?.role ?? null);
            setCurrentUserName(profile?.full_name || profile?.email || user.email || null);
            setFiscalStartMonth(profile?.fiscal_year_start_month || 1);

            // An accountant may have access to several client businesses.
            // Only ever pulled from a table scoped by this user's own id —
            // never a list the client could widen.
            let list: BusinessOption[] = [];
            try {
                const { data, error } = await supabase
                    .from('accountant_business_access')
                    .select('business_id, business_name')
                    .eq('user_id', user.id);
                if (!error && data && data.length > 0) list = data as BusinessOption[];
            } catch { /* table may not exist yet — fall back below */ }

            if (list.length === 0 && profile?.business_id) {
                list = [{ business_id: profile.business_id, business_name: profile.business_name || 'Your business' }];
            }
            setBusinesses(list);
            if (list.length > 0) setSelectedBusinessId(list[0].business_id);
        };
        load();
    }, [supabase]);

    const selectedBusiness = businesses.find(b => b.business_id === selectedBusinessId);

    // -- Period selection -------------------------------------------------------

    const currentYear = new Date().getFullYear();
    const yearOptions = useMemo(() => Array.from({ length: 8 }, (_, i) => currentYear - i), [currentYear]);

    const [periodType, setPeriodType] = useState<PeriodType>('all');
    const [year, setYear] = useState<number>(currentYear);
    const [quarter, setQuarter] = useState<1 | 2 | 3 | 4>(1);
    const [monthValue, setMonthValue] = useState<string>(formatDate(new Date(), 'yyyy-MM'));
    const [customStart, setCustomStart] = useState<string>('');
    const [customEnd, setCustomEnd] = useState<string>('');

    const { rangeStart, rangeEnd, periodLabel } = useMemo(() => {
        if (periodType === 'all') return { rangeStart: null, rangeEnd: null, periodLabel: 'All time' };
        if (periodType === 'fiscal_year') {
            const { start, end } = getFiscalYearRange(year, fiscalStartMonth);
            return { rangeStart: toISODate(start), rangeEnd: toISODate(end), periodLabel: `FY${year}` };
        }
        if (periodType === 'quarter') {
            const { start, end } = getQuarterRange(year, quarter, fiscalStartMonth);
            return { rangeStart: toISODate(start), rangeEnd: toISODate(end), periodLabel: `FY${year} Q${quarter}` };
        }
        if (periodType === 'month') {
            const { start, end } = getMonthRange(monthValue);
            return { rangeStart: toISODate(start), rangeEnd: toISODate(end), periodLabel: formatDate(start, 'MMMM yyyy') };
        }
        // custom
        if (customStart && customEnd) {
            return { rangeStart: customStart, rangeEnd: customEnd, periodLabel: `${customStart} to ${customEnd}` };
        }
        return { rangeStart: null, rangeEnd: null, periodLabel: 'Custom range (incomplete)' };
    }, [periodType, year, quarter, monthValue, customStart, customEnd, fiscalStartMonth]);

    // -- Format selection -------------------------------------------------------

    const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('xlsx');

    // -- Confirm + result -------------------------------------------------------

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [result, setResult] = useState<ExportResult | null>(null);

    // -- Export mutation -------------------------------------------------------

    const mutation = useMutation({
        mutationFn: async () => {
            if (periodType === 'custom' && (!customStart || !customEnd)) {
                throw new Error('Select both a start and end date for a custom range.');
            }

            // NOTE: p_start_date / p_end_date / p_business_id are additive,
            // optional parameters — add them to get_accountant_export_data
            // with sensible defaults (null = no filter) so the original
            // zero-argument call keeps working. The function must verify,
            // server-side, that the resolved tenant/business for auth.uid()
            // matches p_business_id when it's provided — never trust it
            // as-is, it only narrows which of the caller's own businesses
            // to export, it must not be able to widen access.
            const { data, error } = await supabase.rpc('get_accountant_export_data', {
                p_start_date: rangeStart,
                p_end_date: rangeEnd,
                p_business_id: selectedBusinessId || null,
            });
            if (error) throw new Error(error.message);
            if (!data || (Array.isArray(data) && data.length === 0)) {
                throw new Error('No data was returned for this period.');
            }
            return data;
        },
        onSuccess: async (data) => {
            const sections = flattenSections(data);
            const recordCounts = Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, v.length]));
            const canonical = JSON.stringify(data);
            const sha256 = await sha256Hex(canonical);
            const businessName = selectedBusiness?.business_name || 'business';
            const stamp = formatDate(new Date(), 'yyyy-MM-dd_HHmm');
            const baseName = `${slugify(businessName)}_ledger-export_${slugify(periodLabel)}_${stamp}`;

            const manifest = {
                exported_business: businessName,
                exported_business_id: selectedBusinessId,
                exported_by: currentUserName,
                exported_at: new Date().toISOString(),
                period: periodLabel,
                period_start: rangeStart,
                period_end: rangeEnd,
                format: selectedFormat,
                record_counts: recordCounts,
                sha256_of_raw_export: sha256,
                integrity_note:
                    'This checksum is a SHA-256 hash of the exact data returned by the server at export time. ' +
                    'Recompute the hash of the raw data to confirm this file has not been altered since export.',
            };

            let filename = '';

            if (selectedFormat === 'json') {
                const payload = { manifest, data };
                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
                filename = `${baseName}.json`;
                downloadBlob(blob, filename);

            } else if (selectedFormat === 'csv') {
                const sectionNames = Object.keys(sections);
                if (sectionNames.length === 1) {
                    const csv = arrayToCsv(sections[sectionNames[0]]);
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    filename = `${baseName}.csv`;
                    downloadBlob(blob, filename);
                } else {
                    const JSZip = (await import('jszip')).default;
                    const zip = new JSZip();
                    for (const [name, rows] of Object.entries(sections)) {
                        zip.file(`${slugify(name)}.csv`, arrayToCsv(rows));
                    }
                    zip.file('MANIFEST.json', JSON.stringify(manifest, null, 2));
                    const blob = await zip.generateAsync({ type: 'blob' });
                    filename = `${baseName}.zip`;
                    downloadBlob(blob, filename);
                }

            } else if (selectedFormat === 'xlsx') {
                const XLSX = await import('xlsx');
                const wb = XLSX.utils.book_new();
                const manifestRows = Object.entries(manifest).map(([k, v]) => ({
                    Field: k, Value: typeof v === 'object' ? JSON.stringify(v) : String(v),
                }));
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(manifestRows), 'Manifest');
                for (const [name, rows] of Object.entries(sections)) {
                    const sheetName = slugify(name).slice(0, 31) || 'sheet';
                    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheetName);
                }
                const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                const blob = new Blob([wbout], { type: 'application/octet-stream' });
                filename = `${baseName}.xlsx`;
                downloadBlob(blob, filename);

            } else if (selectedFormat === 'pdf') {
                const { jsPDF } = await import('jspdf');
                const autoTable = (await import('jspdf-autotable')).default;
                const doc = new jsPDF({ orientation: 'landscape' });

                doc.setFontSize(16);
                doc.text(`General Ledger Export — ${businessName}`, 14, 16);
                doc.setFontSize(10);
                doc.text(`Period: ${periodLabel}   Exported by: ${currentUserName || '—'}   Exported: ${formatDate(new Date(), 'PPpp')}`, 14, 23);
                doc.text(`SHA-256: ${sha256}`, 14, 28);

                let cursorY = 34;
                for (const [name, rows] of Object.entries(sections)) {
                    if (rows.length === 0) continue;
                    const headers = Array.from(rows.reduce((set, r) => { Object.keys(r || {}).forEach(k => set.add(k)); return set; }, new Set<string>()));
                    doc.setFontSize(12);
                    doc.text(name, 14, cursorY);
                    autoTable(doc, {
                        startY: cursorY + 3,
                        head: [headers],
                        body: rows.map(r => headers.map(h => {
                            const v = r[h];
                            return v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
                        })),
                        styles: { fontSize: 7 },
                        margin: { left: 14, right: 14 },
                    });
                    // @ts-expect-error - lastAutoTable is added by the plugin at runtime
                    cursorY = doc.lastAutoTable.finalY + 10;
                    if (cursorY > 180) { doc.addPage(); cursorY = 20; }
                }

                filename = `${baseName}.pdf`;
                downloadBlob(doc.output('blob'), filename);
            }

            // Export audit log — non-fatal if the table doesn't exist yet.
            // New table to add: data_export_log
            //   id uuid pk, business_id uuid, user_id uuid, user_name text,
            //   format text, period_label text, period_start date, period_end date,
            //   record_counts jsonb, sha256 text, exported_at timestamptz
            try {
                await supabase.from('data_export_log').insert({
                    business_id: selectedBusinessId || null,
                    user_id: currentUserId,
                    user_name: currentUserName,
                    format: selectedFormat,
                    period_label: periodLabel,
                    period_start: rangeStart,
                    period_end: rangeEnd,
                    record_counts: recordCounts,
                    sha256,
                    exported_at: new Date().toISOString(),
                });
            } catch (e) { console.warn('Export not logged:', e); }

            setResult({ filename, format: selectedFormat, sha256, recordCounts, periodLabel, businessName });
            setConfirmOpen(false);
            toast.success('Export complete', { description: filename });
        },
        onError: (error: Error) => toast.error(`Export failed: ${error.message}`),
    });

    function handleExportClick() {
        if (!canExport) { toast.error('You do not have permission to export ledger data.'); return; }
        if (!selectedBusinessId) { toast.error('Select a business to export.'); return; }
        if (periodType === 'custom' && (!customStart || !customEnd)) { toast.error('Select both a start and end date.'); return; }
        setResult(null);
        setConfirmOpen(true);
    }

    // ---------------------------------------------------------------------------

    return (
        <Card>
            <CardHeader>
                <CardTitle>Full Data Export</CardTitle>
                <CardDescription>
                    Certified data portability — General Ledger, Chart of Accounts, and transactional audit history.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                {!currentUserRole ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ShieldAlert className="h-3.5 w-3.5" /> Your role could not be verified — export is disabled.
                    </div>
                ) : !canExport ? (
                    <div className="flex items-center gap-2 text-xs text-red-600">
                        <ShieldAlert className="h-3.5 w-3.5" /> Your account role does not permit data export.
                    </div>
                ) : null}

                {/* Business / tenant scope */}
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" /> Business
                    </label>
                    {businesses.length <= 1 ? (
                        <div className="h-10 flex items-center px-3 rounded-md border bg-muted text-sm font-medium">
                            {selectedBusiness?.business_name || 'Loading…'}
                        </div>
                    ) : (
                        <Select value={selectedBusinessId} onValueChange={setSelectedBusinessId}>
                            <SelectTrigger><SelectValue placeholder="Select business" /></SelectTrigger>
                            <SelectContent>
                                {businesses.map(b => (
                                    <SelectItem key={b.business_id} value={b.business_id}>{b.business_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <p className="text-xs text-muted-foreground">
                        Only businesses your account already has access to are listed here — this cannot be changed to another tenant's data.
                    </p>
                </div>

                {/* Period */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <CalendarRange className="h-3.5 w-3.5" /> Period
                    </label>
                    <div className="grid grid-cols-5 gap-1 p-1 bg-muted rounded-lg w-fit">
                        {(['all', 'fiscal_year', 'quarter', 'month', 'custom'] as PeriodType[]).map(pt => (
                            <button
                                key={pt}
                                onClick={() => setPeriodType(pt)}
                                className={`h-8 px-3 rounded-md text-xs font-medium transition-colors ${periodType === pt ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                            >
                                {pt === 'all' ? 'All time' : pt === 'fiscal_year' ? 'Fiscal year' : pt === 'quarter' ? 'Quarter' : pt === 'month' ? 'Month' : 'Custom'}
                            </button>
                        ))}
                    </div>

                    {periodType === 'fiscal_year' && (
                        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
                            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {yearOptions.map(y => <SelectItem key={y} value={String(y)}>FY{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}

                    {periodType === 'quarter' && (
                        <div className="flex gap-2">
                            <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
                                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {yearOptions.map(y => <SelectItem key={y} value={String(y)}>FY{y}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={String(quarter)} onValueChange={v => setQuarter(Number(v) as 1 | 2 | 3 | 4)}>
                                <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4].map(q => <SelectItem key={q} value={String(q)}>Q{q}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {periodType === 'month' && (
                        <Input type="month" value={monthValue} onChange={e => setMonthValue(e.target.value)} className="w-[180px]" />
                    )}

                    {periodType === 'custom' && (
                        <div className="flex items-center gap-2">
                            <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-[160px]" />
                            <span className="text-muted-foreground text-sm">to</span>
                            <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-[160px]" />
                        </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                        {rangeStart && rangeEnd ? `${rangeStart} → ${rangeEnd}` : periodType === 'all' ? 'No date filter — entire history.' : 'Select a complete range.'}
                    </p>
                </div>

                {/* Format */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">File format</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(Object.keys(FORMAT_META) as ExportFormat[]).map(f => {
                            const meta = FORMAT_META[f];
                            const Icon = meta.icon;
                            const active = selectedFormat === f;
                            return (
                                <button
                                    key={f}
                                    onClick={() => setSelectedFormat(f)}
                                    className={`text-left p-3 rounded-lg border transition-colors ${active ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
                                >
                                    <div className="flex items-center gap-2 font-medium text-sm">
                                        <Icon className="h-4 w-4" /> {meta.label}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{meta.description}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="rounded-md border p-3 bg-muted/40 flex items-start gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                        Every export includes a SHA-256 fingerprint of the exact data returned, recorded in an audit log. This lets you or an
                        auditor verify a downloaded file wasn't altered afterward — it can't prevent someone editing the downloaded copy, but any
                        edit will no longer match the recorded checksum.
                    </span>
                </div>

                <Button onClick={handleExportClick} disabled={mutation.isPending || !canExport} size="lg" className="gap-2">
                    {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {mutation.isPending ? 'Compiling export…' : `Export as ${FORMAT_META[selectedFormat].label}`}
                </Button>

                {result && (
                    <div className="rounded-md border p-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" /> Export complete
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                            <div>File: <span className="font-mono">{result.filename}</span></div>
                            <div>Business: {result.businessName} · Period: {result.periodLabel}</div>
                            <div>Records: {Object.entries(result.recordCounts).map(([k, v]) => `${k}: ${v}`).join(' · ')}</div>
                            <div className="flex items-center gap-1.5">
                                SHA-256: <span className="font-mono break-all">{result.sha256}</span>
                                <button
                                    onClick={() => { navigator.clipboard.writeText(result.sha256); toast.success('Checksum copied'); }}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <Copy className="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>

            {/* ---------------------------------------------------------- CONFIRM */}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" /> Confirm export
                        </DialogTitle>
                        <DialogDescription asChild>
                            <div className="space-y-2 text-sm text-foreground pt-2">
                                <p>You're about to export the General Ledger, Chart of Accounts, and audit history for:</p>
                                <ul className="list-disc pl-5 text-muted-foreground">
                                    <li><span className="font-medium text-foreground">{selectedBusiness?.business_name}</span></li>
                                    <li>Period: <span className="font-medium text-foreground">{periodLabel}</span></li>
                                    <li>Format: <span className="font-medium text-foreground">{FORMAT_META[selectedFormat].label}</span></li>
                                </ul>
                                <p className="text-xs text-muted-foreground pt-1">This action is recorded in the export audit log with your name, timestamp, and a checksum of the data.</p>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm and export'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}