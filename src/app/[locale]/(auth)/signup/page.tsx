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
import { Loader2, Eye, EyeOff, Briefcase, Globe2, Layers } from 'lucide-react';

// --- GLOBAL COMPREHENSIVE INDUSTRY MAPPING ---
// This mapping covers global formal sectors and underserved local markets.
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

// --- Schema & Types (Updated with Industry) ---
const signupSchema = z.object({
    fullName: z.string().min(2, "Full name must be at least 2 characters."),
    businessName: z.string().min(2, "Business name must be at least 2 characters."),
    businessType: z.string().min(1, "Please select a business type."),
    industry: z.string().min(1, "Please select a specific industry."),
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
        defaultValues: { fullName: '', businessName: '', businessType: '', industry: '', email: '', password: '' } 
    });

    const handleSignup = async (values: SignupFormInput) => {
        setIsLoading(true);
        const toastId = toast.loading('Creating your account...');

        const { data, error } = await supabase.auth.signUp({
            email: values.email,
            password: values.password,
            options: {
                data: {
                    fullName: values.fullName,
                    businessName: values.businessName,
                    businessType: values.businessType,
                    industry: values.industry, // Metadata update
                }
            }
        });

        if (error) {
            toast.error(error.message, { id: toastId });
            setIsLoading(false);
            return;
        }

        // --- UNTOUCHED ORIGINAL RACE CONDITION LOGIC ---
        if (data.session) {
            toast.loading('Finalizing your business setup...', { id: toastId });

            // Call the new PostgreSQL function to safely fetch the profile,
            // which retries to give the backend trigger time to complete.
            const { data: profileData, error: profileError } = await supabase
                .rpc('get_user_business_profile');

            const profile = profileData ? profileData[0] : null;

            if (profileError || !profile) {
                // If the profile is not found even after retries, it's a critical error.
                toast.error(profileError?.message || 'Critical error: Could not find your business profile. Please try logging in or contact support.', { id: toastId, duration: 8000 });
                router.push('/login'); // Redirect to login as a fallback
                setIsLoading(false);
                return;
            }
            
            // Profile was found successfully!
            toast.success('Welcome! Your business is ready.', { id: toastId });
            router.push('/dashboard');

        } else {
            // handles the case where email confirmation is enabled.
            toast.success('Account created! Please check your email to confirm your account and log in.', { id: toastId, duration: 8000 });
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
                <FormLabel>Password</FormLabel>
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
    
    // Safety check: Reset specific industry if the parent business type changes
    useEffect(() => {
        setValue('industry', '');
    }, [selectedType, setValue]);

    if (!selectedType) return null;

    const industries = industryMapping[selectedType] || [];

    return (
        <FormField control={control} name="industry" render={({ field }) => (
            <FormItem className="animate-in fade-in slide-in-from-top-2 duration-400">
                <FormLabel className="flex items-center gap-2">
                    <Layers className="w-3 h-3 text-primary" /> Specific Industry / Sector
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="What is your specific industry?" /></SelectTrigger></FormControl>
                    <SelectContent className="max-h-[350px] overflow-y-auto">
                        <SelectGroup>
                            <SelectLabel>Global Sectors for {selectedType}</SelectLabel>
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
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                        <Globe2 className="w-6 h-6 text-primary" /> Create Your Business Account
                    </CardTitle>
                    <CardDescription>One account to run your entire business empire.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={onSubmit} className="space-y-4">
                            <FormField control={form.control} name="fullName" render={({ field }) => (
                                <FormItem><FormLabel>Your Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="businessName" render={({ field }) => (
                                <FormItem><FormLabel>Business Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            
                            {/* Business Type Field */}
                            <FormField control={form.control} name="businessType" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Business Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select business category..." /></SelectTrigger></FormControl>
                                        <SelectContent className="max-h-[250px]">
                                            <SelectGroup>
                                                <SelectLabel>Common</SelectLabel>
                                                <SelectItem value="Retail / Wholesale">Retail / Wholesale</SelectItem>
                                                <SelectItem value="Restaurant / Cafe">Restaurant / Cafe</SelectItem>
                                            </SelectGroup>
                                            <SelectGroup>
                                                <SelectLabel>Trades & Services</SelectLabel>
                                                <SelectItem value="Contractor">Contractor (General, Remodeling)</SelectItem>
                                                <SelectItem value="Field Service">Field Service (Trades, Barber, Salon)</SelectItem>
                                                <SelectItem value="Professional Services">Professional Services (Accounting, Medical)</SelectItem>
                                            </SelectGroup>
                                            <SelectGroup>
                                                <SelectLabel>Specialized Industries</SelectLabel>
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

                            {/* DYNAMIC SMART INDUSTRY DROPDOWN */}
                            <SmartIndustrySelect control={form.control} setValue={form.setValue} />
                            
                            <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />

                            <PasswordInput control={form.control} />
                            
                            <Button type="submit" className="w-full font-bold" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                                Sign Up Free
                            </Button>
                            
                            <p className="text-center text-sm text-muted-foreground pt-1">
                                Already have an account?{' '}
                                <Link href="/login" className="font-semibold text-primary hover:underline">Log In</Link>
                            </p>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}