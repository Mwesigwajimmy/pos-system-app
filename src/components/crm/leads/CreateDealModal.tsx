'use client';

import { useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { 
    PlusCircle, 
    Briefcase, 
    UserCheck, 
    Map, 
    CreditCard, 
    Package, 
    Target,
    Users,
    Coins,
    Percent,
    Layers,
    ShieldCheck
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import type { Stage } from './SalesPipelineBoard';

// Import the real server action and its state type
import { createDeal, FormState } from '@/lib/crm/actions/leads';

interface Employee {
    id: string;
    full_name: string;
}

// Forensic Interface for the Live Catalog
interface CatalogPackage {
    id: string;
    name: string;
}

interface CreateDealModalProps {
    stages: Stage[];
    employees: Employee[]; 
    packages: CatalogPackage[]; // 🛡️ Dynamic Catalog Injection
    currentBusinessId: string;
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="bg-blue-600 hover:bg-blue-700 font-black text-[10px] uppercase tracking-[0.2em] px-8 shadow-lg shadow-blue-100">
            {pending ? 'Synchronizing Intelligence...' : 'Create Forensic Record'}
        </Button>
    );
}

export function CreateDealModal({ stages, employees, packages, currentBusinessId }: CreateDealModalProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);

    const initialState: FormState = { success: false, message: '', errors: null };
    const [formState, formAction] = useFormState(createDeal, initialState);

    useEffect(() => {
        if (formState.success) {
            toast({
                title: "Forensic Record Created",
                description: formState.message,
            });
            setIsOpen(false);
            router.refresh();
        } else if (formState.message && !formState.errors) {
            toast({
                title: "Sync Conflict",
                description: formState.message,
                variant: "destructive",
            });
        }
    }, [formState, router, toast]);

    const initialStageId = stages.length > 0 ? stages[0].id : '';

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-slate-900 hover:bg-slate-800 font-black text-[10px] uppercase tracking-widest gap-2 h-10 px-6 shadow-sm">
                    <PlusCircle className="h-4 w-4" />
                    Record Field Data
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden border-none rounded-xl shadow-2xl bg-white outline-none">
                <form action={formAction} className="flex flex-col h-full">
                    {/* ENTERPRISE HEADER */}
                    <DialogHeader className="px-8 py-7 bg-slate-900 text-white shrink-0">
                        <div className="flex items-center gap-4">
                             <div className="h-12 w-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                                <Target className="text-blue-400" size={26} />
                             </div>
                             <div className="space-y-0.5">
                                <DialogTitle className="text-2xl font-black tracking-tight uppercase">Lead Intelligence Entry</DialogTitle>
                                <DialogDescription className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                                    Record forensic data for field leads and commission opportunities.
                                </DialogDescription>
                             </div>
                        </div>
                    </DialogHeader>

                    {/* HIDDEN LOGISTICS NODE */}
                    <input type="hidden" name="business_id" value={currentBusinessId} />

                    <ScrollArea className="max-h-[75vh]">
                        <div className="p-8 space-y-8">
                            
                            {/* SECTION 1: CORE IDENTITY */}
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">1. Core Intelligence</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="title" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Opportunity Title</Label>
                                        <Input id="title" name="title" placeholder="e.g. Acme Corp Enterprise Setup" required className="h-11 font-black uppercase text-xs rounded-xl border-slate-200 focus:ring-2 focus:ring-blue-500/20" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="nature_of_business" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nature of Business</Label>
                                        <Input id="nature_of_business" name="nature_of_business" placeholder="e.g. Pharma, Retail, SACCO" className="h-11 font-black uppercase text-xs rounded-xl border-slate-200 focus:ring-2 focus:ring-blue-500/20" />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: PERFORMANCE TRACKING */}
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">2. Agent Performance tracking</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Marketing Agent</Label>
                                        <Select name="marketing_agent_id" required>
                                            <SelectTrigger className="h-11 font-black uppercase text-xs rounded-xl border-slate-200">
                                                <SelectValue placeholder="Select Authorized Agent" />
                                            </SelectTrigger>
                                            <SelectContent className="font-black uppercase text-[10px]">
                                                {employees.map(emp => (
                                                    <SelectItem key={emp.id} value={emp.id} className="hover:bg-blue-50 transition-colors">{emp.full_name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="marketing_team_name" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Marketing Team / Branch</Label>
                                        <Input id="marketing_team_name" name="marketing_team_name" placeholder="e.g. Northern Sales Team" className="h-11 font-black uppercase text-xs rounded-xl border-slate-200 focus:ring-2 focus:ring-blue-500/20" />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: FINANCIALS & LIVE CATALOG SYNC */}
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">3. Financials & Live Catalog Intel</Label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="value" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Deal Value</Label>
                                        <Input id="value" name="value" type="number" step="0.01" defaultValue="0.00" className="h-11 font-black text-emerald-700 rounded-xl border-slate-200" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Currency</Label>
                                        <Select name="currency_code" defaultValue="UGX">
                                            <SelectTrigger className="h-11 font-black uppercase text-xs rounded-xl border-slate-200">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="font-black uppercase text-[10px]">
                                                <SelectItem value="UGX">UGX (Uganda)</SelectItem>
                                                <SelectItem value="KES">KES (Kenya)</SelectItem>
                                                <SelectItem value="USD">USD (Global)</SelectItem>
                                                <SelectItem value="TZS">TZS (Tanzania)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="agreed_commission_percentage" className="text-[10px] font-black text-blue-700 uppercase tracking-widest ml-1">Commission %</Label>
                                        <Input id="agreed_commission_percentage" name="agreed_commission_percentage" type="number" step="0.1" defaultValue="5.0" className="h-11 font-black border-blue-100 bg-blue-50/50 text-blue-900 rounded-xl" />
                                    </div>
                                    
                                    {/* 🧠 THE LIVE CATALOG WELD */}
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Package</Label>
                                        <Select name="target_package_name" defaultValue={packages[0]?.name || "STANDARD"}>
                                            <SelectTrigger className="h-11 font-black uppercase text-xs rounded-xl border-slate-200">
                                                <SelectValue placeholder="No Live Strategy" />
                                            </SelectTrigger>
                                            <SelectContent className="font-black uppercase text-[10px]">
                                                {packages.map(pkg => (
                                                    <SelectItem key={pkg.id} value={pkg.name} className="hover:bg-blue-50 transition-colors">
                                                        <div className="flex items-center gap-2">
                                                            <Layers size={12} className="text-blue-500" />
                                                            {pkg.name}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                                {packages.length === 0 && <SelectItem value="STANDARD">Standard Pro Entry</SelectItem>}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest px-1">Forensic Note: Commission percentage is calculated against actual confirmed payments.</p>
                            </div>

                            {/* SECTION 4: PIPELINE LOGISTICS */}
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">4. Pipeline Logistics</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pipeline Stage</Label>
                                        <Select name="stage_id" defaultValue={initialStageId} required>
                                            <SelectTrigger className="h-11 font-black uppercase text-xs rounded-xl border-slate-200">
                                                <SelectValue placeholder="Select Global Stage" />
                                            </SelectTrigger>
                                            <SelectContent className="font-black uppercase text-[10px]">
                                                {stages.map((stage) => (
                                                    <SelectItem key={stage.id} value={stage.id} className="hover:bg-blue-50 transition-colors">{stage.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lead Source Category</Label>
                                        <Select name="lead_source_category" defaultValue="DIRECT">
                                            <SelectTrigger className="h-11 font-black uppercase text-xs rounded-xl border-slate-200">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="font-black uppercase text-[10px]">
                                                <SelectItem value="DIRECT">Direct Outreach</SelectItem>
                                                <SelectItem value="SOCIAL_ADS">Digital Strategy</SelectItem>
                                                <SelectItem value="BOOTCAMP">Training/Bootcamp</SelectItem>
                                                <SelectItem value="EVENT">Forensic Expo/Event</SelectItem>
                                                <SelectItem value="REFERRAL">Client Referral</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="px-8 py-6 bg-slate-50 border-t shrink-0 flex items-center justify-between">
                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="font-black text-[10px] uppercase text-slate-400 hover:text-red-500 transition-colors tracking-widest">
                            Abort Record Sync
                        </Button>
                        <SubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}