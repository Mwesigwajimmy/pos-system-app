'use client';

import { useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { 
    PlusCircle, 
    Target,
    Layers,
    Loader2
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

import { createDeal, FormState } from '@/lib/crm/actions/leads';

interface Employee {
    id: string;
    full_name: string;
}

interface CatalogPackage {
    id: string;
    name: string;
}

interface CreateDealModalProps {
    stages: Stage[];
    employees: Employee[]; 
    packages: CatalogPackage[];
    currentBusinessId: string;
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button 
            type="submit" 
            disabled={pending} 
            className="bg-blue-600 hover:bg-blue-700 text-sm font-semibold px-8 h-10 shadow-sm"
        >
            {pending ? (
                <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                </span>
            ) : (
                'Create Deal'
            )}
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
                title: "Success",
                description: "Deal record created successfully.",
            });
            setIsOpen(false);
            router.refresh();
        } else if (formState.message && !formState.errors) {
            toast({
                title: "Error",
                description: formState.message,
                variant: "destructive",
            });
        }
    }, [formState, router, toast]);

    const initialStageId = stages.length > 0 ? stages[0].id : '';

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-slate-900 hover:bg-slate-800 text-sm font-semibold gap-2 h-10 px-5 shadow-sm">
                    <PlusCircle className="h-4 w-4" />
                    New Deal
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden border border-slate-200 rounded-xl shadow-xl bg-white outline-none">
                <form action={formAction} className="flex flex-col h-full">
                    {/* PROFESSIONAL HEADER */}
                    <DialogHeader className="px-8 py-6 border-b border-slate-100 bg-white shrink-0">
                        <div className="flex items-center gap-4">
                             <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
                                <Target className="text-blue-600" size={22} />
                             </div>
                             <div className="space-y-0.5">
                                <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">New Business Deal</DialogTitle>
                                <DialogDescription className="text-slate-500 text-xs font-medium">
                                    Record details for a new business lead or customer opportunity.
                                </DialogDescription>
                             </div>
                        </div>
                    </DialogHeader>

                    <input type="hidden" name="business_id" value={currentBusinessId} />

                    <ScrollArea className="max-h-[70vh]">
                        <div className="p-8 space-y-8">
                            
                            {/* SECTION 1: CORE INFORMATION */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider">1. Core Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="title" className="text-xs font-semibold text-slate-700">Opportunity Title</Label>
                                        <Input id="title" name="title" placeholder="e.g. Acme Corp Enterprise Setup" required className="h-10 text-sm rounded-md border-slate-200 focus:ring-1 focus:ring-blue-500" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="nature_of_business" className="text-xs font-semibold text-slate-700">Nature of Business</Label>
                                        <Input id="nature_of_business" name="nature_of_business" placeholder="e.g. Retail, Logistics" className="h-10 text-sm rounded-md border-slate-200 focus:ring-1 focus:ring-blue-500" />
                                    </div>
                                    {/* NEW CUSTOMER FIELDS */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="customer_name" className="text-xs font-semibold text-slate-700">Customer Name</Label>
                                        <Input id="customer_name" name="customer_name" placeholder="Contact person or company name" required className="h-10 text-sm rounded-md border-slate-200 focus:ring-1 focus:ring-blue-500" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="phone_number" className="text-xs font-semibold text-slate-700">Phone Number</Label>
                                        <Input id="phone_number" name="phone_number" placeholder="Contact primary phone" className="h-10 text-sm rounded-md border-slate-200 focus:ring-1 focus:ring-blue-500" />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: AGENT ASSIGNMENT */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider">2. Agent Assignment</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-700">Marketing Agent</Label>
                                        <Select name="marketing_agent_id" required>
                                            <SelectTrigger className="h-10 text-sm rounded-md border-slate-200">
                                                <SelectValue placeholder="Select Agent" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {employees.map(emp => (
                                                    <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="marketing_team_name" className="text-xs font-semibold text-slate-700">Team / Branch</Label>
                                        <Input id="marketing_team_name" name="marketing_team_name" placeholder="e.g. Sales Team North" className="h-10 text-sm rounded-md border-slate-200" />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: FINANCIAL DETAILS */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider">3. Financial Details</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="value" className="text-xs font-semibold text-slate-700">Deal Value</Label>
                                        <Input id="value" name="value" type="number" step="0.01" defaultValue="0.00" className="h-10 text-sm font-bold text-slate-900 rounded-md border-slate-200" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-700">Currency</Label>
                                        <Select name="currency_code" defaultValue="UGX">
                                            <SelectTrigger className="h-10 text-sm font-medium border-slate-200">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="UGX">UGX</SelectItem>
                                                <SelectItem value="KES">KES</SelectItem>
                                                <SelectItem value="USD">USD</SelectItem>
                                                <SelectItem value="TZS">TZS</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="agreed_commission_percentage" className="text-xs font-semibold text-slate-700">Commission %</Label>
                                        <Input id="agreed_commission_percentage" name="agreed_commission_percentage" type="number" step="0.1" defaultValue="5.0" className="h-10 text-sm font-medium border-slate-200 rounded-md" />
                                    </div>
                                    
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-700">Target Package</Label>
                                        <Select name="target_package_name" defaultValue={packages[0]?.name || "STANDARD"}>
                                            <SelectTrigger className="h-10 text-sm rounded-md border-slate-200">
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {packages.map(pkg => (
                                                    <SelectItem key={pkg.id} value={pkg.name}>
                                                        <div className="flex items-center gap-2">
                                                            <Layers size={14} className="text-blue-500" />
                                                            {pkg.name}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                                {packages.length === 0 && <SelectItem value="STANDARD">Standard Pro</SelectItem>}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-400 font-medium italic">Commission is calculated based on confirmed payments.</p>
                            </div>

                            {/* SECTION 4: PIPELINE & SOURCE */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider">4. Pipeline & Source</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-slate-700">Pipeline Stage</Label>
                                        <Select name="stage_id" defaultValue={initialStageId} required>
                                            <SelectTrigger className="h-10 text-sm rounded-md border-slate-200">
                                                <SelectValue placeholder="Select Stage" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {stages.map((stage) => (
                                                    <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-slate-700">Lead Source</Label>
                                        <Select name="lead_source_category" defaultValue="DIRECT">
                                            <SelectTrigger className="h-10 text-sm rounded-md border-slate-200">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="DIRECT">Direct Outreach</SelectItem>
                                                <SelectItem value="SOCIAL_ADS">Digital Marketing</SelectItem>
                                                <SelectItem value="BOOTCAMP">Training/Event</SelectItem>
                                                <SelectItem value="REFERRAL">Client Referral</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="px-8 py-5 bg-slate-50 border-t border-slate-100 shrink-0 flex items-center justify-between">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => setIsOpen(false)} 
                            className="text-sm font-semibold text-slate-500 hover:text-slate-900"
                        >
                            Cancel
                        </Button>
                        <SubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}