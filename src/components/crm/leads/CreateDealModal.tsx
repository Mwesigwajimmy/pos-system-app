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
    Percent
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

interface CreateDealModalProps {
    stages: Stage[];
    employees: Employee[]; // Added to allow selecting the Marketing Agent
    currentBusinessId: string;
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="bg-blue-600 hover:bg-blue-700 font-black text-[10px] uppercase tracking-widest px-8 shadow-lg shadow-blue-100">
            {pending ? 'Synchronizing Intelligence...' : 'Create Forensic Record'}
        </Button>
    );
}

export function CreateDealModal({ stages, employees, currentBusinessId }: CreateDealModalProps) {
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
                <Button className="bg-slate-900 hover:bg-slate-800 font-black text-[10px] uppercase tracking-widest gap-2 h-10 px-6">
                    <PlusCircle className="h-4 w-4" />
                    Record Field Data
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden border-none rounded-xl shadow-2xl">
                <form action={formAction} className="flex flex-col h-full bg-white">
                    <DialogHeader className="px-8 py-6 bg-slate-900 text-white shrink-0">
                        <div className="flex items-center gap-3">
                             <div className="h-10 w-10 bg-white/10 rounded-lg flex items-center justify-center">
                                <Target className="text-blue-400" size={24} />
                             </div>
                             <div>
                                <DialogTitle className="text-xl font-bold tracking-tight">Lead Intelligence Entry</DialogTitle>
                                <DialogDescription className="text-slate-400 text-xs font-medium">
                                    Record forensic data for field leads and commission opportunities.
                                </DialogDescription>
                             </div>
                        </div>
                    </DialogHeader>

                    {/* HIDDEN LOGISTICS */}
                    <input type="hidden" name="business_id" value={currentBusinessId} />

                    <ScrollArea className="max-h-[75vh]">
                        <div className="p-8 space-y-8">
                            
                            {/* SECTION 1: PRIMARY IDENTITIES */}
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">1. Core Intelligence</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="title" className="text-xs font-bold text-slate-500">Opportunity Title</Label>
                                        <Input id="title" name="title" placeholder="e.g. Acme Corp Enterprise Setup" required className="h-10 font-semibold" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="nature_of_business" className="text-xs font-bold text-slate-500">Nature of Business</Label>
                                        <Input id="nature_of_business" name="nature_of_business" placeholder="e.g. Pharma, Retail, SACCO" className="h-10 font-semibold" />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: AGENT & SOURCE TRACKING */}
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">2. Agent Performance tracking</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-500">Marketing Agent</Label>
                                        <Select name="marketing_agent_id" required>
                                            <SelectTrigger className="h-10 font-semibold">
                                                <SelectValue placeholder="Select Agent" />
                                            </SelectTrigger>
                                            <SelectContent className="font-semibold">
                                                {employees.map(emp => (
                                                    <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="marketing_team_name" className="text-xs font-bold text-slate-500">Marketing Team / Branch</Label>
                                        <Input id="marketing_team_name" name="marketing_team_name" placeholder="e.g. Northern Sales Team" className="h-10 font-semibold" />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: FINANCIALS, PACKAGE & COMMISSION */}
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">3. Financials & Commission Intel</Label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="value" className="text-xs font-bold text-slate-500">Deal Value</Label>
                                        <Input id="value" name="value" type="number" step="0.01" placeholder="0.00" className="h-10 font-black text-emerald-700" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-500">Currency</Label>
                                        <Select name="currency_code" defaultValue="UGX">
                                            <SelectTrigger className="h-10 font-bold">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="font-bold">
                                                <SelectItem value="UGX">UGX (Uganda)</SelectItem>
                                                <SelectItem value="KES">KES (Kenya)</SelectItem>
                                                <SelectItem value="USD">USD (Global)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="agreed_commission_percentage" className="text-xs font-bold text-blue-700">Commission %</Label>
                                        <Input id="agreed_commission_percentage" name="agreed_commission_percentage" type="number" step="0.1" placeholder="5.0" className="h-10 font-black border-blue-100 bg-blue-50/50 text-blue-900" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-500">Package</Label>
                                        <Select name="target_package_name" defaultValue="STANDARD">
                                            <SelectTrigger className="h-10 font-bold">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="font-bold">
                                                <SelectItem value="BASIC">Basic Entry</SelectItem>
                                                <SelectItem value="STANDARD">Standard Pro</SelectItem>
                                                <SelectItem value="PREMIUM">Enterprise Gold</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <p className="text-[9px] font-bold text-slate-400 italic px-1">Forensic Note: Commission percentage is calculated against actual confirmed payments.</p>
                            </div>

                            {/* SECTION 4: LOGISTICS & STATUS */}
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">4. Pipeline Logistics</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-500">Pipeline Stage</Label>
                                        <Select name="stage_id" defaultValue={initialStageId} required>
                                            <SelectTrigger className="h-10 font-semibold">
                                                <SelectValue placeholder="Select Stage" />
                                            </SelectTrigger>
                                            <SelectContent className="font-semibold">
                                                {stages.map((stage) => (
                                                    <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-500">Lead Source Category</Label>
                                        <Select name="lead_source_category" defaultValue="DIRECT">
                                            <SelectTrigger className="h-10 font-semibold">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="font-semibold">
                                                <SelectItem value="DIRECT">Direct Outreach</SelectItem>
                                                <SelectItem value="SOCIAL_ADS">Digital Ads</SelectItem>
                                                <SelectItem value="BOOTCAMP">Training/Bootcamp</SelectItem>
                                                <SelectItem value="EVENT">Trade Expo/Event</SelectItem>
                                                <SelectItem value="REFERRAL">Client Referral</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="px-8 py-6 bg-slate-50 border-t shrink-0 flex items-center justify-between">
                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="font-bold text-[10px] uppercase text-slate-400 hover:text-red-500">
                            Abort Sync
                        </Button>
                        <SubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}