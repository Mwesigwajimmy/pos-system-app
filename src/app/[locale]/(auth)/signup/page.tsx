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

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, SelectLabel } from "@/components/ui/select";
import { Loader2, Eye, EyeOff, Globe2, Layers, MapPin, ShieldCheck, Calculator, Phone, Briefcase, Landmark } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";

/** 
 * ULTIMATE GLOBAL TAX ATLAS
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

/** 
 * COMPREHENSIVE INDUSTRIAL LOGIC DNA (From File 2)
 */
const industryMapping: Record<string, string[]> = {
    "Retail / Wholesale": [
        "Local Shop / Kiosk", "Small-Scale Vendor / Hawker", "Market Stall / Trader", "General Supermarket / Grocery",
        "Boutique / Fashion & Apparel", "Hardware & Construction Materials", "Pharmacy / Chemist / Drug Store",
        "Agro-vet & Farm Supplies", "Electronics & Mobile Accessories", "Cosmetics & Beauty Shop",
        "Auto Spare Parts", "Liquor Store / Wines & Spirits", "Bookshop & Stationery", "Furniture & Home Decor",
        "Wholesale Distribution (FMCG)", "Pet Shop / Supplies", "Jewelry & Luxury Goods", "Toy Store", "Gas Station Shop"
    ],
    "Restaurant / Cafe": [
        "Local Eatery (Kibanda / Mama Ntilie)", "Coffee Shop / Cafe", "Fast Food / Quick Service", "Fine Dining / Restaurant",
        "Bakery & Pastry Shop", "Bar / Pub / Lounge", "Nightclub / Entertainment Venue", "Food Truck / Mobile Kitchen",
        "Catering Services", "Pizzeria", "Ice Cream / Dessert Parlor", "Juice & Smoothie Bar"
    ],
    "Contractor": [
        "Civil Engineering / Roadwork", "General Building Contractor", "Electrical Installation & Repair",
        "Plumbing & Sanitation", "HVAC / Air Conditioning", "Interior Design & Fit-out", "Carpentry & Joinery",
        "Roofing & Waterproofing", "Landscaping & Gardening", "Painting & Specialist Finishes", "Masonry & Tiling"
    ],
    "Field Service": [
        "Cleaning & Janitorial Services", "Salon / Barber Shop / Spa", "Laundry & Dry Cleaning", "Security & Surveillance",
        "Pest Control / Fumigation", "Waste Management / Recycling", "Appliance Repair", "Logistics / Courier / Delivery",
        "Moving & Storage", "Tailoring & Fashion Design", "Shoe Repair & Cobbler", "Photography & Videography"
    ],
    "Professional Services": [
        "Accounting / Audit / Tax", "Legal Services / Law Firm", "IT Support & Software Development",
        "Medical Clinic / Private Practice", "Dental Clinic", "Veterinary Services", "Marketing & Digital Agency",
        "Real Estate Agency / Brokerage", "Architecture & Urban Planning", "HR & Recruitment Consultancy",
        "Insurance Agency / Brokerage", "Business Consultancy"
    ],
    "Distribution": [
        "FMCG Distribution", "Pharmaceutical Wholesale", "Agricultural Produce Aggregator",
        "Building Materials Distribution", "Industrial Chemicals / Supplies", "Textile & Fabric Wholesale",
        "Hardware & Tool Distribution"
    ],
    "Lending / Microfinance": [
        "Micro-lending / Credit Provider", "Savings & Credit Union", "Fintech Lending Platform",
        "Debt Collection Agency", "Pawn Shop / Collateral Lending", "Leasing & Asset Finance"
    ],
    "Rentals / Real Estate": [
        "Residential Property Management", "Commercial Property Management", "Short-stay / Airbnb Host",
        "Car & Vehicle Hire", "Event Space / Tent & Chair Hire", "Construction Equipment Rental"
    ],
    "SACCO / Co-operative": [
        "Transport / Matatu SACCO", "Farmers Co-operative", "Investment Group (Chama)",
        "Housing Co-operative", "Employee Savings SACCO", "Artisan / Trade Co-operative"
    ],
    "Telecom Services": [
        "Cyber Cafe / Business Center", "Mobile Money & Agency Banking", "Internet Service Provider (ISP)",
        "Network Infrastructure / Fiber", "Satellite & VOIP Services", "Telecom Hardware Sales"
    ],
    "Nonprofit": [
        "NGO (International / National)", "Religious Organization / Church / Mosque", "Foundation / Trust",
        "Community Based Organization (CBO)", "School / Educational Institution", "Professional Association"
    ]
};

