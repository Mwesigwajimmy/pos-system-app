'use client';

/**
 * --- BBU1 SOVEREIGN BUSINESS ONBOARDING ---
 * COMPONENT: SignupPage
 * ROLE: Primary gateway for business node initialization.
 * 
 * FEATURES:
 * - Localized Tax Atlas Integration
 * - Industrial Logic Categorization
 * - Geo-spatial Data Binding (Country/State)
 * - Mandatory Terms of Service Compliance
 * - Professional Off-White Sovereign Theme
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Country, State } from 'country-state-city';
import { motion } from 'framer-motion';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, SelectLabel } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox"; // Required for Terms
import { Loader2, Eye, EyeOff, Layers, MapPin, ShieldCheck, Calculator, ScrollText } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

/** 
 * TAX ATLAS: Mapping countries to their local Tax Identification nomenclature
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
 * INDUSTRIAL LOGIC: Sub-categorization engine for tailored business experiences
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
    fullName: z.string().min(2, "Full name required."),
    businessName: z.string().min(2, "Business name required."),
    businessType: z.string().min(1, "Select business category."),
    industry: z.string().min(1, "Select specific industry."),
    country: z.string().min(2),
    state: z.string().min(1, "Region selection required."),
    currency: z.string().min(3),
    taxNumber: z.string().min(4, "Tax ID required."),
    manualTaxRate: z.coerce.number().min(0).max(100),
    phone: z.string().min(8, "Valid phone number required."),
    address: z.string().min(5, "Address required."),
    email: z.string().email("Valid email required."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    // Mandatory Terms acceptance
    acceptTerms: z.literal(true, {
        errorMap: () => ({ message: "You must accept the terms of service." }),
    }),
});

type SignupFormInput = z.infer<typeof signupSchema>;

export default function SignupPage() {
    const router = useRouter();
    const params = useParams();
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
            password: '',
            acceptTerms: false as any
        } 
    });

    const selectedCountryCode = useWatch({ control: form.control, name: 'country' });
    const selectedType = useWatch({ control: form.control, name: 'businessType' });
    
    const allCountries = useMemo(() => Country.getAllCountries(), []);
    const availableStates = useMemo(() => State.getStatesOfCountry(selectedCountryCode) || [], [selectedCountryCode]);
    const countryDetails = useMemo(() => Country.getCountryByCode(selectedCountryCode), [selectedCountryCode]);

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

    useEffect(() => {
        form.setValue('industry', '');
    }, [selectedType, form]);

    const handleSignup = async (values: SignupFormInput) => {
        setIsLoading(true);
        const toastId = toast.loading('Creating your sovereign account...');

        const { data, error } = await supabase.auth.signUp({
            email: values.email,
            password: values.password,
            options: {
                emailRedirectTo: `${window.location.origin}/callback`,
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

        const locale = params?.locale || 'en';
        if (data.session) {
            router.push(`/${locale}/dashboard`);
        } else {
            toast.success('Account created. Please check your email to verify.', { id: toastId, duration: 10000 });
            router.push(`/${locale}/auth/check-email`);
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 relative flex items-center justify-center p-4 py-12 font-sans antialiased text-slate-900 overflow-hidden">
            
            {/* CLEAN PROFESSIONAL BACKGROUND GRID */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.05] bg-[url('/patterns/grid-dark.svg')] bg-[length:40px_40px]" />

            <Card className="relative z-10 w-full max-w-4xl shadow-xl border-slate-200 bg-white rounded-3xl overflow-hidden border-none">
                <CardHeader className="p-8 border-b border-slate-50 text-center">
                    <div className="flex justify-center mb-6">
                        {/* THE B-LOGO INTEGRATION */}
                        <img src="/logo.png" alt="BBU1 Logo" className="w-16 h-16 object-contain" /> 
                    </div>
                    <CardTitle className="text-3xl font-black uppercase tracking-tighter text-slate-900">
                        Create Business Account
                    </CardTitle>
                    <CardDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-2">
                        Set up your global business profile and financial ledger
                    </CardDescription>
                </CardHeader>
                
                <CardContent className="p-8 lg:p-12">
                    <Form {...form}>
                        <form 
                            onSubmit={form.handleSubmit(handleSignup, () => toast.error("Fill in missing fields please."))} 
                            className="space-y-10"
                        >
                            
                            {/* SECTION I: PERSONAL */}
                            <div className="space-y-6">
                                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-blue-600"/> Personal Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="fullName" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-600">Full Name <span className="text-red-500">*</span></FormLabel>
                                            <FormControl><Input placeholder="John Doe" className="h-12 rounded-xl border-slate-100 bg-slate-50/50 focus:ring-blue-500" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="businessName" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-600">Business Name <span className="text-red-500">*</span></FormLabel>
                                            <FormControl><Input placeholder="Acme Corp Ltd" className="h-12 rounded-xl border-slate-100 bg-slate-50/50 focus:ring-blue-500" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            </div>

                            {/* SECTION II: LOCATION & TAX */}
                            <div className="bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100 space-y-6">
                                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-blue-600"/> Business Location & Tax
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <FormField control={form.control} name="country" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-600">Country <span className="text-red-500">*</span></FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger className="h-12 bg-white border-slate-200 rounded-xl shadow-sm"><SelectValue/></SelectTrigger></FormControl>
                                                <SelectContent className="max-h-[300px]">
                                                    <ScrollArea className="h-64">
                                                        {allCountries.map(c => <SelectItem key={c.isoCode} value={c.isoCode}>{c.name}</SelectItem>)}
                                                    </ScrollArea>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="state" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-600">State / Region <span className="text-red-500">*</span></FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger className="h-12 bg-white border-slate-200 rounded-xl shadow-sm"><SelectValue placeholder="Select Region"/></SelectTrigger></FormControl>
                                                <SelectContent className="max-h-[300px]">
                                                    <ScrollArea className="h-64">
                                                        {availableStates.length > 0 ? (
                                                            availableStates.map(s => <SelectItem key={s.isoCode || s.name} value={s.name}>{s.name}</SelectItem>)
                                                        ) : (
                                                            <SelectItem value="N/A">General</SelectItem>
                                                        )}
                                                    </ScrollArea>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="currency" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-600">Currency <span className="text-red-500">*</span></FormLabel>
                                            <FormControl><Input readOnly className="h-12 bg-slate-100 font-bold text-slate-500 border-slate-200 rounded-xl" {...field} /></FormControl>
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="taxNumber" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-600">{taxLabelAtlas[selectedCountryCode] || 'TIN'} Number <span className="text-red-500">*</span></FormLabel>
                                            <FormControl><Input placeholder="Tax ID" className="h-12 bg-white border-slate-200 uppercase rounded-xl" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="manualTaxRate" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-600 flex items-center gap-1"><Calculator className="w-3 h-3 text-blue-500"/> Tax Rate (%) <span className="text-red-500">*</span></FormLabel>
                                            <FormControl><Input type="number" step="0.01" className="h-12 bg-white border-slate-200 rounded-xl" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="phone" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-600">Phone Number <span className="text-red-500">*</span></FormLabel>
                                            <FormControl><Input className="h-12 border-slate-200 bg-white rounded-xl shadow-sm" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                <FormField control={form.control} name="address" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase text-slate-600">Business Address <span className="text-red-500">*</span></FormLabel>
                                        <FormControl><Input placeholder="Building, Street, City" className="h-12 bg-white border-slate-200 rounded-xl shadow-sm" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            {/* SECTION III: INDUSTRY */}
                            <div className="space-y-6">
                                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-blue-600"/> Industry Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="businessType" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-600">Category <span className="text-red-500">*</span></FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger className="h-12 border-slate-200 rounded-xl"><SelectValue placeholder="Select Category" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectGroup>
                                                        {Object.keys(industryMapping).map(k => (
                                                            <SelectItem key={k} value={k}>{k}</SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                    
                                    <FormField control={form.control} name="industry" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-600">Specific Industry <span className="text-red-500">*</span></FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={!selectedType}>
                                                <FormControl><SelectTrigger className="h-12 border-slate-200 rounded-xl"><SelectValue placeholder="Select Industry" /></SelectTrigger></FormControl>
                                                <SelectContent className="max-h-[300px]">
                                                    <ScrollArea className="h-64">
                                                        {(industryMapping[selectedType] || []).map(s => (
                                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                                        ))}
                                                    </ScrollArea>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                </div>
                            </div>

                            {/* SECTION IV: ACCOUNT SECURITY */}
                            <div className="space-y-6 pt-6 border-t border-slate-100">
                                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-blue-600"/> Account Security
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="email" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-600">Email Address <span className="text-red-500">*</span></FormLabel>
                                            <FormControl><Input type="email" placeholder="email@example.com" className="h-12 border-slate-100 bg-slate-50/50 rounded-xl shadow-sm" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="password" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-600">Password <span className="text-red-500">*</span></FormLabel>
                                            <div className="relative">
                                                <FormControl><Input type={isVisible ? 'text' : 'password'} className="h-12 pr-12 border-slate-100 bg-slate-50/50 rounded-xl shadow-sm" {...field} /></FormControl>
                                                <button type="button" onClick={() => setIsVisible(!isVisible)} className="absolute right-4 top-3 text-slate-400 hover:text-slate-900 transition-colors">
                                                    {isVisible ? <EyeOff size={18}/> : <Eye size={18}/>}
                                                </button>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                {/* SECTION V: LEGAL COMPLIANCE */}
                                <FormField
                                    control={form.control}
                                    name="acceptTerms"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                    className="w-5 h-5 rounded-md border-slate-300"
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                                                    I acknowledge and accept the BBU1 Sovereign <TermsDialog /> <span className="text-red-500 ml-1">*</span>
                                                </FormLabel>
                                                <FormMessage className="text-[9px]" />
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </div>
                            
                            {/* SUBMIT ACTION */}
                            <Button 
                                type="submit" 
                                className="w-full h-14 text-sm font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-xl shadow-blue-100 transition-all disabled:opacity-50 active:scale-[0.98]" 
                                disabled={isLoading}
                            >
                                {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating Account...</> : "Create Account"}
                            </Button>

                            <div className="flex flex-col md:flex-row justify-center items-center gap-4 text-center">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Already have a node account?</span>
                                <Link 
                                    href={`/${params?.locale || 'en'}/login`} 
                                    className="text-[10px] font-black uppercase text-blue-600 hover:underline tracking-widest"
                                >
                                    Log In
                                </Link>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}

/**
 * --- LEGAL TERMS DIALOG ---
 * DISPLAYS THE FULL TERMS OF SERVICE DOCUMENT WITHOUT LEAVING THE PAGE.
 */
function TermsDialog() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <button type="button" className="text-blue-600 underline hover:text-blue-800 transition-colors">
                    Terms of Service
                </button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-white rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                <DialogHeader className="p-8 bg-slate-900 text-white">
                    <DialogTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                        <ScrollText className="w-6 h-6 text-blue-400" />
                        Terms of Service
                    </DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[60vh] p-10 text-slate-600 leading-relaxed font-medium">
                    <div className="space-y-6 text-sm">
                        <p className="font-bold text-slate-900 italic">Effective Date: June 2024</p>
                        <p>Welcome to BBU1. These Terms of Service ("Terms") govern your access to and use of the BBU1 website, products, and services (collectively, the "Services"). By accessing or using our Services, you agree to be bound by these Terms.</p>
                        
                        <h4 className="font-black text-slate-900 uppercase text-[11px] tracking-widest">1. Acceptance of Terms</h4>
                        <p>By creating an account, accessing, or using the Services, you acknowledge that you have read, understood, and agree to be bound by these Terms, and by our Privacy Policy and Cookie Policy. If you do not agree to these Terms, you may not access or use the Services.</p>
                        
                        <h4 className="font-black text-slate-900 uppercase text-[11px] tracking-widest">2. Changes to Terms</h4>
                        <p>We reserve the right to modify these Terms at any time. We will notify you of any changes by posting the new Terms on the BBU1 website and updating the "Last Updated" date.</p>
                        
                        <h4 className="font-black text-slate-900 uppercase text-[11px] tracking-widest">3. User Accounts</h4>
                        <p>To access certain features of the Services, you must register for an account. You agree to provide accurate, current, and complete information during the registration process. You are responsible for safeguarding your password and for all activities that occur under your account.</p>
                        
                        <h4 className="font-black text-slate-900 uppercase text-[11px] tracking-widest">4. Intellectual Property</h4>
                        <p>All content, trademarks, service marks, trade names, logos, and intellectual property rights displayed on the Services are the property of BBU1 or its licensors. You may not use, copy, reproduce, modify, or sell any of BBU1's intellectual property without our prior written consent.</p>
                        
                        <h4 className="font-black text-slate-900 uppercase text-[11px] tracking-widest">5. User Conduct</h4>
                        <p>You agree not to use the Services for any unlawful purpose or in any way that might harm, abuse, or interfere with any other user.</p>
                        
                        <h4 className="font-black text-slate-900 uppercase text-[11px] tracking-widest">6. Payments and Billing</h4>
                        <p>If you subscribe to any paid Services, you agree to pay all applicable fees and taxes. BBU1 reserves the right to change its pricing at any time, with reasonable notice.</p>
                        
                        <h4 className="font-black text-slate-900 uppercase text-[11px] tracking-widest">7. Termination</h4>
                        <p>We may terminate or suspend your access to the Services immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
                        
                        <h4 className="font-black text-slate-900 uppercase text-[11px] tracking-widest">8. Disclaimer of Warranties</h4>
                        <p>The Services are provided on an "AS IS" and "AS AVAILABLE" basis. BBU1 makes no warranties, expressed or implied, regarding the Services.</p>
                        
                        <h4 className="font-black text-slate-900 uppercase text-[11px] tracking-widest">9. Limitation of Liability</h4>
                        <p>In no event shall BBU1, nor its directors or employees, be liable for any indirect, incidental, or punitive damages resulting from your use of the Services.</p>
                        
                        <h4 className="font-black text-slate-900 uppercase text-[11px] tracking-widest">10. Governing Law</h4>
                        <p>These Terms shall be governed and construed in accordance with the laws of Uganda, without regard to its conflict of law provisions.</p>
                        
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                             <p className="text-[11px] font-bold text-slate-400">If you have any questions about these Terms, please contact us at support@bbu1.com.</p>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}