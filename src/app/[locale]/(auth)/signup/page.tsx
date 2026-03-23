'use client';
import React, { useState, memo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye, EyeOff, Briefcase, Globe2, Layers, MapPin, Phone, Landmark } from 'lucide-react';

// --- GLOBAL COUNTRY DATA ---
const countries = [
    { code: 'UG', name: 'Uganda', currency: 'UGX' },
    { code: 'KE', name: 'Kenya', currency: 'KES' },
    { code: 'TZ', name: 'Tanzania', currency: 'TZS' },
    { code: 'RW', name: 'Rwanda', currency: 'RWF' },
    { code: 'US', name: 'United States', currency: 'USD' },
    { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
    { code: 'AE', name: 'United Arab Emirates', currency: 'AED' },
    { code: 'ZA', name: 'South Africa', currency: 'ZAR' },
    { code: 'NG', name: 'Nigeria', currency: 'NGN' },
    { code: 'IN', name: 'India', currency: 'INR' },
];

// --- GLOBAL COMPREHENSIVE INDUSTRY MAPPING ---
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

// --- Schema & Types (Updated with Global DNA) ---
const signupSchema = z.object({
    fullName: z.string().min(2, "Full name must be at least 2 characters."),
    businessName: z.string().min(2, "Business name must be at least 2 characters."),
    businessType: z.string().min(1, "Please select a business type."),
    industry: z.string().min(1, "Please select a specific industry."),
    country: z.string().min(2, "Country is required."),
    currency: z.string().min(3, "Currency is required."),
    phone: z.string().min(10, "Business phone is required."),
    address: z.string().min(5, "Physical address is required for receipts."),
    taxNumber: z.string().optional(),
    email: z.string().email("Please enter a valid email address."),
    password: z.string().min(6, "Password must be at least 6 characters."),
});
type SignupFormInput = z.infer<typeof signupSchema>;


// --- Logic Hook (ORIGINAL RACE CONDITION FIX PRESERVED) ---
const useSignup = () => {
    const router = useRouter();
    const supabase = createClient();
    const [isLoading, setIsLoading] = useState(false);
    
    const form = useForm<SignupFormInput>({ 
        resolver: zodResolver(signupSchema), 
        defaultValues: { 
            fullName: '', 
            businessName: '', 
            businessType: '', 
            industry: '', 
            country: 'UG', 
            currency: 'UGX', 
            phone: '', 
            address: '',
            taxNumber: '',
            email: '', 
            password: '' 
        } 
    });

    const handleSignup = async (values: SignupFormInput) => {
        setIsLoading(true);
        const toastId = toast.loading('Establishing your Business Empire...');

        const { data, error } = await supabase.auth.signUp({
            email: values.email,
            password: values.password,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
                data: {
                    fullName: values.fullName,
                    businessName: values.businessName,
                    businessType: values.businessType,
                    industry: values.industry,
                    country: values.country,
                    currency: values.currency,
                    phone: values.phone,
                    address: values.address,
                    taxNumber: values.taxNumber,
                    region: values.address.split(',')[0] // Extracts first part of address as region
                }
            }
        });

        if (error) {
            toast.error(error.message, { id: toastId });
            setIsLoading(false);
            return;
        }

        if (data.session) {
            toast.loading('Finalizing your business setup...', { id: toastId });
            const { data: profileData, error: profileError } = await supabase.rpc('get_user_business_profile');
            const profile = profileData ? profileData[0] : null;

            if (profileError || !profile) {
                toast.error(profileError?.message || 'Critical error: Profile not found.', { id: toastId, duration: 8000 });
                router.push('/login');
                setIsLoading(false);
                return;
            }
            
            toast.success('Welcome! Your business is ready.', { id: toastId });
            router.push('/dashboard');
        } else {
            toast.success('Account created! Please check your email to confirm your account.', { id: toastId, duration: 8000 });
            router.push('/auth/check-email');
        }
        setIsLoading(false);
    };

    return { form, isLoading, onSubmit: form.handleSubmit(handleSignup) };
};

