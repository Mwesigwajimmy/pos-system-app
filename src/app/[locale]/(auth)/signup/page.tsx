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
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

function generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let pw = '';
    for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    return pw;
}

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
    FileText, UserCircle, Target, Rocket, Sparkles, Search
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

const roleOptions = [
    { group: "Management", roles: [
        { value: 'owner', label: 'Owner / Founder' },
        { value: 'admin', label: 'Administrator' },
        { value: 'manager', label: 'Manager' },
    ]},
    { group: "Finance & Operations", roles: [
        { value: 'accountant', label: 'Accountant' },
        { value: 'auditor', label: 'Auditor' },
        { value: 'cashier', label: 'Cashier' },
        { value: 'loan_officer', label: 'Loan Officer' },
        { value: 'hr_manager', label: 'HR Manager' },
    ]},
    { group: "Medical & Healthcare", roles: [
        { value: 'doctor', label: 'Doctor / Physician' },
        { value: 'nurse', label: 'Nurse' },
        { value: 'pharmacist', label: 'Pharmacist' },
        { value: 'lab_technician', label: 'Lab Technician' },
        { value: 'receptionist', label: 'Receptionist' },
    ]},
];

const signupSchema = z.object({
    fullName: z.string().min(2, "Full name required."),
    businessName: z.string().min(2, "Business name required."),
    role: z.string().min(1, "Select your role."),
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
    confirmPassword: z.string().min(8, "Confirm password required."),
    acceptTerms: z.literal(true, {
        errorMap: () => ({ message: "You must accept the terms of service." }),
    }),
}).superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmPassword'], message: 'Passwords do not match.' });
    }
});

type SignupFormInput = z.infer<typeof signupSchema>;

/**
 * BRANDING CAROUSEL — feature mockups
 */
function AuditMockup() {
    const rows = ["Invoice #1042 approved", "Payroll batch verified", "Stock adjustment logged", "Expense claim reviewed"];
    return (
        <div className="p-4 space-y-2.5 h-28 flex flex-col justify-center">
            {rows.map((r, i) => (
                <motion.div key={r} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12, duration: 0.4 }} className="flex items-center gap-2 text-[11px] text-blue-100/90">
                    <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                    <span className="truncate">{r}</span>
                </motion.div>
            ))}
        </div>
    );
}

function TaxMockup() {
    return (
        <div className="p-4 h-28 flex items-center gap-4">
            <div className="flex-1 space-y-2">
                {[70, 55, 85, 40].map((w, i) => (
                    <div key={i} className="h-1.5 rounded-full bg-white/15" style={{ width: `${w}%` }} />
                ))}
            </div>
            <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                className="w-14 h-14 rounded-full border-2 border-emerald-400/70 flex items-center justify-center text-center text-[8px] font-black text-emerald-300 uppercase leading-tight shrink-0"
            >
                Filed
            </motion.div>
        </div>
    );
}

function GlobeMockup() {
    const dots: [number, number][] = [[20, 30], [70, 20], [45, 60], [80, 70], [15, 75]];
    return (
        <div className="relative h-28">
            {dots.map(([x, y], i) => (
                <motion.span
                    key={i}
                    className="absolute w-2 h-2 rounded-full bg-sky-400"
                    style={{ left: `${x}%`, top: `${y}%` }}
                    animate={{ scale: [1, 1.7, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.25 }}
                />
            ))}
        </div>
    );
}

function LocationMockup() {
    const pins: [number, number][] = [[25, 65], [55, 35], [80, 60]];
    return (
        <div className="relative h-28">
            <svg className="absolute inset-0 w-full h-full">
                <line x1="25%" y1="65%" x2="55%" y2="35%" stroke="rgba(255,255,255,0.25)" strokeDasharray="4 4" />
                <line x1="55%" y1="35%" x2="80%" y2="60%" stroke="rgba(255,255,255,0.25)" strokeDasharray="4 4" />
            </svg>
            {pins.map(([x, y], i) => (
                <motion.div
                    key={i}
                    className="absolute -translate-x-1/2 -translate-y-full"
                    style={{ left: `${x}%`, top: `${y}%` }}
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.2 }}
                >
                    <MapPin size={16} className="text-amber-300 fill-amber-300/30" />
                </motion.div>
            ))}
        </div>
    );
}

