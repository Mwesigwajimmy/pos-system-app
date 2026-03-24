'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Country, State } from 'country-state-city';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye, EyeOff, Globe2, Layers, MapPin, ShieldCheck, Calculator } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";

/** 
 * ULTIMATE GLOBAL TAX ATLAS
 * Exhaustive mapping of every country's specific Tax Identification nomenclature.
 */
const taxLabelAtlas: Record<string, string> = {
    AF: 'TIN', AL: 'NIPT', DZ: 'NIF', AD: 'NR', AO: 'NIF', AG: 'TIN', AR: 'CUIT', AM: 'TIN', AU: 'ABN', AT: 'UID', 
    AZ: 'TIN', BS: 'TIN', BH: 'VAT', BD: 'BIN', BB: 'TIN', BY: 'UNP', BE: 'TVA', BZ: 'TIN', BJ: 'IFU', BT: 'TPN', 
    BO: 'NIT', BA: 'TIN', BW: 'TIN', BR: 'CNPJ', BN: 'BN', BG: 'VAT', BF: 'IFU', BI: 'TIN', KH: 'TIN', CM: 'TIN', 
    CA: 'BN', CL: 'RUT', CN: 'USCC', CO: 'NIT', KM: 'NIF', CG: 'NIF', CD: 'NIF', CR: 'NITE', HR: 'OIB', CU: 'NIT', 
    CY: 'TIC', CZ: 'DIC', DK: 'CVR', DJ: 'NIF', DM: 'TIN', DO: 'RNC', EC: 'RUC', EG: 'TIN', SV: 'NIT', EE: 'KMKR', 
    ET: 'TIN', FJ: 'TIN', FI: 'VAT', FR: 'SIRET', GA: 'NIF', GM: 'TIN', GE: 'TIN', DE: 'StNr', GH: 'TIN', GR: 'AFM', 
    GT: 'NIT', GN: 'NIF', GY: 'TIN', HT: 'NIF', HN: 'RTN', HK: 'BRN', HU: 'AN', IS: 'ID', IN: 'GSTIN', ID: 'NPWP', 
    IR: 'TIN', IQ: 'TIN', IE: 'TRN', IL: 'BN', IT: 'P.IVA', JM: 'TRN', JP: 'JCT', JO: 'TIN', KZ: 'BIN', KE: 'PIN', 
    KW: 'TIN', KG: 'TIN', LA: 'TIN', LV: 'NMR', LB: 'TIN', LS: 'TIN', LR: 'TIN', LY: 'TIN', LT: 'PVM', LU: 'TVA', 
    MG: 'NIF', MW: 'TPN', MY: 'TIN', MV: 'TIN', ML: 'NIF', MT: 'VAT', MU: 'TAN', MX: 'RFC', MC: 'TVA', MN: 'TIN', 
    ME: 'PIB', MA: 'ICE', MZ: 'NUIT', MM: 'TIN', NA: 'TIN', NP: 'PAN', NL: 'BTW', NZ: 'IRD', NI: 'RUC', NE: 'NIF', 
    NG: 'TIN', NO: 'ORG', OM: 'VAT', PK: 'NTN', PA: 'RUC', PY: 'RUC', PE: 'RUC', PH: 'TIN', PL: 'NIP', PT: 'NIF', 
    QA: 'TRN', RO: 'CIF', RU: 'INN', RW: 'TIN', SA: 'VAT', SN: 'NINEA', RS: 'PIB', SG: 'UEN', SK: 'DIC', SI: 'ID', 
    ZA: 'TRN', ES: 'CIF', LK: 'TIN', SD: 'TIN', SE: 'ORG', CH: 'UID', SY: 'TIN', TW: 'BAN', TJ: 'TIN', TZ: 'TIN', 
    TH: 'TIN', TG: 'NIF', TT: 'BIR', TN: 'MF', TR: 'VKN', UG: 'TIN', UA: 'TIN', AE: 'TRN', GB: 'VAT', US: 'EIN', 
    UY: 'RUT', UZ: 'TIN', VE: 'RIF', VN: 'MST', YE: 'TIN', ZM: 'TPIN', ZW: 'BP'
};

