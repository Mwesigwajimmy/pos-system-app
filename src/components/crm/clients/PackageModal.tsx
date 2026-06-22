'use client';

import { useState, useEffect } from 'react';
import { 
    Plus, 
    Coins, 
    Loader2, 
    Layers,
    Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogFooter, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';

export function CreatePackageModal({ businessId }: { businessId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [locations, setLocations] = useState<any[]>([]);
    const { toast } = useToast();
    const supabase = createClient();

    /**
     * Fetches available business locations for branch-level assignment.
     */
    useEffect(() => {
        if (isOpen) {
            const fetchBranches = async () => {
                const { data } = await supabase
                    .from('locations')
                    .select('id, name')
                    .eq('tenant_id', businessId)
                    .eq('status', 'active');
                setLocations(data || []);
            };
            fetchBranches();
        }
    }, [isOpen, businessId, supabase]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsPending(true);
        const formData = new FormData(e.currentTarget);

        const { error } = await supabase.from('crm_subscription_packages').insert({
            business_id: businessId,
            tenant_id: businessId,
            name: formData.get('name'),
            description: formData.get('description'),
            price: parseFloat(formData.get('price') as string),
            currency_code: formData.get('currency_code'),
            billing_interval: formData.get('billing_interval'),
            metadata: { 
                target_branch_id: formData.get('location_id'),
                created_via: 'CRM_ADMIN_PORTAL'
            }
        });

        setIsPending(false);
        if (error) {
            toast({ 
                title: "Error", 
                description: "Failed to create package. Please try again.", 
                variant: "destructive" 
            });
        } else {
            toast({ 
                title: "Package Created", 
                description: "The service package has been successfully added to the catalog." 
            });
            setIsOpen(false);
            window.location.reload();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="h-10 px-5 font-semibold text-sm gap-2 border-slate-200 hover:bg-slate-50 transition-colors shadow-sm">
                    <Plus size={16} /> Add Package
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] p-0 border border-slate-200 shadow-xl overflow-hidden bg-white rounded-xl outline-none">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    
                    {/* CLEAN PROFESSIONAL HEADER */}
                    <DialogHeader className="px-6 py-5 border-b border-slate-100 bg-white shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
                                <Layers className="text-blue-600" size={20} />
                            </div>
                            <div className="space-y-0.5">
                                <DialogTitle className="text-lg font-bold text-slate-900 tracking-tight">Create Service Package</DialogTitle>
                                <DialogDescription className="text-slate-500 text-xs font-medium">Define pricing and subscription details.</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <ScrollArea className="max-h-[65vh]">
                        <div className="p-6 space-y-8">
                            
                            {/* SECTION 1: PACKAGE DETAILS */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-blue-600">
                                    <Info size={14} />
                                    <span className="text-xs font-bold uppercase tracking-wider">1. Package Information</span>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700 ml-0.5">Package Name</Label>
                                    <Input name="name" placeholder="e.g. Monthly Maintenance" required className="h-10 text-sm font-medium border-slate-200" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700 ml-0.5">Description</Label>
                                    <Input name="description" placeholder="Brief summary of included services..." className="h-10 text-sm border-slate-200" />
                                </div>
                            </div>

                            {/* SECTION 2: PRICING & BILLING */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-blue-600">
                                    <Coins size={14} />
                                    <span className="text-xs font-bold uppercase tracking-wider">2. Pricing & Billing</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-700 ml-0.5">Price</Label>
                                        <Input name="price" type="number" step="0.01" required placeholder="0.00" className="h-10 text-sm font-bold text-slate-900 border-slate-200" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-700 ml-0.5">Billing Cycle</Label>
                                        <Select name="billing_interval" defaultValue="MONTHLY">
                                            <SelectTrigger className="h-10 text-sm font-medium border-slate-200">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="MONTHLY">Monthly</SelectItem>
                                                <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                                                <SelectItem value="YEARLY">Yearly</SelectItem>
                                                <SelectItem value="ONE_TIME">One Time</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700 ml-0.5">Currency</Label>
                                    <Select name="currency_code" defaultValue="UGX">
                                        <SelectTrigger className="h-10 text-sm font-medium border-slate-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="UGX">UGX (Uganda)</SelectItem>
                                            <SelectItem value="USD">USD (Global)</SelectItem>
                                            <SelectItem value="KES">KES (Kenya)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* SECTION 3: ASSIGNMENT */}
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">3. Branch Assignment (Optional)</Label>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700 ml-0.5">Assigned Branch</Label>
                                    <Select name="location_id">
                                        <SelectTrigger className="h-10 text-sm border-slate-200">
                                            <SelectValue placeholder="All Branches (Global)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {locations.map(loc => (
                                                <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100 shrink-0 flex items-center justify-between">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => setIsOpen(false)} 
                            className="text-sm font-semibold text-slate-500 hover:text-slate-900"
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={isPending} 
                            className="bg-blue-600 hover:bg-blue-700 h-10 px-8 font-semibold text-sm shadow-sm"
                        >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Package"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}