'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useBranding } from '@/components/core/BrandingProvider';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import {
    Building2, Phone, Users, FileText, CreditCard,
    Loader2, Lock, KeyRound
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const SECTIONS = [
    { id: 'business', label: 'Business', icon: Building2 },
    { id: 'contact', label: 'Contact', icon: Phone },
    { id: 'people', label: 'People', icon: Users },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'payments', label: 'Payments', icon: CreditCard },
];

const EMPTY_GATEWAYS = {
    momo_till: '',
    momo_name: '',
    airtel_till: '',
    airtel_name: '',
    bank_name: '',
    bank_account_no: ''
};

function Field({
    label,
    hint,
    children,
    wide = false
}: {
    label: string;
    hint?: string;
    children: React.ReactNode;
    wide?: boolean;
}) {
    return (
        <div className={cn("space-y-2", wide && "sm:col-span-2")}>
            <Label className="text-xs font-medium text-slate-500">{label}</Label>
            {children}
            {hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
        </div>
    );
}

export default function SettingsForm() {
    const queryClient = useQueryClient();
    const { refreshBranding } = useBranding();

    const [settings, setSettings] = useState<any>({});
    const [gateways, setGateways] = useState({ ...EMPTY_GATEWAYS });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [businessId, setBusinessId] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState('business');
    const supabase = createClient();

    const [isGatewaysUnlocked, setIsGatewaysUnlocked] = useState(false);
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [enteredPin, setEnteredPin] = useState('');
    const [isVerifyingPin, setIsVerifyingPin] = useState(false);

    const baseline = useRef<string>('');

    useEffect(() => {
        async function loadSettings() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('business_id')
                    .eq('id', user.id)
                    .single();

                if (!profile?.business_id) return;

                setBusinessId(profile.business_id);

                const { data: identity } = await supabase
                    .from('tenants')
                    .select('*')
                    .eq('id', profile.business_id)
                    .single();

                let nextSettings: any = {};
                let nextGateways = { ...EMPTY_GATEWAYS };

                if (identity) {
                    nextSettings = {
                        name: identity.name,
                        phone: identity.phone,
                        whatsapp_number: identity.whatsapp_number,
                        currency_code: identity.currency_code,
                        tin_number: identity.tin_number,
                        plot_number: identity.plot_number,
                        po_box: identity.po_box,
                        official_email: identity.official_email,
                        receipt_footer: identity.receipt_footer,
                        ceo_name: identity.ceo_name,
                        ceo_designation: identity.ceo_designation,
                        payment_instructions: identity.payment_instructions
                    };
                    setSettings(nextSettings);
                }

                const { data: integrationsData } = await supabase
                    .from('integrations')
                    .select('*')
                    .eq('business_id', profile.business_id);

                if (integrationsData) {
                    const momo = integrationsData.find(i => i.service_name === 'MTN_MOMO');
                    const airtel = integrationsData.find(i => i.service_name === 'AIRTEL_MONEY');
                    const bank = integrationsData.find(i => i.service_name === 'BANK_SETTLEMENT');

                    nextGateways = {
                        momo_till: momo?.meta?.merchant_code || '',
                        momo_name: momo?.meta?.account_name || '',
                        airtel_till: airtel?.meta?.merchant_code || '',
                        airtel_name: airtel?.meta?.account_name || '',
                        bank_name: bank?.meta?.account_name || '',
                        bank_account_no: bank?.meta?.merchant_code || ''
                    };
                    setGateways(nextGateways);
                }

                baseline.current = JSON.stringify({ settings: nextSettings, gateways: nextGateways });
            } finally {
                setLoading(false);
            }
        }
        loadSettings();
    }, [supabase]);

    const isDirty = useMemo(
        () => baseline.current !== '' && JSON.stringify({ settings, gateways }) !== baseline.current,
        [settings, gateways]
    );

    const handleVerifyPin = async () => {
        if (enteredPin.length < 4) {
            toast.error("Enter at least 4 digits");
            return;
        }
        setIsVerifyingPin(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Your session has expired. Sign in again.");

            const { data, error } = await supabase.rpc('fn_verify_master_security_pin', {
                p_user_id: user.id,
                p_pin: enteredPin
            });

            if (error) throw error;

            if (data?.status === 'SUCCESS' || data?.status === 'PIN_CREATED') {
                setIsGatewaysUnlocked(true);
                setIsPinModalOpen(false);
                setEnteredPin('');
                toast.success(data?.status === 'PIN_CREATED' ? "PIN set" : "Unlocked");
            } else {
                toast.error("That PIN is not correct");
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsVerifyingPin(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!businessId) return;
        setSaving(true);

        try {
            const { error: tenantErr } = await supabase
                .from('tenants')
                .update({
                    name: settings.name,
                    phone: settings.phone,
                    whatsapp_number: settings.whatsapp_number,
                    currency_code: settings.currency_code,
                    tin_number: settings.tin_number,
                    plot_number: settings.plot_number,
                    po_box: settings.po_box,
                    official_email: settings.official_email,
                    receipt_footer: settings.receipt_footer,
                    ceo_name: settings.ceo_name,
                    ceo_designation: settings.ceo_designation,
                    payment_instructions: settings.payment_instructions,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', businessId);

            if (tenantErr) throw tenantErr;

            if (isGatewaysUnlocked) {
                if (gateways.momo_till) {
                    await supabase.rpc('fn_save_merchant_payment_gateway', {
                        p_business_id: businessId,
                        p_service_name: 'MTN_MOMO',
                        p_merchant_code: gateways.momo_till,
                        p_account_name: gateways.momo_name || settings.name
                    });
                }
                if (gateways.airtel_till) {
                    await supabase.rpc('fn_save_merchant_payment_gateway', {
                        p_business_id: businessId,
                        p_service_name: 'AIRTEL_MONEY',
                        p_merchant_code: gateways.airtel_till,
                        p_account_name: gateways.airtel_name || settings.name
                    });
                }
                if (gateways.bank_account_no) {
                    await supabase.rpc('fn_save_merchant_payment_gateway', {
                        p_business_id: businessId,
                        p_service_name: 'BANK_SETTLEMENT',
                        p_merchant_code: gateways.bank_account_no,
                        p_account_name: gateways.bank_name || settings.name
                    });
                }
            }

            await queryClient.invalidateQueries({ queryKey: ['bbu1_corporate_identity'] });
            await queryClient.invalidateQueries({ queryKey: ['brandingSettings'] });
            await queryClient.invalidateQueries({ queryKey: ['tenant_identity'] });

            refreshBranding();
            baseline.current = JSON.stringify({ settings, gateways });
            toast.success('Settings saved');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const discardChanges = () => {
        if (!baseline.current) return;
        const restored = JSON.parse(baseline.current);
        setSettings(restored.settings);
        setGateways(restored.gateways);
    };

    if (loading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
        );
    }

    if (!businessId) {
        return (
            <div className="mx-auto max-w-md px-4 py-24 text-center">
                <p className="text-sm font-medium text-slate-900">No business found on your account</p>
                <p className="mt-2 text-sm text-slate-500">Contact your administrator to be added to a business.</p>
            </div>
        );
    }

    const activeLabel = SECTIONS.find(s => s.id === activeSection)?.label || '';

    return (
        <>
            <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 xl:px-8">
                <div className="mb-6">
                    <h1 className="text-xl font-semibold tracking-tight text-slate-900">Settings</h1>
                    <p className="mt-1 text-sm text-slate-500">{settings.name || 'Your business'}</p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10">
                    <nav className="hidden lg:block">
                        <div className="sticky top-6 space-y-0.5">
                            {SECTIONS.map(section => {
                                const Icon = section.icon;
                                const isActive = activeSection === section.id;
                                return (
                                    <button
                                        key={section.id}
                                        type="button"
                                        onClick={() => setActiveSection(section.id)}
                                        className={cn(
                                            "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                                            isActive
                                                ? "bg-slate-100 font-medium text-slate-900"
                                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                        )}
                                    >
                                        <Icon size={15} className={isActive ? "text-slate-900" : "text-slate-400"} />
                                        {section.label}
                                    </button>
                                );
                            })}
                        </div>
                    </nav>

                    <div className="lg:hidden">
                        <Label className="text-xs font-medium text-slate-500">Section</Label>
                        <Select value={activeSection} onValueChange={setActiveSection}>
                            <SelectTrigger className="mt-2 h-11 rounded-lg border-slate-200 text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-lg">
                                {SECTIONS.map(section => (
                                    <SelectItem key={section.id} value={section.id}>{section.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <form onSubmit={handleSave} className="min-w-0">
                        <div className="rounded-xl border border-slate-200 bg-white">
                            <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
                                <h2 className="text-sm font-semibold text-slate-900">{activeLabel}</h2>
                            </div>

                            <div className="px-5 py-6 sm:px-6">
                                {activeSection === 'business' && (
                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <Field label="Registered name">
                                            <Input
                                                value={settings.name || ''}
                                                onChange={e => setSettings({ ...settings, name: e.target.value })}
                                                className="h-11 rounded-lg border-slate-200 text-sm"
                                            />
                                        </Field>
                                        <Field label="Tax number (TIN)">
                                            <Input
                                                value={settings.tin_number || ''}
                                                onChange={e => setSettings({ ...settings, tin_number: e.target.value })}
                                                className="h-11 rounded-lg border-slate-200 font-mono text-sm"
                                            />
                                        </Field>
                                        <Field label="Currency" hint="Three-letter code, for example UGX or KES.">
                                            <Input
                                                value={settings.currency_code || ''}
                                                onChange={e => setSettings({ ...settings, currency_code: e.target.value.toUpperCase() })}
                                                maxLength={3}
                                                className="h-11 w-32 rounded-lg border-slate-200 text-sm uppercase"
                                            />
                                        </Field>
                                    </div>
                                )}

                                {activeSection === 'contact' && (
                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <Field label="Physical address">
                                            <Input
                                                value={settings.plot_number || ''}
                                                onChange={e => setSettings({ ...settings, plot_number: e.target.value })}
                                                className="h-11 rounded-lg border-slate-200 text-sm"
                                            />
                                        </Field>
                                        <Field label="P.O. Box">
                                            <Input
                                                value={settings.po_box || ''}
                                                onChange={e => setSettings({ ...settings, po_box: e.target.value })}
                                                className="h-11 rounded-lg border-slate-200 text-sm"
                                            />
                                        </Field>
                                        <Field label="Email">
                                            <Input
                                                type="email"
                                                inputMode="email"
                                                value={settings.official_email || ''}
                                                onChange={e => setSettings({ ...settings, official_email: e.target.value })}
                                                className="h-11 rounded-lg border-slate-200 text-sm"
                                            />
                                        </Field>
                                        <Field label="Phone">
                                            <Input
                                                type="tel"
                                                inputMode="tel"
                                                value={settings.phone || ''}
                                                onChange={e => setSettings({ ...settings, phone: e.target.value })}
                                                className="h-11 rounded-lg border-slate-200 text-sm"
                                            />
                                        </Field>
                                        <Field label="WhatsApp number" hint="Used for order messages from your storefront.">
                                            <Input
                                                type="tel"
                                                inputMode="tel"
                                                placeholder="+256..."
                                                value={settings.whatsapp_number || ''}
                                                onChange={e => setSettings({ ...settings, whatsapp_number: e.target.value })}
                                                className="h-11 rounded-lg border-slate-200 text-sm"
                                            />
                                        </Field>
                                    </div>
                                )}

                                {activeSection === 'people' && (
                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <Field label="Signatory name">
                                            <Input
                                                value={settings.ceo_name || ''}
                                                onChange={e => setSettings({ ...settings, ceo_name: e.target.value })}
                                                className="h-11 rounded-lg border-slate-200 text-sm"
                                            />
                                        </Field>
                                        <Field label="Title">
                                            <Input
                                                value={settings.ceo_designation || ''}
                                                onChange={e => setSettings({ ...settings, ceo_designation: e.target.value })}
                                                className="h-11 rounded-lg border-slate-200 text-sm"
                                            />
                                        </Field>
                                    </div>
                                )}

                                {activeSection === 'documents' && (
                                    <div className="grid gap-5">
                                        <Field label="Receipt footer" hint="Appears at the bottom of receipts and invoices.">
                                            <Input
                                                value={settings.receipt_footer || ''}
                                                onChange={e => setSettings({ ...settings, receipt_footer: e.target.value })}
                                                placeholder="Thank you for your business"
                                                className="h-11 rounded-lg border-slate-200 text-sm"
                                            />
                                        </Field>
                                        <Field label="Payment instructions" hint="Shown on invoices so customers know how to pay you.">
                                            <Textarea
                                                value={settings.payment_instructions || ''}
                                                onChange={e => setSettings({ ...settings, payment_instructions: e.target.value })}
                                                className="min-h-[140px] rounded-lg border-slate-200 p-4 text-sm leading-relaxed"
                                                placeholder="Bank name, account number, mobile money details"
                                            />
                                        </Field>
                                    </div>
                                )}

                                {activeSection === 'payments' && (
                                    !isGatewaysUnlocked ? (
                                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-8 text-center">
                                            <Lock size={20} className="mx-auto mb-3 text-slate-400" />
                                            <p className="text-sm font-medium text-slate-900">These details are locked</p>
                                            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                                                Till numbers and bank accounts decide where your money lands, so they need the owner PIN to change.
                                            </p>
                                            <Button
                                                type="button"
                                                onClick={() => setIsPinModalOpen(true)}
                                                className="mt-5 h-10 rounded-lg bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-800"
                                            >
                                                <KeyRound size={15} className="mr-2" />
                                                Enter PIN
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="grid gap-5 sm:grid-cols-2">
                                                <Field label="MTN MoMo till or number">
                                                    <Input
                                                        placeholder="689120 or 077..."
                                                        value={gateways.momo_till}
                                                        onChange={e => setGateways({ ...gateways, momo_till: e.target.value })}
                                                        className="h-11 rounded-lg border-slate-200 text-sm"
                                                    />
                                                </Field>
                                                <Field label="MTN account name">
                                                    <Input
                                                        placeholder={settings.name || 'Account name'}
                                                        value={gateways.momo_name}
                                                        onChange={e => setGateways({ ...gateways, momo_name: e.target.value })}
                                                        className="h-11 rounded-lg border-slate-200 text-sm"
                                                    />
                                                </Field>
                                                <Field label="Airtel Money till or number">
                                                    <Input
                                                        placeholder="198234 or 070..."
                                                        value={gateways.airtel_till}
                                                        onChange={e => setGateways({ ...gateways, airtel_till: e.target.value })}
                                                        className="h-11 rounded-lg border-slate-200 text-sm"
                                                    />
                                                </Field>
                                                <Field label="Airtel account name">
                                                    <Input
                                                        placeholder={settings.name || 'Account name'}
                                                        value={gateways.airtel_name}
                                                        onChange={e => setGateways({ ...gateways, airtel_name: e.target.value })}
                                                        className="h-11 rounded-lg border-slate-200 text-sm"
                                                    />
                                                </Field>
                                            </div>

                                            <div className="grid gap-5 border-t border-slate-200 pt-6 sm:grid-cols-2">
                                                <Field label="Bank">
                                                    <Input
                                                        placeholder="Centenary, Stanbic"
                                                        value={gateways.bank_name}
                                                        onChange={e => setGateways({ ...gateways, bank_name: e.target.value })}
                                                        className="h-11 rounded-lg border-slate-200 text-sm"
                                                    />
                                                </Field>
                                                <Field label="Account number">
                                                    <Input
                                                        inputMode="numeric"
                                                        placeholder="31000..."
                                                        value={gateways.bank_account_no}
                                                        onChange={e => setGateways({ ...gateways, bank_account_no: e.target.value })}
                                                        className="h-11 rounded-lg border-slate-200 font-mono text-sm"
                                                    />
                                                </Field>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>

                        <div className={cn(
                            "sticky bottom-0 mt-4 flex items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3 transition-colors",
                            isDirty ? "border-slate-300 shadow-lg" : "border-slate-200"
                        )}>
                            <p className="text-sm text-slate-500">
                                {isDirty ? 'You have unsaved changes' : 'All changes saved'}
                            </p>
                            <div className="flex items-center gap-2">
                                {isDirty ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={discardChanges}
                                        className="h-10 rounded-lg px-4 text-sm font-medium text-slate-500"
                                    >
                                        Discard
                                    </Button>
                                ) : null}
                                <Button
                                    type="submit"
                                    disabled={saving || !isDirty}
                                    className="h-10 rounded-lg bg-slate-900 px-6 text-sm font-medium text-white hover:bg-slate-800"
                                >
                                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Save
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            <Dialog open={isPinModalOpen} onOpenChange={setIsPinModalOpen}>
                <DialogContent className="w-[calc(100%-1.5rem)] rounded-xl p-0 sm:max-w-sm">
                    <DialogHeader className="border-b border-slate-200 px-5 py-4 text-left">
                        <DialogTitle className="text-base font-semibold text-slate-900">Owner PIN</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 px-5 py-6">
                        <Input
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="••••"
                            value={enteredPin}
                            onChange={e => setEnteredPin(e.target.value.replace(/\D/g, ''))}
                            className="h-14 rounded-lg border-slate-200 text-center text-2xl tracking-[0.4em]"
                        />
                        <p className="text-xs leading-relaxed text-slate-500">
                            If no PIN has been set for this account yet, the code you enter becomes the PIN.
                        </p>
                    </div>

                    <DialogFooter className="gap-2 border-t border-slate-200 px-5 py-4">
                        <Button
                            variant="ghost"
                            onClick={() => { setIsPinModalOpen(false); setEnteredPin(''); }}
                            className="h-11 rounded-lg px-4 text-sm font-medium text-slate-500"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleVerifyPin}
                            disabled={isVerifyingPin || enteredPin.length < 4}
                            className="h-11 flex-1 rounded-lg bg-slate-900 text-sm font-medium text-white hover:bg-slate-800 sm:flex-none sm:px-6"
                        >
                            {isVerifyingPin ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Unlock
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}