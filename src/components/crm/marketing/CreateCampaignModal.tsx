'use client';

import { useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { 
    PlusCircle, 
    Megaphone, 
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

// Import the real server action and its state type
import { createCampaign, FormState } from '@/lib/crm/actions/marketing';

interface CreateCampaignModalProps {
    employeeId: string;
    currentBusinessId: string;
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button 
            type="submit" 
            disabled={pending} 
            className="bg-blue-600 hover:bg-blue-700 text-sm font-semibold px-8 shadow-sm"
        >
            {pending ? (
                <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                </span>
            ) : (
                'Create Campaign'
            )}
        </Button>
    );
}

export function CreateCampaignModal({ employeeId, currentBusinessId }: CreateCampaignModalProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);

    const initialState: FormState = { success: false, message: '', errors: null };
    const [formState, formAction] = useFormState(createCampaign, initialState);

    useEffect(() => {
        if (formState.success) {
            toast({
                title: "Success",
                description: "The marketing campaign has been created successfully.",
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

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-slate-900 hover:bg-slate-800 text-sm font-semibold gap-2 h-10 px-5 shadow-sm">
                    <PlusCircle className="h-4 w-4" />
                    New Campaign
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border border-slate-200 rounded-xl shadow-xl bg-white outline-none">
                <form action={formAction} className="flex flex-col h-full">
                    {/* PROFESSIONAL CLEAN HEADER */}
                    <DialogHeader className="px-8 py-6 border-b border-slate-100 shrink-0">
                        <div className="flex items-center gap-4">
                             <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
                                <Megaphone className="text-blue-600" size={22} />
                             </div>
                             <div className="space-y-0.5">
                                <DialogTitle className="text-lg font-bold text-slate-900 tracking-tight">Campaign Setup</DialogTitle>
                                <DialogDescription className="text-slate-500 text-xs font-medium">
                                    Configure your outreach channels and financial parameters.
                                </DialogDescription>
                             </div>
                        </div>
                    </DialogHeader>

                    {/* HIDDEN LOGISTICS */}
                    <input type="hidden" name="created_by" value={employeeId} />
                    <input type="hidden" name="business_id" value={currentBusinessId} />

                    <ScrollArea className="max-h-[65vh]">
                        <div className="p-8 space-y-8">
                            
                            {/* SECTION 1: BASIC DETAILS */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider">1. Basic Details</h3>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="name" className="text-xs font-semibold text-slate-700">Campaign Name</Label>
                                        <Input id="name" name="name" placeholder="e.g. Q4 Regional Outreach" required className="h-10 text-sm border-slate-200 focus:ring-1 focus:ring-blue-500" />
                                        {formState.errors?.name && (
                                            <p className="text-[11px] text-red-600 font-medium">{formState.errors.name[0]}</p>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-700">Category</Label>
                                            <Select name="campaign_category" defaultValue="EMAIL" required>
                                                <SelectTrigger className="h-10 text-sm border-slate-200">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="EMAIL">Email Marketing</SelectItem>
                                                    <SelectItem value="SMS">SMS Broadcasting</SelectItem>
                                                    <SelectItem value="ADS">Digital Ads</SelectItem>
                                                    <SelectItem value="BOOTCAMP">Bootcamp</SelectItem>
                                                    <SelectItem value="EVENT">Physical Event</SelectItem>
                                                    <SelectItem value="OUTREACH">Field Outreach</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="target_location" className="text-xs font-semibold text-slate-700">Region</Label>
                                            <Input id="target_location" name="target_location" placeholder="e.g. Central Region" className="h-10 text-sm border-slate-200" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: FINANCIALS */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider">2. Budget & Revenue</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="budget_spent" className="text-xs font-semibold text-slate-700">Budget Limit</Label>
                                        <Input id="budget_spent" name="budget_spent" type="number" step="0.01" placeholder="0.00" className="h-10 text-sm font-medium border-slate-200" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="projected_revenue" className="text-xs font-semibold text-slate-700">Projected Revenue</Label>
                                        <Input id="projected_revenue" name="projected_revenue" type="number" step="0.01" placeholder="0.00" className="h-10 text-sm font-bold text-emerald-600 border-slate-200" />
                                    </div>
                                    <div className="space-y-1.5 col-span-2 md:col-span-1">
                                        <Label className="text-xs font-semibold text-slate-700">Currency</Label>
                                        <Select name="currency_code" defaultValue="UGX">
                                            <SelectTrigger className="h-10 text-sm font-medium border-slate-200">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="UGX">UGX (Uganda)</SelectItem>
                                                <SelectItem value="KES">KES (Kenya)</SelectItem>
                                                <SelectItem value="USD">USD (Global)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: SCHEDULING */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider">3. Scheduling</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="scheduled_at" className="text-xs font-semibold text-slate-700">Launch Date</Label>
                                        <Input id="scheduled_at" name="scheduled_at" type="datetime-local" className="h-10 text-sm border-slate-200" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-700">Initial Status</Label>
                                        <Select name="status" defaultValue="DRAFT">
                                            <SelectTrigger className="h-10 text-sm font-semibold border-slate-200">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="DRAFT">Draft Mode</SelectItem>
                                                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                                                <SelectItem value="ACTIVE">Live Now</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </ScrollArea>

                    <DialogFooter className="px-8 py-5 bg-slate-50 border-t shrink-0 flex items-center justify-between">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => setIsOpen(false)} 
                            className="text-xs font-bold text-slate-500 hover:text-slate-700"
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