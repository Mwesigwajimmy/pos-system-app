'use client';

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
    PackagePlus, UploadCloud, Banknote, Loader2, FileCheck, X,
    Wallet, LayoutGrid, ListFilter, Search, Building2, User,
    Landmark, CalendarClock, Percent, Paperclip, ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';
import { format, isFuture, parseISO } from 'date-fns';

const supabase = createClient();

// ---------------------------------------------------------------------------
// Static reference data
// ---------------------------------------------------------------------------

const ASSET_CATEGORIES = [
    'Computer & IT Equipment',
    'Machinery & Equipment',
    'Furniture & Fixtures',
    'Vehicles',
    'Building & Property',
    'Land',
    'Office Equipment',
    'Other',
] as const;

const DEPRECIATION_METHODS = [
    { value: 'none', label: 'Not Depreciated' },
    { value: 'straight_line', label: 'Straight-Line' },
    { value: 'declining_balance', label: 'Declining Balance' },
] as const;

const ACCEPTED_RECEIPT_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_RECEIPT_SIZE_MB = 10;

type PaymentType = 'cash' | 'credit';

interface AssetFormState {
    assetName: string;
    category: string;
    serial: string;
    vendor: string;
    purchaseDate: string;
    purchasedBy: string;
    paymentType: PaymentType;
    accountId: string;
    dueDate: string;
    cost: string;
    exchangeRate: string;
    depreciationMethod: string;
    usefulLifeYears: string;
    salvageValue: string;
    notes: string;
}

