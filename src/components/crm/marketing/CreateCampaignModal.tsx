'use client';

import { useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { 
    PlusCircle, 
    Megaphone, 
    Globe, 
    DollarSign, 
    Target, 
    Calendar, 
    Zap,
    Navigation
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
        <Button type="submit" disabled={pending} className="bg-blue-600 hover:bg-blue-700 font-black text-[10px] uppercase tracking-widest px-8 shadow-lg shadow-blue-100">
            {pending ? 'Deploying Strategy...' : 'Initialize Campaign'}
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
                title: "Campaign Synchronized",
                description: formState.message,
            });
            setIsOpen(false);
            router.refresh();
        } else if (formState.message && !formState.errors) {
            toast({
                title: "Execution Conflict",
                description: formState.message,
                variant: "destructive",
            });
        }
    }, [formState, router, toast]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-slate-900 hover:bg-slate-800 font-black text-[10px] uppercase tracking-widest gap-2 h-10 px-6">
                    <PlusCircle className="h-4 w-4" />
                    New Campaign
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none rounded-xl shadow-2xl">
                <form action={formAction} className="flex flex-col h-full bg-white">
                    {/* ENTERPRISE HEADER */}
                    <DialogHeader className="px-8 py-6 bg-slate-900 text-white shrink-0">
                        <div className="flex items-center gap-3">
                             <div className="h-10 w-10 bg-white/10 rounded-lg flex items-center justify-center">
                                <Megaphone className="text-blue-400" size={24} />
                             </div>
                             <div>
                                <DialogTitle className="text-xl font-bold tracking-tight">Marketing Orchestrator</DialogTitle>
                                <DialogDescription className="text-slate-400 text-xs font-medium">
                                    Define multi-channel strategies and financial targets.
                                </DialogDescription>
                             </div>
                        </div>
                    </DialogHeader>

                    {/* HIDDEN LOGISTICS */}
                    <input type="hidden" name="created_by" value={employeeId} />
                    <input type="hidden" name="business_id" value={currentBusinessId} />

                    <ScrollArea className="max-h-[70vh]">
                        <div className="p-8 space-y-8">
                            
                            {/* SECTION 1: IDENTITY */}
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">1. Campaign Identity</Label>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="name" className="text-xs font-bold text-slate-500">Campaign Name</Label>
                                        <Input id="name" name="name" placeholder="e.g. Q4 Regional Trade Expo Outreach" required className="h-10 font-semibold" />
                                        {formState.errors?.name && (
                                            <p className="text-xs text-destructive font-bold">{formState.errors.name[0]}</p>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold text-slate-500">Campaign Category</Label>
                                            <Select name="campaign_category" defaultValue="EMAIL" required>
                                                <SelectTrigger className="h-10 font-semibold">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="font-semibold">
                                                    <SelectItem value="EMAIL">Email Marketing</SelectItem>
                                                    <SelectItem value="SMS">SMS Broadcasting</SelectItem>
                                                    <SelectItem value="ADS">Digital Ads (Social/Google)</SelectItem>
                                                    <SelectItem value="BOOTCAMP">Technical Bootcamp</SelectItem>
                                                    <SelectItem value="EVENT">Physical Event/Expo</SelectItem>
                                                    <SelectItem value="OUTREACH">Field Direct Outreach</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="target_location" className="text-xs font-bold text-slate-500">Target Location / Region</Label>
                                            <Input id="target_location" name="target_location" placeholder="e.g. Central Uganda, East Africa" className="h-10 font-semibold" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: FINANCIAL FORECASTING */}
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">2. Financial Forecasting</Label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="budget_spent" className="text-xs font-bold text-slate-500">Budget Limit</Label>
                                        <Input id="budget_spent" name="budget_spent" type="number" step="0.01" placeholder="0.00" className="h-10 font-black text-slate-900" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="projected_revenue" className="text-xs font-bold text-slate-500">Projected Revenue</Label>
                                        <Input id="projected_revenue" name="projected_revenue" type="number" step="0.01" placeholder="0.00" className="h-10 font-black text-emerald-600" />
                                    </div>
                                    <div className="space-y-1.5 col-span-2 md:col-span-1">
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
                                </div>
                            </div>

                            {/* SECTION 3: SCHEDULING */}
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">3. Launch Logistics</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="scheduled_at" className="text-xs font-bold text-slate-500">Launch Date</Label>
                                        <Input id="scheduled_at" name="scheduled_at" type="datetime-local" className="h-10 font-semibold" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-500">Initial Status</Label>
                                        <Select name="status" defaultValue="DRAFT">
                                            <SelectTrigger className="h-10 font-bold">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="font-bold">
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

                    <DialogFooter className="px-8 py-6 bg-slate-50 border-t shrink-0 flex items-center justify-between">
                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="font-bold text-[10px] uppercase text-slate-400 hover:text-red-500">
                            Cancel
                        </Button>
                        <SubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}