function CRMMockup() {
    const cols = ["Lead", "Qualified", "Won"];
    return (
        <div className="p-4 h-28 grid grid-cols-3 gap-2">
            {cols.map((label, i) => (
                <div key={label} className="rounded-md bg-white/5 p-1.5 flex flex-col gap-1.5">
                    <span className="text-[8px] uppercase tracking-wider text-blue-200/60 font-bold">{label}</span>
                    <motion.div
                        className="h-5 rounded bg-sky-400/80"
                        animate={{ opacity: [0.15, 1, 0.15] }}
                        transition={{ duration: 2.1, repeat: Infinity, delay: i * 0.5 }}
                    />
                </div>
            ))}
        </div>
    );
}

function AccountingMockup() {
    const bars = [40, 65, 50, 80, 60];
    return (
        <div className="p-4 h-28 flex items-end gap-1.5">
            {bars.map((h, i) => (
                <motion.div
                    key={i}
                    className="flex-1 rounded-t bg-gradient-to-t from-blue-500 to-sky-300"
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                />
            ))}
        </div>
    );
}

function HRMockup() {
    return (
        <div className="p-4 h-28 flex flex-col justify-between">
            <div className="flex -space-x-2">
                {[0, 1, 2, 3].map(i => (
                    <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-sky-300 border-2 border-blue-950" />
                ))}
            </div>
            <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-2 bg-white/10 rounded-lg px-2.5 py-1.5"
            >
                <Sparkles size={12} className="text-amber-300 shrink-0" />
                <span className="text-[10px] text-blue-100/90">Aura: Payroll ready to run in 2 days</span>
            </motion.div>
        </div>
    );
}

function SelectSearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
    return (
        <div className="sticky top-0 z-10 bg-popover p-2 border-b border-slate-100">
            <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                    type="text"
                    autoFocus
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder={placeholder}
                    className="w-full h-8 pl-8 pr-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
            </div>
        </div>
    );
}

const brandFeatures = [
    { icon: FileCheck, title: "Internal & External Auditing", accent: "from-sky-400 to-blue-600", description: "Every transaction, edit, and approval is logged automatically, giving auditors a tamper-proof trail without manual paperwork.", Mockup: AuditMockup },
    { icon: Layers, title: "Tax Book Records & Compliance", accent: "from-emerald-400 to-teal-600", description: "Tax rates and filings adapt to your country automatically, so every invoice and return stays compliant by default.", Mockup: TaxMockup },
    { icon: Globe, title: "Multi-Country & Multi-Currency", accent: "from-indigo-400 to-violet-600", description: "Transact, report, and consolidate across borders in over 160 currencies, all reconciled in real time.", Mockup: GlobeMockup },
    { icon: MapPin, title: "Multi-Location Tracking", accent: "from-amber-400 to-orange-600", description: "See every branch, warehouse, or storefront on one map, with stock and sales synced live across locations.", Mockup: LocationMockup },
    { icon: Target, title: "Enterprise CRM & Pipelines", accent: "from-rose-400 to-pink-600", description: "Move leads through a visual pipeline from first contact to closed deal, with nothing slipping through the cracks.", Mockup: CRMMockup },
    { icon: Calculator, title: "Cloud Accounting & Invoicing", accent: "from-blue-400 to-cyan-600", description: "Generate invoices, track expenses, and view live financial reports without spreadsheets or manual entry.", Mockup: AccountingMockup },
    { icon: ShieldCheck, title: "HR, Payroll & AI Insights", accent: "from-fuchsia-400 to-purple-600", description: "Aura automates payroll and surfaces HR insights before they become problems, so your people are always taken care of.", Mockup: HRMockup },
];

const slideVariants = {
    enter: (direction: number) => ({ opacity: 0, x: direction > 0 ? 80 : -80 }),
    center: { opacity: 1, x: 0 },
    exit: (direction: number) => ({ opacity: 0, x: direction > 0 ? -80 : 80 }),
};

