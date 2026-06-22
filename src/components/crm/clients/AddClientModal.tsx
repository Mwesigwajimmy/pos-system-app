'use client';

import { useState, useEffect } from 'react';
import { UserPlus, Loader2 } from 'lucide-react';
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
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';

export function AddClientModal({ businessId }: { businessId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [packages, setPackages] = useState<any[]>([]);
    const { toast } = useToast();
    const supabase = createClient();

    useEffect(() => {
        if (isOpen) {
            const fetchPkgs = async () => {
                const { data } = await supabase
                    .from('crm_subscription_packages')
                    .select('id, name')
                    .eq('business_id', businessId);
                setPackages(data || []);
            };
            fetchPkgs();
        }
    }, [isOpen, businessId, supabase]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsPending(true);
        const formData = new FormData(e.currentTarget);

        const { error } = await supabase.from('crm_contacts').insert({
            business_id: businessId,
            tenant_id: businessId,
            full_name: formData.get('full_name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            nature_of_business: formData.get('biz_nature'),
            package_id: formData.get('package_id') || null,
            status: 'customer',
            contract_status: 'ACTIVE',
            billing_day_of_month: parseInt(formData.get('billing_day') as string) || 1
        });

        setIsPending(true); // Maintenance of state during transition
        if (error) {
            toast({ 
                title: "Error", 
                description: error.message, 
                variant: "destructive" 
            });
            setIsPending(false);
        } else {
            toast({ 
                title: "Success", 
                description: "The customer has been successfully added." 
            });
            setIsPending(false);
            setIsOpen(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 font-semibold text-sm gap-2 h-10 px-5 shadow-sm">
                    <UserPlus size={16} /> Add New Customer
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] p-0 border border-slate-200 shadow-xl overflow-hidden bg-white outline-none">
                <form onSubmit={handleSubmit}>
                    {/* Professional Clean Header */}
                    <DialogHeader className="px-6 py-5 border-b border-slate-100">
                        <DialogTitle className="text-lg font-bold text-slate-900 tracking-tight">Customer Registration</DialogTitle>
                        <DialogDescription className="text-slate-500 text-xs">
                            Enter the details below to create a new customer record.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-6 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Full Name</Label>
                                <Input name="full_name" required className="h-10 text-sm border-slate-200" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Nature of Business</Label>
                                <Input name="biz_nature" placeholder="e.g. Retail" className="h-10 text-sm border-slate-200" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Email Address</Label>
                                <Input name="email" type="email" required className="h-10 text-sm border-slate-200" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Phone Number</Label>
                                <Input name="phone" className="h-10 text-sm border-slate-200" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-5">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-blue-600">Subscription Package</Label>
                                <Select name="package_id">
                                    <SelectTrigger className="h-10 text-sm border-slate-200">
                                        <SelectValue placeholder="Select Package" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {packages.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-blue-600">Billing Day</Label>
                                <Input name="billing_day" type="number" min="1" max="31" defaultValue="1" className="h-10 text-sm border-slate-200" />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => setIsOpen(false)} 
                            className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={isPending} 
                            className="bg-blue-600 hover:bg-blue-700 h-10 px-8 font-semibold text-sm shadow-sm"
                        >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Customer"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}