// --- Password UI Component ---
const PasswordInput = memo(({ control }: { control: any }) => {
    const [isVisible, setIsVisible] = useState(false);
    return (
        <FormField control={control} name="password" render={({ field }) => (
            <FormItem>
                <FormLabel>Secure Password</FormLabel>
                <div className="relative">
                    <FormControl><Input type={isVisible ? 'text' : 'password'} className="pr-10" {...field} /></FormControl>
                    <button type="button" onClick={() => setIsVisible(!isVisible)} className="absolute right-0 top-0 h-full px-3 text-muted-foreground" aria-label={isVisible ? "Hide password" : "Show password"}>
                        {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
                <FormMessage />
            </FormItem>
        )} />
    );
});
PasswordInput.displayName = 'PasswordInput';

// --- Smart Global Industry Component ---
const SmartIndustrySelect = ({ control, setValue }: { control: any, setValue: any }) => {
    const selectedType = useWatch({ control, name: 'businessType' });
    
    useEffect(() => {
        setValue('industry', '');
    }, [selectedType, setValue]);

    if (!selectedType) return null;

    const industries = industryMapping[selectedType] || [];

    return (
        <FormField control={control} name="industry" render={({ field }) => (
            <FormItem className="animate-in fade-in slide-in-from-top-2 duration-400">
                <FormLabel className="flex items-center gap-2">
                    <Layers className="w-3 h-3 text-primary" /> Specific Sector
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Industry type?" /></SelectTrigger></FormControl>
                    <SelectContent className="max-h-[350px] overflow-y-auto">
                        <SelectGroup>
                            <SelectLabel>Available Sectors</SelectLabel>
                            {industries.map((ind) => (
                                <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
                <FormMessage />
            </FormItem>
        )} />
    );
};

// --- Main Signup Page Component ---
export default function SignupPage() {
    const { form, isLoading, onSubmit } = useSignup();

    // Auto-update currency based on country selection
    const selectedCountry = useWatch({ control: form.control, name: 'country' });
    useEffect(() => {
        const match = countries.find(c => c.code === selectedCountry);
        if (match) form.setValue('currency', match.currency);
    }, [selectedCountry, form]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <Card className="w-full max-w-2xl shadow-2xl border-none">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-black flex items-center justify-center gap-3">
                        <Globe2 className="w-8 h-8 text-blue-600" /> BBU1 ENTERPRISE SETUP
                    </CardTitle>
                    <CardDescription className="text-slate-500 font-medium">Establish your global business identity autonomously.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={onSubmit} className="space-y-6">
                            
                            {/* IDENTITY SECTION */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="fullName" render={({ field }) => (
                                    <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="businessName" render={({ field }) => (
                                    <FormItem><FormLabel>Business Name</FormLabel><FormControl><Input placeholder="Empire Holdings Ltd" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>

                            {/* GLOBAL LOCATION DNA SECTION */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-100/50 p-4 rounded-xl border border-slate-200">
                                <FormField control={form.control} name="country" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2"><MapPin className="w-3 h-3"/> Operational Country</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {countries.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="currency" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2"><Landmark className="w-3 h-3"/> Reporting Currency</FormLabel>
                                        <FormControl><Input readOnly className="bg-slate-200 font-mono font-bold" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            {/* CONTACT & ADDRESS (FOR RECEIPTS) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="phone" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2"><Phone className="w-3 h-3"/> Business Phone</FormLabel>
                                        <FormControl><Input placeholder="+256..." {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="address" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2"><MapPin className="w-3 h-3"/> Physical Address</FormLabel>
                                        <FormControl><Input placeholder="Plot 12, High St" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            {/* INDUSTRY ROUTING */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="businessType" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Industry Category</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select business type..." /></SelectTrigger></FormControl>
                                            <SelectContent className="max-h-[250px]">
                                                <SelectGroup>
                                                    <SelectLabel>Retail & Services</SelectLabel>
                                                    <SelectItem value="Retail / Wholesale">Retail / Wholesale</SelectItem>
                                                    <SelectItem value="Restaurant / Cafe">Restaurant / Cafe</SelectItem>
                                                    <SelectItem value="Field Service">Field Service (Trades, Salon)</SelectItem>
                                                    <SelectItem value="Professional Services">Professional Services</SelectItem>
                                                </SelectGroup>
                                                <SelectGroup>
                                                    <SelectLabel>Specialized</SelectLabel>
                                                    <SelectItem value="Distribution">Distribution / Wholesale Supply</SelectItem>
                                                    <SelectItem value="Lending / Microfinance">Lending / Microfinance</SelectItem>
                                                    <SelectItem value="Rentals / Real Estate">Rentals / Real Estate</SelectItem>
                                                    <SelectItem value="SACCO / Co-operative">SACCO / Co-operative</SelectItem>
                                                    <SelectItem value="Telecom Services">Telecom & Mobile Money</SelectItem>
                                                    <SelectItem value="Nonprofit">Nonprofit / Education / NGO</SelectItem>
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <SmartIndustrySelect control={form.control} setValue={form.setValue} />
                            </div>

                            <hr className="border-dashed" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem><FormLabel>Login Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <PasswordInput control={form.control} />
                            </div>
                            
                            <Button type="submit" className="w-full h-12 text-lg font-black bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "ESTABLISH EMPIRE"}
                            </Button>
                            
                            <p className="text-center text-sm text-muted-foreground pt-1">
                                Already possess a Sovereign ID?{' '}
                                <Link href="/login" className="font-bold text-blue-600 hover:underline">Log In</Link>
                            </p>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}