const industryMapping: Record<string, string[]> = {
    "Retail / Wholesale": ["General Supermarket", "Pharmacy", "Electronics", "Boutique", "Hardware", "Agro-vet"],
    "Restaurant / Cafe": ["Cafe", "Fast Food", "Fine Dining", "Bakery", "Bar / Lounge"],
    "Professional Services": ["Accounting", "Medical Clinic", "Legal Firm", "Business Consultancy", "IT Services", "Architecture"],
    "Field Service": ["General Maintenance", "Cleaning Services", "Barber Shop", "Beauty Salon", "Appliance Repair"],
    "Lending / Microfinance": ["Micro-lending", "Credit Union", "Fintech Lending"],
    "Telecom Services": ["Mobile Money Agent", "ISP", "Network Infrastructure"],
    "Distribution": ["FMCG Distribution", "Industrial Supplies", "Pharmaceutical Wholesale"],
    "Contractor": ["Civil Engineering", "General Building", "Interior Design", "Electrical"],
    "Rentals / Real Estate": ["Residential Property Mgmt", "Commercial Property Mgmt", "Short-stay / Airbnb"],
    "SACCO / Co-operative": ["Transport SACCO", "Farmers Co-operative", "Investment Group"],
    "Nonprofit": ["NGO", "Educational Institution", "Religious Organization"]
};

const signupSchema = z.object({
    fullName: z.string().min(2, "Legal name required."),
    businessName: z.string().min(2, "Business name required."),
    businessType: z.string().min(1, "Select industry category."),
    industry: z.string().min(1, "Select specific sector."),
    country: z.string().min(2),
    state: z.string().min(1, "Regional selection required for compliance."),
    currency: z.string().min(3),
    taxNumber: z.string().min(4, "Registration number required."),
    manualTaxRate: z.coerce.number().min(0).max(100),
    phone: z.string().min(8, "Valid business phone required."),
    address: z.string().min(10, "Physical address required."),
    email: z.string().email("Professional email required."),
    password: z.string().min(8, "Security requirement: 8+ characters."),
});

type SignupFormInput = z.infer<typeof signupSchema>;