const emptyForm: AssetFormState = {
    assetName: '',
    category: '',
    serial: '',
    vendor: '',
    purchaseDate: format(new Date(), 'yyyy-MM-dd'),
    purchasedBy: '',
    paymentType: 'cash',
    accountId: '',
    dueDate: '',
    cost: '',
    exchangeRate: '1',
    depreciationMethod: 'none',
    usefulLifeYears: '',
    salvageValue: '',
    notes: '',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AssetPurchaseForm() {
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<'new' | 'register'>('new');
    const [form, setForm] = useState<AssetFormState>(emptyForm);
    const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
    const [receiptPath, setReceiptPath] = useState<string | null>(null);
    const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const update = <K extends keyof AssetFormState>(key: K, value: AssetFormState[K]) =>
        setForm(prev => ({ ...prev, [key]: value }));

    // -- Identity & context ---------------------------------------------------

    const { data: profile } = useQuery({
        queryKey: ['business_profile_context'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const { data } = await supabase
                .from('profiles')
                .select('id, business_id, business_name, currency, full_name, email')
                .eq('id', user?.id)
                .single();
            return data;
        },
    });

    // -- Payment accounts -------------------------------------------------------

    const { data: accounts } = useQuery({
        queryKey: ['asset_payment_accounts', profile?.business_id],
        queryFn: async () => {
            if (!profile?.business_id) return [];
            const { data, error } = await supabase
                .from('accounting_accounts')
                .select('id, name, code, current_balance, currency')
                .eq('business_id', profile.business_id)
                .or('subtype.eq.cash,subtype.eq.bank')
                .eq('is_active', true);
            if (error) throw error;
            return data;
        },
        enabled: !!profile?.business_id,
    });

    const selectedAccount = useMemo(
        () => accounts?.find(a => a.id === form.accountId),
        [accounts, form.accountId],
    );

    const activeCurrency = selectedAccount?.currency || profile?.currency || '—';
    const isForeignCurrency = !!profile?.currency && activeCurrency !== profile.currency;

    // -- Asset register (read) ---------------------------------------------------

    const [filterMonth, setFilterMonth] = useState<string>('all');
    const [filterPaymentType, setFilterPaymentType] = useState<string>('all');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // NOTE: assumes a readable table/view `fixed_assets_register`, scoped by
    // business_id, containing the columns written by proc_record_asset_acquisition
    // plus the new fields below. Rename to match your schema if different.
    const { data: registerRows, isLoading: registerLoading } = useQuery({
        queryKey: ['fixed_assets_register', profile?.business_id],
        queryFn: async () => {
            if (!profile?.business_id) return [];
            const { data, error } = await supabase
                .from('fixed_assets_register')
                .select(`
                    id, asset_name, category, serial_number, vendor, purchased_by,
                    recorded_by_name, payment_type, account_name, due_date,
                    cost, currency, exchange_rate, depreciation_method,
                    useful_life_years, salvage_value, receipt_url, voucher_no,
                    purchase_date, notes
                `)
                .eq('business_id', profile.business_id)
                .order('purchase_date', { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: !!profile?.business_id && activeTab === 'register',
    });

    const filteredRows = useMemo(() => {
        if (!registerRows) return [];
        return registerRows.filter(row => {
            if (filterMonth !== 'all' && format(parseISO(row.purchase_date), 'yyyy-MM') !== filterMonth) return false;
            if (filterPaymentType !== 'all' && row.payment_type !== filterPaymentType) return false;
            if (filterCategory !== 'all' && row.category !== filterCategory) return false;
            if (searchTerm) {
                const q = searchTerm.toLowerCase();
                const haystack = `${row.asset_name} ${row.vendor ?? ''} ${row.serial_number ?? ''} ${row.purchased_by ?? ''}`.toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            return true;
        });
    }, [registerRows, filterMonth, filterPaymentType, filterCategory, searchTerm]);

    const monthOptions = useMemo(() => {
        if (!registerRows) return [];
        const set = new Set(registerRows.map(r => format(parseISO(r.purchase_date), 'yyyy-MM')));
        return Array.from(set).sort().reverse();
    }, [registerRows]);

    const groupedByMonth = useMemo(() => {
        const groups: Record<string, typeof filteredRows> = {};
        for (const row of filteredRows) {
            const key = format(parseISO(row.purchase_date), 'MMMM yyyy');
            if (!groups[key]) groups[key] = [];
            groups[key].push(row);
        }
        return groups;
    }, [filteredRows]);

    const summary = useMemo(() => {
        const totalValue = filteredRows.reduce((sum, r) => sum + Number(r.cost || 0), 0);
        const onCredit = filteredRows.filter(r => r.payment_type === 'credit');
        const creditOutstanding = onCredit.reduce((sum, r) => sum + Number(r.cost || 0), 0);
        return {
            count: filteredRows.length,
            totalValue,
            creditCount: onCredit.length,
            creditOutstanding,
        };
    }, [filteredRows]);

    // -- Receipt upload -------------------------------------------------------

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!ACCEPTED_RECEIPT_TYPES.includes(file.type)) {
            toast.error('Unsupported file type', { description: 'Upload a PDF, PNG, JPG, or WEBP file.' });
            e.target.value = '';
            return;
        }
        if (file.size > MAX_RECEIPT_SIZE_MB * 1024 * 1024) {
            toast.error('File too large', { description: `Maximum size is ${MAX_RECEIPT_SIZE_MB}MB.` });
            e.target.value = '';
            return;
        }

        setIsUploading(true);
        const fileExt = file.name.split('.').pop();
        const path = `assets/${profile?.business_id ?? 'business'}/receipt-${Date.now()}.${fileExt}`;

        const { data, error } = await supabase.storage.from('receipts').upload(path, file);

        if (error) {
            toast.error('Upload failed', { description: error.message });
        } else {
            // Signed, time-limited URL rather than a public link, since receipts
            // may contain sensitive financial data. Requires the `receipts`
            // bucket to be private.
            const { data: signed, error: signError } = await supabase.storage
                .from('receipts')
                .createSignedUrl(data.path, 60 * 60 * 24 * 7);
            if (signError) {
                toast.error('Could not generate secure link', { description: signError.message });
            } else {
                setReceiptUrl(signed.signedUrl);
                setReceiptPath(data.path);
                setReceiptFileName(file.name);
                toast.success('Receipt attached');
            }
        }
        setIsUploading(false);
    };

    const removeReceipt = async () => {
        if (receiptPath) {
            await supabase.storage.from('receipts').remove([receiptPath]);
        }
        setReceiptUrl(null);
        setReceiptPath(null);
        setReceiptFileName(null);
    };

    // -- Validation -------------------------------------------------------

    const validate = (): string | null => {
        if (!form.assetName.trim()) return 'Enter an asset name.';
        if (!form.category) return 'Select an asset category.';
        const cost = parseFloat(form.cost);
        if (!form.cost || isNaN(cost) || cost <= 0) return 'Enter a valid purchase amount.';
        if (!form.purchaseDate) return 'Select a purchase date.';
        if (isFuture(parseISO(form.purchaseDate))) return 'Purchase date cannot be in the future.';
        if (form.paymentType === 'cash' && !form.accountId) return 'Select a payment account.';
        if (form.paymentType === 'credit' && !form.dueDate) return 'Set a payment due date for credit purchases.';
        if (form.paymentType === 'credit' && !form.vendor.trim()) return 'Enter a supplier/vendor for credit purchases.';
        if (isForeignCurrency && (!form.exchangeRate || isNaN(parseFloat(form.exchangeRate)) || parseFloat(form.exchangeRate) <= 0)) {
            return 'Enter a valid exchange rate for this currency.';
        }
        return null;
    };

    // -- Submit -------------------------------------------------------

    const authorizePurchase = useMutation({
        mutationFn: async () => {
            const validationError = validate();
            if (validationError) throw new Error(validationError);

            const cost = parseFloat(form.cost);
            const exchangeRate = isForeignCurrency ? parseFloat(form.exchangeRate) : 1;

            const { error } = await supabase.rpc('proc_record_asset_acquisition', {
                // --- existing params, unchanged ---
                p_asset_name: form.assetName,
                p_cost: cost,
                p_account_id: form.paymentType === 'cash' ? form.accountId : null,
                p_serial: form.serial || 'N/A',
                p_receipt_url: receiptUrl,
                p_voucher_no: `V-ASSET-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`,
                // --- new params (add matching columns/args on the backend) ---
                p_category: form.category,
                p_vendor: form.vendor || null,
                p_purchase_date: form.purchaseDate,
                p_purchased_by: form.purchasedBy || null,
                p_recorded_by: profile?.id ?? null,
                p_payment_type: form.paymentType,
                p_due_date: form.paymentType === 'credit' ? form.dueDate : null,
                p_exchange_rate: exchangeRate,
                p_base_currency_amount: cost * exchangeRate,
                p_depreciation_method: form.depreciationMethod,
                p_useful_life_years: form.usefulLifeYears ? parseInt(form.usefulLifeYears, 10) : null,
                p_salvage_value: form.salvageValue ? parseFloat(form.salvageValue) : null,
                p_notes: form.notes || null,
            });

            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Purchase recorded');
            queryClient.invalidateQueries({ queryKey: ['asset_payment_accounts'] });
            queryClient.invalidateQueries({ queryKey: ['fixed_assets_register'] });
            setForm(emptyForm);
            setReceiptUrl(null);
            setReceiptPath(null);
            setReceiptFileName(null);
        },
        onError: async (err: Error) => {
            toast.error('Could not save', { description: err.message });
            // Avoid an orphaned file in storage if the record failed to save.
            if (receiptPath) {
                await supabase.storage.from('receipts').remove([receiptPath]);
                setReceiptUrl(null);
                setReceiptPath(null);
                setReceiptFileName(null);
            }
        },
    });

    // -------------------------------------------------------------------------

    return (
        <div className="max-w-[1400px] mx-auto space-y-8 pb-20">
            <header className="flex items-center justify-between gap-4 pb-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center">
                        <PackagePlus className="text-white" size={18} />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-slate-900">Fixed Assets</h1>
                        <p className="text-sm text-slate-500">{profile?.business_name}</p>
                    </div>
                </div>
                {profile?.full_name && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <User size={14} />
                        <span>{profile.full_name}</span>
                    </div>
                )}
            </header>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'new' | 'register')}>
                <TabsList className="bg-slate-100 rounded-lg p-1">
                    <TabsTrigger value="new" className="rounded-md text-sm gap-2">
                        <PackagePlus size={14} /> New Purchase
                    </TabsTrigger>
                    <TabsTrigger value="register" className="rounded-md text-sm gap-2">
                        <LayoutGrid size={14} /> Asset Register
                    </TabsTrigger>
                </TabsList>

                {/* -------------------------------------------------------- NEW PURCHASE */}
                <TabsContent value="new" className="pt-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                        <div className="lg:col-span-7 space-y-6">
                            <Card className="border-slate-200 rounded-2xl">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-sm font-semibold text-slate-700">Asset Details</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-slate-500">Asset name</Label>
                                        <Input
                                            value={form.assetName}
                                            onChange={e => update('assetName', e.target.value)}
                                            placeholder="e.g. Dell Latitude 5440"
                                            className="h-11 rounded-lg"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-500">Category</Label>
                                            <Select value={form.category} onValueChange={v => update('category', v)}>
                                                <SelectTrigger className="h-11 rounded-lg">
                                                    <SelectValue placeholder="Select category" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ASSET_CATEGORIES.map(c => (
                                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-500">Serial number</Label>
                                            <Input
                                                value={form.serial}
                                                onChange={e => update('serial', e.target.value)}
                                                placeholder="Optional"
                                                className="h-11 rounded-lg"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-500">Supplier / vendor</Label>
                                            <Input
                                                value={form.vendor}
                                                onChange={e => update('vendor', e.target.value)}
                                                placeholder="e.g. Simba Computers Ltd"
                                                className="h-11 rounded-lg"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-500">Purchase date</Label>
                                            <Input
                                                type="date"
                                                value={form.purchaseDate}
                                                onChange={e => update('purchaseDate', e.target.value)}
                                                max={format(new Date(), 'yyyy-MM-dd')}
                                                className="h-11 rounded-lg"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-slate-500">Purchased by</Label>
                                        <Input
                                            value={form.purchasedBy}
                                            onChange={e => update('purchasedBy', e.target.value)}
                                            placeholder="Name of the employee who made the purchase"
                                            className="h-11 rounded-lg"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-slate-500">Notes</Label>
                                        <Textarea
                                            value={form.notes}
                                            onChange={e => update('notes', e.target.value)}
                                            placeholder="Optional"
                                            className="rounded-lg resize-none"
                                            rows={2}
                                        />
                                    </div>

                                    <div className="pt-2">
                                        <Label className="text-xs text-slate-500 block mb-2">Receipt</Label>
                                        {receiptUrl ? (
                                            <div className="flex items-center justify-between h-11 px-3 rounded-lg border border-slate-200 bg-slate-50">
                                                <div className="flex items-center gap-2 text-sm text-slate-700 truncate">
                                                    <FileCheck size={16} className="text-emerald-600 shrink-0" />
                                                    <span className="truncate">{receiptFileName}</span>
                                                </div>
                                                <button onClick={removeReceipt} className="text-slate-400 hover:text-red-500 shrink-0">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="relative h-11 rounded-lg border border-dashed border-slate-300 flex items-center justify-center gap-2 text-sm text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-colors">
                                                <input
                                                    type="file"
                                                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                                                    onChange={handleFileUpload}
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                />
                                                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                                                <span>{isUploading ? 'Uploading…' : 'Attach PDF or image'}</span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-slate-200 rounded-2xl">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-sm font-semibold text-slate-700">Depreciation</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-500">Method</Label>
                                            <Select value={form.depreciationMethod} onValueChange={v => update('depreciationMethod', v)}>
                                                <SelectTrigger className="h-11 rounded-lg">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {DEPRECIATION_METHODS.map(m => (
                                                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-500">Useful life (years)</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={form.usefulLifeYears}
                                                onChange={e => update('usefulLifeYears', e.target.value)}
                                                disabled={form.depreciationMethod === 'none'}
                                                className="h-11 rounded-lg"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-500">Salvage value</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={form.salvageValue}
                                                onChange={e => update('salvageValue', e.target.value)}
                                                disabled={form.depreciationMethod === 'none'}
                                                className="h-11 rounded-lg"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:col-span-5 space-y-6">
                            <Card className="border-slate-200 rounded-2xl">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-sm font-semibold text-slate-700">Payment</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                                        <button
                                            onClick={() => update('paymentType', 'cash')}
                                            className={`h-9 rounded-md text-xs font-medium transition-colors ${form.paymentType === 'cash' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                                        >
                                            Cash / Bank
                                        </button>
                                        <button
                                            onClick={() => update('paymentType', 'credit')}
                                            className={`h-9 rounded-md text-xs font-medium transition-colors ${form.paymentType === 'credit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                                        >
                                            On Credit
                                        </button>
                                    </div>

                                    {form.paymentType === 'cash' ? (
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-500">Payment account</Label>
                                            <Select value={form.accountId} onValueChange={v => update('accountId', v)}>
                                                <SelectTrigger className="h-11 rounded-lg">
                                                    <SelectValue placeholder="Select account" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {accounts?.map(acc => (
                                                        <SelectItem key={acc.id} value={acc.id}>
                                                            {acc.name} — {acc.current_balance.toLocaleString()} {acc.currency}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-500">Payment due date</Label>
                                            <Input
                                                type="date"
                                                value={form.dueDate}
                                                onChange={e => update('dueDate', e.target.value)}
                                                className="h-11 rounded-lg"
                                            />
                                            <p className="text-xs text-slate-400 pt-1">Recorded against accounts payable until settled.</p>
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center">
                                            <Label className="text-xs text-slate-500">Amount</Label>
                                            <Badge variant="outline" className="text-[10px] font-medium">{activeCurrency}</Badge>
                                        </div>
                                        <div className="relative">
                                            <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                            <Input
                                                type="number"
                                                min={0}
                                                value={form.cost}
                                                onChange={e => update('cost', e.target.value)}
                                                className="h-14 rounded-lg pl-10 text-2xl font-semibold tabular-nums"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>

                                    {isForeignCurrency && (
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-500">
                                                Exchange rate ({activeCurrency} → {profile?.currency})
                                            </Label>
                                            <div className="relative">
                                                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    step="0.0001"
                                                    value={form.exchangeRate}
                                                    onChange={e => update('exchangeRate', e.target.value)}
                                                    className="h-11 rounded-lg pl-9"
                                                />
                                            </div>
                                            {form.cost && form.exchangeRate && (
                                                <p className="text-xs text-slate-400">
                                                    ≈ {(parseFloat(form.cost) * parseFloat(form.exchangeRate || '0')).toLocaleString()} {profile?.currency}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Button
                                onClick={() => authorizePurchase.mutate()}
                                disabled={authorizePurchase.isPending || isUploading}
                                className="w-full h-12 rounded-lg font-medium"
                            >
                                {authorizePurchase.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : 'Save Purchase'}
                            </Button>
                        </div>
                    </div>
                </TabsContent>

                {/* -------------------------------------------------------- ASSET REGISTER */}
                <TabsContent value="register" className="pt-8 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <SummaryStat label="Assets" value={summary.count.toLocaleString()} icon={LayoutGrid} />
                        <SummaryStat label="Total value" value={summary.totalValue.toLocaleString()} icon={Banknote} />
                        <SummaryStat label="On credit" value={summary.creditCount.toLocaleString()} icon={CalendarClock} />
                        <SummaryStat label="Credit outstanding" value={summary.creditOutstanding.toLocaleString()} icon={Landmark} />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[220px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={15} />
                            <Input
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search asset, vendor, serial, purchaser…"
                                className="h-10 rounded-lg pl-9"
                            />
                        </div>
                        <Select value={filterMonth} onValueChange={setFilterMonth}>
                            <SelectTrigger className="h-10 rounded-lg w-[160px]">
                                <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All months</SelectItem>
                                {monthOptions.map(m => (
                                    <SelectItem key={m} value={m}>{format(parseISO(`${m}-01`), 'MMMM yyyy')}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filterPaymentType} onValueChange={setFilterPaymentType}>
                            <SelectTrigger className="h-10 rounded-lg w-[150px]">
                                <SelectValue placeholder="Payment" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All payments</SelectItem>
                                <SelectItem value="cash">Cash / Bank</SelectItem>
                                <SelectItem value="credit">On Credit</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterCategory} onValueChange={setFilterCategory}>
                            <SelectTrigger className="h-10 rounded-lg w-[190px]">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All categories</SelectItem>
                                {ASSET_CATEGORIES.map(c => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Card className="border-slate-200 rounded-2xl overflow-hidden">
                        {registerLoading ? (
                            <div className="py-16 flex items-center justify-center text-slate-400 gap-2 text-sm">
                                <Loader2 size={16} className="animate-spin" /> Loading register…
                            </div>
                        ) : filteredRows.length === 0 ? (
                            <div className="py-16 text-center text-sm text-slate-400">No assets match these filters.</div>
                        ) : (
                            Object.entries(groupedByMonth).map(([month, rows]) => (
                                <div key={month}>
                                    <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                        {month}
                                    </div>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Asset</TableHead>
                                                <TableHead>Category</TableHead>
                                                <TableHead>Vendor</TableHead>
                                                <TableHead>Purchased by</TableHead>
                                                <TableHead>Recorded by</TableHead>
                                                <TableHead>Payment</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                                <TableHead>Receipt</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {rows.map(row => (
                                                <TableRow key={row.id}>
                                                    <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                                                        {format(parseISO(row.purchase_date), 'dd MMM yyyy')}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium text-slate-900 text-sm">{row.asset_name}</div>
                                                        {row.serial_number && row.serial_number !== 'N/A' && (
                                                            <div className="text-xs text-slate-400">{row.serial_number}</div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-500">{row.category || '—'}</TableCell>
                                                    <TableCell className="text-sm text-slate-500">{row.vendor || '—'}</TableCell>
                                                    <TableCell className="text-sm text-slate-500">{row.purchased_by || '—'}</TableCell>
                                                    <TableCell className="text-sm text-slate-500">{row.recorded_by_name || '—'}</TableCell>
                                                    <TableCell>
                                                        {row.payment_type === 'credit' ? (
                                                            <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-700 bg-amber-50">
                                                                Credit · due {row.due_date ? format(parseISO(row.due_date), 'dd MMM') : '—'}
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-[10px] border-emerald-200 text-emerald-700 bg-emerald-50">
                                                                {row.account_name || 'Cash / Bank'}
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm font-semibold tabular-nums whitespace-nowrap">
                                                        {Number(row.cost).toLocaleString()} {row.currency}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.receipt_url ? (
                                                            <a href={row.receipt_url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-700">
                                                                <Paperclip size={14} />
                                                            </a>
                                                        ) : (
                                                            <span className="text-slate-300">—</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ))
                        )}
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ---------------------------------------------------------------------------

function SummaryStat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
    return (
        <Card className="border-slate-200 rounded-xl p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                <Icon size={16} />
            </div>
            <div>
                <div className="text-xs text-slate-400">{label}</div>
                <div className="text-lg font-semibold text-slate-900 tabular-nums">{value}</div>
            </div>
        </Card>
    );
}