const signupSchema = z.object({
    fullName: z.string().min(2, "Legal authority name required."),
    businessName: z.string().min(2, "Enterprise entity name required."),
    businessType: z.string().min(1, "Select industry classification."),
    industry: z.string().min(1, "Select specific industrial DNA."),
    country: z.string().min(2),
    state: z.string().min(1, "Regional selection required."),
    currency: z.string().min(3),
    taxNumber: z.string().min(4, "Tax registration number required."),
    manualTaxRate: z.coerce.number().min(0).max(100),
    phone: z.string().min(8, "Valid business contact required."),
    address: z.string().min(5, "Physical headquarters address required."),
    email: z.string().email("Professional fiduciary email required."),
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
        defaultValues: { 
            country: 'UG', 
            currency: 'UGX', 
            phone: '+256', 
            manualTaxRate: 18.0,
            fullName: '',
            businessName: '',
            businessType: '',
            industry: '',
            address: '',
            taxNumber: '',
            state: '',
            email: '',
            password: ''
        } 
    });

    const selectedCountryCode = useWatch({ control: form.control, name: 'country' });
    const selectedType = useWatch({ control: form.control, name: 'businessType' });
    
    const allCountries = useMemo(() => Country.getAllCountries(), []);
    const availableStates = useMemo(() => State.getStatesOfCountry(selectedCountryCode) || [], [selectedCountryCode]);
    const countryDetails = useMemo(() => Country.getCountryByCode(selectedCountryCode), [selectedCountryCode]);

    // Handle Country -> Currency & Tax Logic
    useEffect(() => {
        if (countryDetails) {
            form.setValue('currency', countryDetails.currency);
            form.setValue('phone', `+${countryDetails.phoneCode}`);
            
            const c = selectedCountryCode;
            if (c === 'UG') form.setValue('manualTaxRate', 18.0);
            else if (c === 'KE') form.setValue('manualTaxRate', 16.0);
            else if (c === 'TZ') form.setValue('manualTaxRate', 18.0);
            else if (c === 'RW') form.setValue('manualTaxRate', 18.0);
            else if (['GB', 'FR', 'DE'].includes(c)) form.setValue('manualTaxRate', 20.0);
            else if (c === 'NG') form.setValue('manualTaxRate', 7.5);
            else if (c === 'ZA') form.setValue('manualTaxRate', 15.0);
            else form.setValue('manualTaxRate', 0);
            
            form.setValue('state', ''); 
        }
    }, [selectedCountryCode, countryDetails, form]);

    // Reset specific industry when category changes
    useEffect(() => {
        form.setValue('industry', '');
    }, [selectedType, form]);

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
            toast.success('Empire Birthed. Verify email to access the Ledger.', { id: toastId, duration: 10000 });
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
                            
                            {/* SECTION I: EXECUTIVE IDENTITY */}
                            <div className="space-y-8">
                                <h3 className="text-[12px] font-black uppercase text-blue-600 tracking-[0.4em] flex items-center gap-4 border-b border-blue-50 pb-4">
                                    <ShieldCheck className="w-5 h-5"/> I. Executive Identity
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <FormField control={form.control} name="fullName" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-400">Managing Authority Legal Name</FormLabel>
                                            <FormControl><Input placeholder="Full Legal Name" className="h-16 border-slate-100 bg-slate-50/50 font-black text-lg px-6 rounded-3xl" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="businessName" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-400">Registered Business Entity</FormLabel>
                                            <FormControl><Input placeholder="Trading Name of Empire" className="h-16 border-slate-100 bg-slate-50/50 font-black text-lg px-6 rounded-3xl" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            </div>

                            {/* SECTION II: JURISDICTIONAL MANDATE */}
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

                            {/* SECTION III: INDUSTRIAL LOGIC DNA */}
                            <div className="space-y-8">
                                <h3 className="text-[12px] font-black uppercase text-blue-600 tracking-[0.4em] flex items-center gap-4 border-b border-blue-50 pb-4">
                                    <Layers className="w-5 h-5"/> III. Industrial Logic Routing
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <FormField control={form.control} name="businessType" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-400">Industry Classification</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger className="h-16 font-black text-base px-6 rounded-3xl border-slate-200"><SelectValue placeholder="Identify Sector..." /></SelectTrigger></FormControl>
                                                <SelectContent className="rounded-[2rem] border-none shadow-2xl">
                                                    <SelectGroup>
                                                        <SelectLabel className="px-4 py-2 text-[10px] uppercase text-slate-400">Primary Categories</SelectLabel>
                                                        {Object.keys(industryMapping).map(k => (
                                                            <SelectItem key={k} value={k} className="font-black text-slate-700">{k}</SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                    
                                    <FormField control={form.control} name="industry" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-400">Core Architecture DNA</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={!selectedType}>
                                                <FormControl><SelectTrigger className="h-16 font-black text-base px-6 rounded-3xl border-slate-200"><SelectValue placeholder="Select Business DNA..." /></SelectTrigger></FormControl>
                                                <SelectContent className="rounded-[2rem] border-none shadow-2xl max-h-[400px]">
                                                    <ScrollArea className="h-80">
                                                        {(industryMapping[selectedType] || []).map(s => (
                                                            <SelectItem key={s} value={s} className="font-black text-slate-700">{s}</SelectItem>
                                                        ))}
                                                    </ScrollArea>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                </div>
                            </div>

                            {/* SECTION IV: SECURITY & CREDENTIALS */}
                            <div className="space-y-8 border-t border-slate-100 pt-12">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <FormField control={form.control} name="email" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-400">Sovereign Fiduciary Email</FormLabel>
                                            <FormControl><Input type="email" placeholder="admin@empire.com" className="h-16 font-black text-xl px-6 rounded-3xl border-slate-200 shadow-sm" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="password" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-400">Kernel Encryption Key</FormLabel>
                                            <div className="relative">
                                                <FormControl><Input type={isVisible ? 'text' : 'password'} className="h-16 pr-16 font-mono font-black text-xl px-6 rounded-3xl border-slate-200 shadow-sm" {...field} /></FormControl>
                                                <button type="button" onClick={() => setIsVisible(!isVisible)} className="absolute right-6 top-5 text-slate-400 hover:text-blue-600">
                                                    {isVisible ? <EyeOff size={26}/> : <Eye size={26}/>}
                                                </button>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            </div>
                            
                            {/* SUBMIT BUTTON */}
                            <Button 
                                type="submit" 
                                className="w-full h-36 text-5xl font-black uppercase tracking-[0.5em] bg-blue-600 hover:bg-blue-700 shadow-[0_40px_100px_rgba(59,130,246,0.6)] rounded-[3rem] border-b-[12px] border-blue-800 transition-all active:scale-95 disabled:opacity-50" 
                                disabled={isLoading}
                            >
                                {isLoading ? <><Loader2 className="mr-8 h-12 w-12 animate-spin" /> ESTABLISHING...</> : "BIRTH EMPIRE"}
                            </Button>

                            <div className="flex flex-col md:flex-row justify-between items-center gap-8 px-6">
                                <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-4">
                                    <ShieldCheck className="w-6 h-6 text-emerald-500" /> Forensic Mathematical Integrity Verified
                                </span>
                                <Link href="/login" className="text-sm font-black text-blue-600 uppercase hover:underline tracking-widest bg-blue-50 px-8 py-3 rounded-full">Access Existing Ledger</Link>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}