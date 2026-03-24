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
import { Loader2, Eye, EyeOff, Globe2, Layers, MapPin, ShieldCheck, Calculator } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";

/** 
 * TAX ATLAS (Logic Preserved)
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
 * INDUSTRIAL LOGIC (Logic Preserved)
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
        const toastId = toast.loading('Creating your account...');

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
            toast.success('Account created. Please check your email to verify.', { id: toastId, duration: 10000 });
            router.push('/auth/check-email');
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 py-12 font-sans antialiased text-slate-900">
            <Card className="w-full max-w-4xl shadow-xl border-slate-200 rounded-2xl overflow-hidden bg-white">
                <CardHeader className="p-8 border-b border-slate-100 text-center">
                    <div className="flex justify-center mb-4">
                        <Globe2 className="w-12 h-12 text-blue-600" /> 
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">
                        Create Business Account
                    </CardTitle>
                    <CardDescription className="text-slate-500 mt-2">
                        Set up your global business profile and financial ledger
                    </CardDescription>
                </CardHeader>
                
                <CardContent className="p-8 lg:p-12">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSignup)} className="space-y-10">
                            
                            {/* SECTION I: PERSONAL */}
                            <div className="space-y-6">
                                <h3 className="text-sm font-semibold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4"/> Personal Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="fullName" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold text-slate-700">Full Name</FormLabel>
                                            <FormControl><Input placeholder="John Doe" className="h-11 border-slate-200 focus:ring-blue-500" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="businessName" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold text-slate-700">Business Name</FormLabel>
                                            <FormControl><Input placeholder="Acme Corp" className="h-11 border-slate-200 focus:ring-blue-500" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            </div>

                            {/* SECTION II: LOCATION & TAX */}
                            <div className="bg-slate-50 p-6 md:p-8 rounded-xl border border-slate-100 space-y-6">
                                <h3 className="text-sm font-semibold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-blue-500"/> Business Location & Tax
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <FormField control={form.control} name="country" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold text-slate-700">Country</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger className="h-11 bg-white border-slate-200"><SelectValue/></SelectTrigger></FormControl>
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
                                            <FormLabel className="text-xs font-bold text-slate-700">State / Region</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger className="h-11 bg-white border-slate-200"><SelectValue placeholder="Select Region"/></SelectTrigger></FormControl>
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
                                            <FormLabel className="text-xs font-bold text-slate-700">Currency</FormLabel>
                                            <FormControl><Input readOnly className="h-11 bg-slate-100 font-medium text-slate-600 border-slate-200" {...field} /></FormControl>
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="taxNumber" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold text-slate-700">{taxLabelAtlas[selectedCountryCode] || 'TIN'} Number</FormLabel>
                                            <FormControl><Input placeholder="Tax ID" className="h-11 bg-white border-slate-200 uppercase" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="manualTaxRate" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold text-slate-700 flex items-center gap-1"><Calculator className="w-3 h-3"/> Tax Rate (%)</FormLabel>
                                            <FormControl><Input type="number" step="0.01" className="h-11 bg-white border-slate-200" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="phone" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold text-slate-700">Phone Number</FormLabel>
                                            <FormControl><Input className="h-11 border-slate-200" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                <FormField control={form.control} name="address" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold text-slate-700">Business Address</FormLabel>
                                        <FormControl><Input placeholder="Street, City, Building" className="h-11 bg-white border-slate-200" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            {/* SECTION III: INDUSTRY */}
                            <div className="space-y-6">
                                <h3 className="text-sm font-semibold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                                    <Layers className="w-4 h-4"/> Industry Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="businessType" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold text-slate-700">Category</FormLabel>
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
                                            <FormLabel className="text-xs font-bold text-slate-700">Specific Industry</FormLabel>
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

                            {/* SECTION IV: ACCOUNT */}
                            <div className="space-y-6 pt-6 border-t border-slate-100">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="email" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold text-slate-700">Email Address</FormLabel>
                                            <FormControl><Input type="email" placeholder="email@example.com" className="h-11 border-slate-200" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="password" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold text-slate-700">Password</FormLabel>
                                            <div className="relative">
                                                <FormControl><Input type={isVisible ? 'text' : 'password'} className="h-11 pr-10 border-slate-200" {...field} /></FormControl>
                                                <button type="button" onClick={() => setIsVisible(!isVisible)} className="absolute right-3 top-3 text-slate-400">
                                                    {isVisible ? <EyeOff size={18}/> : <Eye size={18}/>}
                                                </button>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            </div>
                            
                            {/* SUBMIT */}
                            <Button 
                                type="submit" 
                                className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-all disabled:opacity-50" 
                                disabled={isLoading}
                            >
                                {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating Account...</> : "Sign Up"}
                            </Button>

                            <div className="flex flex-col md:flex-row justify-center items-center gap-4 text-center">
                                <span className="text-sm text-slate-500">Already have an account?</span>
                                <Link href="/login" className="text-sm font-bold text-blue-600 hover:underline">Log In</Link>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}