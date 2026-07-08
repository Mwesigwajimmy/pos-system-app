'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
    Loader2, Eye, EyeOff, Layers, MapPin, 
    ShieldCheck, Calculator, ScrollText, 
    CheckCircle2, Globe, FileCheck, Database,
    FileText, UserCircle, Target
} from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

/** 
 * FULL TAX ATLAS 
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
    ZA: 'TRN', ES: 'CIF', LK: 'TIN', SD: 'TIN', SE: 'ORG', CH: 'UID', SY: 'TIN', TW: 'BAN', TZ: 'TIN', 
    TH: 'TIN', TG: 'NIF', TT: 'BIR', TN: 'MF', TR: 'VKN', UG: 'TIN', UA: 'TIN', AE: 'TRN', GB: 'VAT', US: 'EIN', 
    UY: 'RUT', UZ: 'TIN', VE: 'RIF', VN: 'MST', YE: 'TIN', ZM: 'TPIN', ZW: 'BP'
};

/** 
 * RESTORED: ALL 11 CATEGORIES AND INDUSTRIES
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
        "Marketing & Digital Agency", "Real Estate Agency / Brokerage", "Architecture & Urban Planning",
        "HR & Recruitment Consultancy", "Insurance Agency / Brokerage", "Business Consultancy"
    ],
    "Medical": [
        "Medical Clinic / Private Practice", "Dental Clinic", "Veterinary Services",
        "Pharmacy / Chemist / Drug Store", "Diagnostic Lab / Imaging Center",
        "Optical Clinic / Eye Care", "Physiotherapy / Rehabilitation", "Medical Supplies / Equipment"
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

    // Update phone logic to fix "+undefined"
    useEffect(() => {
        if (countryDetails) {
            form.setValue('currency', countryDetails.currency);
            const code = (countryDetails as any).phonecode || (countryDetails as any).phoneCode;
            if (code) {
                form.setValue('phone', `+${code.replace('+', '')}`);
            }
            const c = selectedCountryCode;
            if (c === 'UG' || c === 'TZ' || c === 'RW') form.setValue('manualTaxRate', 18.0);
            else if (c === 'KE') form.setValue('manualTaxRate', 16.0);
            else if (['GB', 'FR', 'DE'].includes(c)) form.setValue('manualTaxRate', 20.0);
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
        const { data, error } = await supabase.auth.signUp({
            email: values.email,
            password: values.password,
            options: {
                emailRedirectTo: `${window.location.origin}/callback`,
                data: {
                    ...values,
                    taxLabel: taxLabelAtlas[values.country] || 'TIN',
                }
            }
        });

        if (error) {
            toast.error(error.message);
            setIsLoading(false);
            return;
        }

        const locale = params?.locale || 'en';
        if (data.session) {
            router.push(`/${locale}/dashboard`);
        } else {
            toast.success('Account created. Please check your email.');
            router.push(`/${locale}/auth/check-email`);
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen flex bg-white font-sans antialiased text-slate-900 flex-row-reverse">
            
            {/* RIGHT PANEL: RESTORED DEEP LONG FORM */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-20 overflow-y-auto">
                <div className="w-full max-w-2xl space-y-10 py-10">
                    
                    <header className="text-center space-y-4">
                        <div className="flex justify-center mb-4">
                             <img src="/logo.png" alt="BBU1 Logo" className="h-16 w-auto" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create Business Account</h2>
                        <p className="text-slate-500 font-medium">bold business solutions</p>
                    </header>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSignup)} className="space-y-10">
                            
                            {/* SECTION: PERSONAL */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-bold uppercase text-blue-600 tracking-wider flex items-center gap-2">
                                    <UserCircle size={18} /> Personal Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="fullName" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold text-slate-700">Full Name</FormLabel>
                                            <FormControl><Input placeholder="John Doe" className="h-11 rounded-lg border-slate-200" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="businessName" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold text-slate-700">Business Name</FormLabel>
                                            <FormControl><Input placeholder="Acme Corp Ltd" className="h-11 rounded-lg border-slate-200" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            </div>

                            {/* SECTION: LOCATION & TAX */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-bold uppercase text-blue-600 tracking-wider flex items-center gap-2">
                                    <MapPin size={18} /> Business Location & Tax
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                    <FormField control={form.control} name="country" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold text-slate-700">Country</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger className="h-11 border-slate-200"><SelectValue/></SelectTrigger></FormControl>
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
                                            <FormLabel className="text-xs font-semibold text-slate-700">State / Region</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger className="h-11 border-slate-200"><SelectValue placeholder="Select Region"/></SelectTrigger></FormControl>
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
                                            <FormLabel className="text-xs font-semibold text-slate-700">Currency</FormLabel>
                                            <FormControl><Input readOnly className="h-11 bg-slate-50 font-semibold border-slate-200" {...field} /></FormControl>
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="taxNumber" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold text-slate-700">{taxLabelAtlas[selectedCountryCode] || 'TIN'} Number</FormLabel>
                                            <FormControl><Input placeholder="Tax ID" className="h-11 border-slate-200" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="manualTaxRate" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold text-slate-700">Tax Rate (%)</FormLabel>
                                            <FormControl><Input type="number" step="0.01" className="h-11 border-slate-200" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="phone" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold text-slate-700">Phone Number</FormLabel>
                                            <FormControl><Input className="h-11 border-slate-200" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                <FormField control={form.control} name="address" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold text-slate-700">Business Address</FormLabel>
                                        <FormControl><Input placeholder="Building, Street, City" className="h-11 border-slate-200" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            {/* SECTION: INDUSTRY (RESTORED ALL 11) */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-bold uppercase text-blue-600 tracking-wider flex items-center gap-2">
                                    <Layers size={18} /> Business Classification
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="businessType" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold text-slate-700">Category</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger className="h-11 border-slate-200"><SelectValue placeholder="Select Category" /></SelectTrigger></FormControl>
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
                                            <FormLabel className="text-xs font-semibold text-slate-700">Specific Industry</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={!selectedType}>
                                                <FormControl><SelectTrigger className="h-11 border-slate-200"><SelectValue placeholder="Select Industry" /></SelectTrigger></FormControl>
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

                            {/* SECTION: SECURITY */}
                            <div className="space-y-6 pt-6 border-t border-slate-100">
                                <h3 className="text-xs font-bold uppercase text-blue-600 tracking-wider flex items-center gap-2">
                                    <Database size={18} /> Security Credentials
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="email" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold text-slate-700">Email Address</FormLabel>
                                            <FormControl><Input type="email" placeholder="name@company.com" className="h-11 border-slate-200" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="password" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold text-slate-700">Password</FormLabel>
                                            <div className="relative">
                                                <FormControl><Input type={isVisible ? 'text' : 'password'} className="h-11 pr-12 border-slate-200" {...field} /></FormControl>
                                                <button type="button" onClick={() => setIsVisible(!isVisible)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors">
                                                    {isVisible ? <EyeOff size={18}/> : <Eye size={18}/>}
                                                </button>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="acceptTerms"
                                    render={({ field }) => (
                                        <FormItem className="flex items-start space-x-3 space-y-0 p-5 bg-slate-50 rounded-xl border border-slate-100">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                    className="w-5 h-5 rounded border-slate-300"
                                                />
                                            </FormControl>
                                            <div className="space-y-1">
                                                <FormLabel className="text-xs font-medium text-slate-600 leading-normal">
                                                    I agree to the <TermsDialog /> and Privacy Policy.
                                                </FormLabel>
                                                <FormMessage />
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </div>
                            
                            <Button 
                                type="submit" 
                                className="w-full h-12 text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm transition-all" 
                                disabled={isLoading}
                            >
                                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Account...</> : "Create Account"}
                            </Button>

                            <div className="flex justify-center items-center gap-2 text-center">
                                <span className="text-xs font-medium text-slate-500">Already have an account?</span>
                                <Link 
                                    href={`/${params?.locale || 'en'}/login`} 
                                    className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                                >
                                    Log In
                                </Link>
                            </div>
                        </form>
                    </Form>
                </div>
            </div>

            {/* LEFT PANEL: RESTORED BRANDING (BLUE THEME, NO GRIDS) */}
            <div className="hidden lg:flex w-[450px] bg-blue-900 text-white flex-col justify-between p-12 lg:p-20 relative overflow-hidden shrink-0">
                <div className="relative z-10 space-y-12">
                    {/* COMPANY "B" LOGO */}
                    <div className="flex items-center gap-4">
                        <img src="/logo.png" alt="BBU1 Logo" className="h-14 w-auto brightness-0 invert" />
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">BBU1 GLOBAL</h1>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-300">bold business solutions</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <p className="text-blue-100 text-sm leading-relaxed font-medium">
                            Signup to experience a platform or system with everything in one place for your organisation. 
                            Built for modern organizations operating in a complex global market.
                        </p>
                    </div>

                    {/* FULL FEATURE SET */}
                    <div className="grid grid-cols-1 gap-5">
                        {[
                            { icon: FileCheck, text: "Internal & External Auditing" },
                            { icon: Layers, text: "Tax Book Records & Compliance" },
                            { icon: Globe, text: "Multi-Country & Multi-Currency" },
                            { icon: MapPin, text: "Multi-Location Location Tracking" },
                            { icon: Target, text: "Enterprise CRM & Pipelines" },
                            { icon: Calculator, text: "Cloud Accounting & Invoicing" },
                            { icon: ShieldCheck, text: "HR, Payroll & AI Insights" }
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-4 text-sm font-semibold text-blue-100">
                                <item.icon size={18} className="text-blue-400 shrink-0" />
                                <span>{item.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative z-10 pt-10 border-t border-white/10">
                    <p className="text-[11px] text-blue-300 font-bold uppercase tracking-widest">
                        Built for the world · Trusted by Enterprises
                    </p>
                </div>
            </div>
        </div>
    );
}

/** 
 * RESTORED: FULL TERMS OF SERVICE (10 POINTS)
 */
function TermsDialog() {
    return (
        <Dialog>
            <DialogTrigger asChild><button type="button" className="text-blue-600 font-bold hover:underline">Terms of Service</button></DialogTrigger>
            <DialogContent className="max-w-2xl bg-white rounded-xl p-0 overflow-hidden outline-none">
                <DialogHeader className="p-6 border-b border-slate-100 bg-white">
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                        <ScrollText className="w-5 h-5 text-blue-600" />
                        Terms of Service
                    </DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[60vh] p-10 text-slate-600 text-sm leading-relaxed">
                    <div className="space-y-6">
                        <p className="font-bold text-slate-900">Effective Date: June 2026</p>
                        <p>Welcome to BBU1. These Terms of Service ("Terms") govern your access to and use of the BBU1 website, products, and services (collectively, the "Services"). By accessing or using our Services, you agree to be bound by these Terms.</p>
                        
                        <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-widest">1. Acceptance of Terms</h4>
                        <p>By creating an account, accessing, or using the Services, you acknowledge that you have read, understood, and agree to be bound by these Terms, and by our Privacy Policy and Cookie Policy.</p>
                        
                        <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-widest">2. Changes to Terms</h4>
                        <p>We reserve the right to modify these Terms at any time. We will notify you of any changes by posting the new Terms on the BBU1 website.</p>
                        
                        <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-widest">3. User Accounts</h4>
                        <p>To access certain features of the Services, you must register for an account. You agree to provide accurate, current, and complete information during the registration process.</p>
                        
                        <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-widest">4. Intellectual Property</h4>
                        <p>All content, trademarks, service marks, trade names, logos, and intellectual property rights displayed on the Services are the property of BBU1 or its licensors.</p>
                        
                        <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-widest">5. User Conduct</h4>
                        <p>You agree not to use the Services for any unlawful purpose or in any way that might harm, abuse, or interfere with any other user.</p>
                        
                        <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-widest">6. Payments and Billing</h4>
                        <p>If you subscribe to any paid Services, you agree to pay all applicable fees and taxes. BBU1 reserves the right to change its pricing at any time.</p>
                        
                        <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-widest">7. Termination</h4>
                        <p>We may terminate or suspend your access to the Services immediately, without prior notice or liability, for any reason whatsoever.</p>
                        
                        <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-widest">8. Disclaimer of Warranties</h4>
                        <p>The Services are provided on an "AS IS" and "AS AVAILABLE" basis. BBU1 makes no warranties, expressed or implied, regarding the Services.</p>
                        
                        <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-widest">9. Limitation of Liability</h4>
                        <p>In no event shall BBU1, nor its directors or employees, be liable for any indirect, incidental, or punitive damages resulting from your use of the Services.</p>
                        
                        <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-widest">10. Governing Law</h4>
                        <p>These Terms shall be governed and construed in accordance with the laws of Uganda, without regard to its conflict of law provisions.</p>
                        
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-xs font-medium text-slate-500">Contact: support@bbu1.com</div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}