export default function SignupPage() {
    const router = useRouter();
    const supabase = createClient();
    const [isLoading, setIsLoading] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    const form = useForm<SignupFormInput>({ 
        resolver: zodResolver(signupSchema), 
        defaultValues: { country: 'UG', currency: 'UGX', phone: '+256', manualTaxRate: 18.0 } 
    });

    const selectedCountryCode = useWatch({ control: form.control, name: 'country' });
    
    const allCountries = useMemo(() => Country.getAllCountries(), []);
    const availableStates = useMemo(() => State.getStatesOfCountry(selectedCountryCode) || [], [selectedCountryCode]);
    const countryDetails = useMemo(() => Country.getCountryByCode(selectedCountryCode), [selectedCountryCode]);

    useEffect(() => {
        if (countryDetails) {
            form.setValue('currency', countryDetails.currency);
            form.setValue('phone', `+${countryDetails.phoneCode}`);
            
            // Core Tax Rate Logic
            const c = selectedCountryCode;
            if (c === 'UG') form.setValue('manualTaxRate', 18.0);
            else if (c === 'KE') form.setValue('manualTaxRate', 16.0);
            else if (c === 'TZ') form.setValue('manualTaxRate', 18.0);
            else if (c === 'RW') form.setValue('manualTaxRate', 18.0);
            else if (c === 'US') form.setValue('manualTaxRate', 8.25);
            else if (c === 'NG') form.setValue('manualTaxRate', 7.5);
            else if (['GB', 'FR', 'DE', 'IT'].includes(c)) form.setValue('manualTaxRate', 20.0);
            else form.setValue('manualTaxRate', 0);
            
            form.setValue('state', ''); // Reset state on country change
        }
    }, [selectedCountryCode, countryDetails, form]);

    const handleSignup = async (values: SignupFormInput) => {
        setIsLoading(true);
        const toastId = toast.loading('Executing Sovereign Onboarding...');

        const { data, error } = await supabase.auth.signUp({
            email: values.email,
            password: values.password,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
                data: {
                    ...values,
                    taxLabel: taxLabelAtlas[values.country] || 'TIN',
                    taxStrategy: 'CATEGORICAL_DNA'
                }
            }
        });

        if (error) {
            toast.error(error.message, { id: toastId });
            setIsLoading(false);
            return;
        }

        if (data.session) {
            router.push('/dashboard');
        } else {
            toast.success('Empire Birthed. Verify your email to access the Ledger.', { id: toastId, duration: 10000 });
            router.push('/auth/check-email');
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 py-20 font-sans antialiased text-slate-900">
            <Card className="w-full max-w-5xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] border-none rounded-[4rem] overflow-hidden bg-white">
                <CardHeader className="bg-slate-900 text-white p-16 text-center relative">
                    <CardTitle className="text-6xl font-black flex flex-col items-center justify-center gap-8 tracking-tighter uppercase">
                        <Globe2 className="w-20 h-20 text-blue-400 animate-pulse" /> 
                        BBU1 Global Sovereign Setup
                    </CardTitle>
                    <CardDescription className="text-slate-400 font-black text-sm uppercase tracking-[0.5em] mt-6">Enterprise Financial Operating System</CardDescription>
                </CardHeader>
                <CardContent className="p-16">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSignup)} className="space-y-16">
                            
                            <div className="space-y-8">
                                <h3 className="text-[12px] font-black uppercase text-blue-600 tracking-[0.4em] flex items-center gap-4 border-b border-blue-50 pb-4">
                                    <ShieldCheck className="w-5 h-5"/> I. Executive Identity
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <FormField control={form.control} name="fullName" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-400">Managing Authority Legal Name</FormLabel>
                                            <FormControl><Input placeholder="Legal name as per ID" className="h-16 border-slate-100 bg-slate-50/50 font-black text-lg px-6 rounded-3xl" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="businessName" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-400">Registered Business Entity</FormLabel>
                                            <FormControl><Input placeholder="Trading name of empire" className="h-16 border-slate-100 bg-slate-50/50 font-black text-lg px-6 rounded-3xl" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            </div>

                            <div className="bg-blue-50/20 p-14 rounded-[3.5rem] border border-blue-100 space-y-12 shadow-inner">
                                <h3 className="text-[12px] font-black uppercase text-blue-600 tracking-[0.4em] flex items-center gap-4">
                                    <MapPin className="w-5 h-5 text-red-500"/> II. Jurisdictional Mandate
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                                    <FormField control={form.control} name="country" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-400">Operational Territory</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger className="h-16 bg-white font-black text-base px-6 rounded-3xl border-slate-200 shadow-sm"><SelectValue/></SelectTrigger></FormControl>
                                                <SelectContent className="max-h-[450px] rounded-[2rem] border-none shadow-2xl">
                                                    <ScrollArea className="h-96">
                                                        {allCountries.map(c => <SelectItem key={c.isoCode} value={c.isoCode} className="font-black text-slate-700">{c.name}</SelectItem>)}
                                                    </ScrollArea>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="state" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-400">Region / State / Province</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger className="h-16 bg-white font-black text-base px-6 rounded-3xl border-slate-200 shadow-sm"><SelectValue placeholder="Select Area"/></SelectTrigger></FormControl>
                                                <SelectContent className="max-h-[350px] rounded-[2rem] border-none shadow-2xl">
                                                    <ScrollArea className="h-80">
                                                        {availableStates.length > 0 ? (
                                                            availableStates.map(s => <SelectItem key={s.isoCode || s.name} value={s.name} className="font-black text-slate-700">{s.name}</SelectItem>)
                                                        ) : (
                                                            <SelectItem value="N/A">General / No sub-states</SelectItem>
                                                        )}
                                                    </ScrollArea>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="currency" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-400">Base Currency</FormLabel>
                                            <FormControl><Input readOnly className="h-16 bg-slate-200 font-mono font-black text-center text-xl rounded-3xl border-none" {...field} /></FormControl>
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="taxNumber" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-400">{taxLabelAtlas[selectedCountryCode] || 'TIN'} ID Number</FormLabel>
                                            <FormControl><Input placeholder="Reg Code" className="h-16 bg-white font-mono font-black text-xl px-6 rounded-3xl border-slate-200 uppercase shadow-sm" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="manualTaxRate" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><Calculator className="w-3.5 h-3.5"/> Tax Rate (%)</FormLabel>
                                            <FormControl><Input type="number" step="0.01" className="h-16 bg-white font-mono font-black text-2xl text-blue-600 px-6 rounded-3xl border-slate-200 shadow-sm" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="phone" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-400">Business Contact</FormLabel>
                                            <FormControl><Input className="h-16 font-black font-mono text-xl px-6 rounded-3xl border-slate-200 shadow-sm" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                <FormField control={form.control} name="address" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase text-slate-400">Headquarters Address</FormLabel>
                                        <FormControl><Input placeholder="Unit, Street, City, Region, Building" className="h-16 bg-white font-black text-lg px-6 rounded-3xl border-slate-200 shadow-sm" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            <div className="space-y-8">
                                <h3 className="text-[12px] font-black uppercase text-blue-600 tracking-[0.4em] flex items-center gap-4 border-b border-blue-50 pb-4">
                                    <Layers className="w-5 h-5"/> III. Industrial Logic Routing
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <FormField control={form.control} name="businessType" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-400">Industry Classification</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger className="h-16 font-black text-base px-6 rounded-3xl"><SelectValue placeholder="Identify Sector..." /></SelectTrigger></FormControl>
                                                <SelectContent className="rounded-[2rem] border-none shadow-2xl">
                                                    {Object.keys(industryMapping).map(k => <SelectItem key={k} value={k} className="font-black text-slate-700">{k}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="industry" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-400">Core Architecture DNA</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger className="h-16 font-black text-base px-6 rounded-3xl"><SelectValue placeholder="Select Business DNA..." /></SelectTrigger></FormControl>
                                                <SelectContent className="rounded-[2rem] border-none shadow-2xl">
                                                    {(industryMapping[form.getValues('businessType')] || []).map(s => <SelectItem key={s} value={s} className="font-black text-slate-700">{s}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                </div>
                            </div>

                            <div className="space-y-8 border-t border-slate-100 pt-12">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <FormField control={form.control} name="email" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-400">Sovereign Fiduciary Email</FormLabel>
                                            <FormControl><Input type="email" className="h-16 font-black text-xl px-6 rounded-3xl border-slate-200 shadow-sm" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="password" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-400">Kernel Encryption Key</FormLabel>
                                            <div className="relative">
                                                <FormControl><Input type={isVisible ? 'text' : 'password'} className="h-16 pr-16 font-mono font-black text-xl px-6 rounded-3xl border-slate-200 shadow-sm" {...field} /></FormControl>
                                                <button type="button" onClick={() => setIsVisible(!isVisible)} className="absolute right-6 top-5 text-slate-400 hover:text-blue-600">{isVisible ? <EyeOff size={26}/> : <Eye size={26}/>}</button>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            </div>
                            
                            <Button type="submit" className="w-full h-36 text-5xl font-black uppercase tracking-[0.5em] bg-blue-600 hover:bg-blue-700 shadow-2xl rounded-[3rem] border-b-[12px] border-blue-800" disabled={isLoading}>
                                {isLoading ? <Loader2 className="h-16 w-16 animate-spin" /> : "BIRTH EMPIRE"}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}