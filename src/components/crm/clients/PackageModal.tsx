'use client';

import { useState, useEffect } from 'react';
import { 
    Package, 
    Plus, 
    Coins, 
    CalendarDays, 
    Loader2, 
    ShieldCheck, 
    Target,
    MapPin,
    Layers,
    ChevronRight,
    Sparkles
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
     * 🛡️ FORENSIC INVENTORY SYNC:
     * Fetching branches exactly like the product management module.
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
            business_id: businessId, // Company ID (Tenant)
            tenant_id: businessId,   // Explicit Redundancy
            name: formData.get('name'),
            description: formData.get('description'),
            price: parseFloat(formData.get('price') as string),
            currency_code: formData.get('currency_code'),
            billing_interval: formData.get('billing_interval'),
            // Optional: tag to specific branch if desired
            metadata: { 
                target_branch_id: formData.get('location_id'),
                created_via: 'SOVEREIGN_CRM_ARCHITECT'
            }
        });

        setIsPending(false);
        if (error) {
            toast({ title: "Forensic Sync Failed", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Package Registered", description: "The strategy has been committed to the catalog." });
            setIsOpen(false);
            window.location.reload(); // Hard refresh to update catalog view
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="h-10 px-6 font-black text-[10px] uppercase tracking-widest gap-2 border-slate-200 hover:bg-blue-600 hover:text-white transition-all rounded-xl shadow-sm">
                    <Plus size={16} /> Define Packages
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] p-0 border-none shadow-2xl overflow-hidden bg-white rounded-2xl">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    {/* ENTERPRISE HEADER */}
                    <DialogHeader className="px-8 py-7 bg-slate-900 text-white shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                                <Layers className="text-blue-400" size={28} />
                            </div>
                            <div className="space-y-0.5">
                                <DialogTitle className="text-xl font-black tracking-tight uppercase">Subscription Architect</DialogTitle>
                                <DialogDescription className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Construct forensic revenue strategies.</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <ScrollArea className="max-h-[60vh]">
                        <div className="p-8 space-y-6">
                            {/* SECTION 1: IDENTITY */}
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase text-blue-600 tracking-widest">1. Strategy Identity</Label>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 ml-1">Package Name</Label>
                                    <Input name="name" placeholder="e.g. Enterprise Monthly Maintenance" required className="h-11 font-bold rounded-xl border-slate-200" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 ml-1">Technical Description</Label>
                                    <Input name="description" placeholder="Describe the scope of service..." className="h-11 font-semibold rounded-xl border-slate-200" />
                                </div>
                            </div>

                            {/* SECTION 2: FINANCIALS */}
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase text-blue-600 tracking-widest">2. Financial Payout</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-500 ml-1">Standard Price</Label>
                                        <Input name="price" type="number" step="0.01" required placeholder="0.00" className="h-11 font-black text-emerald-600 rounded-xl border-slate-200" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-500 ml-1">Billing Cycle</Label>
                                        <Select name="billing_interval" defaultValue="MONTHLY">
                                            <SelectTrigger className="h-11 font-bold rounded-xl border-slate-200">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="font-bold">
                                                <SelectItem value="MONTHLY">Monthly</SelectItem>
                                                <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                                                <SelectItem value="YEARLY">Yearly</SelectItem>
                                                <SelectItem value="ONE_TIME">One Time</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 ml-1">Currency Lock</Label>
                                    <Select name="currency_code" defaultValue="UGX">
                                        <SelectTrigger className="h-11 font-bold rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
                                        <SelectContent className="font-bold">
                                            <SelectItem value="UGX">UGX (Uganda)</SelectItem>
                                            <SelectItem value="USD">USD (Global)</SelectItem>
                                            <SelectItem value="KES">KES (Kenya)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* SECTION 3: DEEP SYNC */}
                            <div className="space-y-4 pt-4 border-t">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">3. Branch Localization (Optional)</Label>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 ml-1">Preferred Branch Node</Label>
                                    <Select name="location_id">
                                        <SelectTrigger className="h-11 font-semibold rounded-xl border-slate-200">
                                            <SelectValue placeholder="Global (Company Level)" />
                                        </SelectTrigger>
                                        <SelectContent className="font-semibold">
                                            {locations.map(loc => (
                                                <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="px-8 py-6 bg-slate-50 border-t shrink-0 flex items-center justify-between">
                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="font-black text-[10px] uppercase text-slate-400 hover:text-red-500 transition-colors">Abort</Button>
                        <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 h-12 px-10 font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-xl shadow-blue-100 transition-all active:scale-95">
                            {isPending ? <Loader2 className="animate-spin" /> : "Deploy Strategy"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}