function FeatureCarousel() {
    const [active, setActive] = useState(0);
    const [direction, setDirection] = useState(1);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        if (paused) return;
        const id = setInterval(() => {
            setDirection(1);
            setActive((p) => (p + 1) % brandFeatures.length);
        }, 2200);
        return () => clearInterval(id);
    }, [active, paused]);

    const goTo = (i: number) => {
        const next = ((i % brandFeatures.length) + brandFeatures.length) % brandFeatures.length;
        const goingForward =
            (next > active && !(active === 0 && next === brandFeatures.length - 1)) ||
            (active === brandFeatures.length - 1 && next === 0);
        setDirection(goingForward ? 1 : -1);
        setActive(next);
    };
    const current = brandFeatures[active];

    return (
        <div className="space-y-4">
            <div className="relative overflow-hidden">
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={active}
                        custom={direction}
                        variants={slideVariants}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.18}
                        onDragStart={() => setPaused(true)}
                        onDragEnd={(e, info) => {
                            if (info.offset.x < -60) goTo(active + 1);
                            else if (info.offset.x > 60) goTo(active - 1);
                            setPaused(false);
                        }}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="cursor-grab active:cursor-grabbing select-none"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <span className={cn("flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br shrink-0", current.accent)}>
                                <current.icon size={18} className="text-white" />
                            </span>
                            <span className="text-sm font-bold text-white leading-snug">{current.title}</span>
                        </div>

                        <div className="rounded-xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm shadow-xl">
                            <current.Mockup />
                        </div>

                        <p className="text-xs leading-relaxed text-blue-100/80 mt-4">{current.description}</p>
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="flex items-center gap-2 pt-1">
                {brandFeatures.map((f, i) => (
                    <button
                        key={f.title}
                        type="button"
                        onClick={() => goTo(i)}
                        className={cn("h-1.5 rounded-full transition-all duration-300", i === active ? "w-6 bg-white" : "w-1.5 bg-white/30 hover:bg-white/50")}
                        aria-label={`Show ${f.title}`}
                    />
                ))}
            </div>
        </div>
    );
}

export default function SignupPage() {
    const router = useRouter();
    const params = useParams();
    const supabase = createClient();
    const [isLoading, setIsLoading] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [isVisibleConfirm, setIsVisibleConfirm] = useState(false);

    const form = useForm<SignupFormInput>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            country: 'UG',
            currency: 'UGX',
            phone: '+256',
            manualTaxRate: 18.0,
            fullName: '',
            businessName: '',
            role: '',
            businessType: '',
            industry: '',
            address: '',
            taxNumber: '',
            state: '',
            email: '',
            password: '',
            confirmPassword: '',
            acceptTerms: false as any
        }
    });

    const selectedCountryCode = useWatch({ control: form.control, name: 'country' });
    const selectedType = useWatch({ control: form.control, name: 'businessType' });

    const allCountries = useMemo(() => Country.getAllCountries(), []);
    const availableStates = useMemo(() => State.getStatesOfCountry(selectedCountryCode) || [], [selectedCountryCode]);
    const countryDetails = useMemo(() => Country.getCountryByCode(selectedCountryCode), [selectedCountryCode]);

    // Search filters for the long dropdown lists (country / state / industry)
    const [countrySearch, setCountrySearch] = useState('');
    const [stateSearch, setStateSearch] = useState('');
    const [industrySearch, setIndustrySearch] = useState('');

    const filteredCountries = useMemo(
        () => allCountries.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase())),
        [allCountries, countrySearch]
    );
    const filteredStates = useMemo(
        () => availableStates.filter(s => s.name.toLowerCase().includes(stateSearch.toLowerCase())),
        [availableStates, stateSearch]
    );
    const filteredIndustries = useMemo(
        () => (industryMapping[selectedType] || []).filter(s => s.toLowerCase().includes(industrySearch.toLowerCase())),
        [selectedType, industrySearch]
    );

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

    // Multi-step form configuration
    const steps = ['Personal', 'Business', 'Classification', 'Security'];
    const [step, setStep] = useState<number>(0);
    const [direction, setDirection] = useState<number>(1);
    const stepFields: Array<Array<keyof SignupFormInput>> = [
        ['fullName', 'businessName'],
        ['country', 'state', 'currency', 'taxNumber', 'manualTaxRate', 'phone', 'address'],
        ['businessType', 'industry', 'role'],
        ['email', 'password', 'confirmPassword', 'acceptTerms'],
    ];

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

            {/* RIGHT PANEL: FULLSCREEN SINGLE-STEP FORM (NON-SCROLLABLE) */}
            <div className="relative flex-1 flex flex-col items-center justify-center p-8 lg:p-20 h-screen overflow-hidden">
                {/* ANIMATED ROCKET — top-right corner of the form */}
                <motion.div
                    className="absolute top-6 right-6 lg:top-8 lg:right-10 text-blue-600"
                    animate={{ rotate: [0, -14, 0], scale: [1, 1.15, 1] }}
                    transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 3 }}
                >
                    <Rocket className="w-7 h-7" />
                </motion.div>

                <div className="w-full max-w-2xl space-y-10 py-10">

                    <header className="text-center space-y-4">
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create Business Account</h2>
                        <div className="flex items-center justify-center">
                            <div className="flex items-center gap-3">
                                {steps.map((s, i) => (
                                    <div key={s} className="flex items-center gap-3">
                                        <div className={cn("flex flex-col items-center text-center")}> 
                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                                                i <= step ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 border border-slate-200'
                                            )}>
                                                {i + 1}
                                            </div>
                                            <span className="text-[11px] mt-1 text-slate-500 hidden sm:block">{s}</span>
                                        </div>
                                        {i < steps.length - 1 && (
                                            <div className={cn(i <= step - 1 ? 'w-8 h-0.5 bg-blue-600' : 'w-8 h-0.5 bg-slate-200')} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </header>

                    <Form {...form}>
                        {/* multi-step sliding form: render only the active step, unscrollable screen */}
                        <div className="w-full">
                            <AnimatePresence mode="wait" custom={direction} initial={false}>
                                {step === 0 && (
                                    <motion.div key="personal" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.45 }} className="space-y-6">
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
                                        {/* role removed from Personal step -- moved to Classification step */}
                                    </motion.div>
                                )}

                                {step === 1 && (
                                    <motion.div key="location" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.45 }} className="space-y-6">
                                        <h3 className="text-xs font-bold uppercase text-blue-600 tracking-wider flex items-center gap-2">
                                            <MapPin size={18} /> Business Location & Tax
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                            <FormField control={form.control} name="country" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-semibold text-slate-700">Country</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger className="h-11 border-slate-200"><SelectValue/></SelectTrigger></FormControl>
                                                        <SelectContent
                                                            className="max-h-[300px]"
                                                            header={<SelectSearchBox value={countrySearch} onChange={setCountrySearch} placeholder="Search countries..." />}
                                                        >
                                                            <ScrollArea className="h-64">
                                                                {filteredCountries.length > 0 ? (
                                                                    filteredCountries.map(c => <SelectItem key={c.isoCode} value={c.isoCode}>{c.name}</SelectItem>)
                                                                ) : (
                                                                    <div className="p-3 text-xs text-slate-400 text-center">No matches</div>
                                                                )}
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
                                                        <SelectContent
                                                            className="max-h-[300px]"
                                                            header={availableStates.length > 0 ? <SelectSearchBox value={stateSearch} onChange={setStateSearch} placeholder="Search regions..." /> : undefined}
                                                        >
                                                            <ScrollArea className="h-64">
                                                                {availableStates.length > 0 ? (
                                                                    filteredStates.length > 0 ? (
                                                                        filteredStates.map(s => <SelectItem key={s.isoCode || s.name} value={s.name}>{s.name}</SelectItem>)
                                                                    ) : (
                                                                        <div className="p-3 text-xs text-slate-400 text-center">No matches</div>
                                                                    )
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
                                    </motion.div>
                                )}

                                {step === 2 && (
                                    <motion.div key="classification" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.45 }} className="space-y-6">
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
                                                        <SelectContent
                                                            className="max-h-[300px]"
                                                            header={<SelectSearchBox value={industrySearch} onChange={setIndustrySearch} placeholder="Search industries..." />}
                                                        >
                                                            <ScrollArea className="h-64">
                                                                {filteredIndustries.length > 0 ? (
                                                                    filteredIndustries.map(s => (
                                                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                                                    ))
                                                                ) : (
                                                                    <div className="p-3 text-xs text-slate-400 text-center">No matches</div>
                                                                )}
                                                            </ScrollArea>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="role" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-semibold text-slate-700">Your Role</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-11 border-slate-200">
                                                                <SelectValue placeholder="Select your role in the business" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {roleOptions.map(group => (
                                                                <SelectGroup key={group.group}>
                                                                    <div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">{group.group}</div>
                                                                    {group.roles.map(r => (
                                                                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                                                    ))}
                                                                </SelectGroup>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </div>
                                    </motion.div>
                                )}

                                {step === 3 && (
                                    <motion.div key="security" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.45 }} className="space-y-6">
                                        <h3 className="text-xs font-bold uppercase text-blue-600 tracking-wider flex items-center gap-2">
                                            <Database size={18} /> Security Credentials
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField control={form.control} name="email" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-semibold text-slate-700">Email Address</FormLabel>
                                                    <FormControl><Input type="email" placeholder="name@company.com" className="h-11 border-slate-200" {...field} autoComplete="email" /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="password" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-semibold text-slate-700">Password</FormLabel>
                                                    <div className="relative">
                                                        <FormControl><Input type={isVisible ? 'text' : 'password'} className="h-11 pr-28 border-slate-200" {...field} autoComplete="new-password" /></FormControl>
                                                        <div className="absolute right-2 top-2 flex items-center gap-2">
                                                            <button type="button" onClick={() => setIsVisible(!isVisible)} className="text-slate-400 hover:text-slate-600 transition-colors px-3 py-1 rounded">
                                                                {isVisible ? <EyeOff size={18}/> : <Eye size={18}/>}
                                                            </button>
                                                            <button type="button" onClick={() => { const pw = generatePassword(); form.setValue('password', pw); form.setValue('confirmPassword', pw); }} className="text-xs px-3 py-1 bg-slate-100 rounded text-slate-700">Generate</button>
                                                        </div>
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />

                                            <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-semibold text-slate-700">Confirm Password</FormLabel>
                                                    <div className="relative">
                                                        <FormControl><Input type={isVisibleConfirm ? 'text' : 'password'} className="h-11 pr-12 border-slate-200" {...field} autoComplete="new-password" /></FormControl>
                                                        <button type="button" onClick={() => setIsVisibleConfirm(!isVisibleConfirm)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors">
                                                            {isVisibleConfirm ? <EyeOff size={18}/> : <Eye size={18}/>} 
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
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Navigation controls */}
                            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 mt-6">
                                {step > 0 && (
                                    <button type="button" onClick={() => { setDirection(-1); setStep(s => Math.max(0, s - 1)); }} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                                        ← Back
                                    </button>
                                )}

                                <button type="button" onClick={async () => {
                                    const fieldsForStep = stepFields[step] || [];
                                    const ok = await form.trigger(fieldsForStep as any);
                                    if (!ok) return;
                                    if (step < steps.length - 1) { setDirection(1); setStep(s => s + 1); }
                                    else { /* final submit */ form.handleSubmit(handleSignup)(); }
                                }} className={cn(
                                    "w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-bold transition-colors",
                                    step === 0 && "sm:ml-auto"
                                )}>
                                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : (step < steps.length - 1 ? 'Next' : 'Create Account')}
                                </button>
                            </div>

                            <div className="flex justify-center items-center gap-2 text-center mt-3">
                                <span className="text-xs font-medium text-slate-500">Already have an account?</span>
                                <Link
                                    href={`/${params?.locale || 'en'}/login`}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                                >
                                    Log In
                                </Link>
                            </div>
                        </div>
                    </Form>
                </div>
            </div>

            {/* LEFT PANEL: BRANDING (BLUE THEME) — sticky while the form side scrolls */}
            <div className="hidden lg:flex w-[480px] bg-blue-900 text-white flex-col justify-between p-10 xl:p-14 relative overflow-hidden shrink-0 lg:sticky lg:top-0 lg:h-screen lg:self-start">
                <div className="relative z-10 space-y-10 overflow-hidden">
                    {/* BIG WHITE CIRCLE + ANIMATED ROCKET LOGO */}
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="relative w-28 h-28 shrink-0 rounded-full bg-white flex items-center justify-center shadow-2xl shadow-black/30">
                            <motion.span
                                className="absolute inset-0 rounded-full border-2 border-white/70"
                                animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                            />
                            <motion.div
                                animate={{ scale: [1, 1.08, 1] }}
                                transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 1 }}
                            >
                                {/* src="/logo.png" — swap back to the production logo once hosted */}
                                <img src="/logo.png" alt="BBU1 Logo" className="w-16 h-16 object-contain" />
                            </motion.div>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">BBU1 GLOBAL</h1>
                        </div>
                    </div>

                    <p className="text-blue-100 text-sm leading-relaxed font-medium text-center">
                        Signup to experience a platform with everything in one place for your Business.
                    </p>

                    {/* ANIMATED, SWIPEABLE FEATURE CAROUSEL */}
                    <FeatureCarousel />
                </div>

                <div className="relative z-0">
                    <Link
                        href="/"
                        className="text-xs font-semibold text-blue-200 hover:text-white transition-colors inline-flex items-center gap-1.5"
                    >
                        ← Back to homepage
                    </Link>
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
