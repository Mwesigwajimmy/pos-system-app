'use client';

import { useState, useEffect } from 'react';
import { UserPlus, ShieldCheck, Mail, Phone, Briefcase, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
                const { data } = await supabase.from('crm_subscription_packages').select('id, name').eq('business_id', businessId);
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

        setIsPending(false);
        if (error) toast({ title: "Onboarding Failed", description: error.message, variant: "destructive" });
        else {
            toast({ title: "Client Onboarded", description: "Identity verified and added to ledger." });
            setIsOpen(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 font-black text-[10px] uppercase tracking-widest gap-2 h-10 px-6">
                    <UserPlus size={16} /> Onboard Client
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] p-0 border-none shadow-2xl overflow-hidden bg-white">
                <form onSubmit={handleSubmit}>
                    <DialogHeader className="px-8 py-6 bg-slate-900 text-white">
                        <DialogTitle className="text-xl font-bold">Manual Client Onboarding</DialogTitle>
                        <DialogDescription className="text-slate-400 text-xs font-medium">Establish a new forensic client identity in the system.</DialogDescription>
                    </DialogHeader>
                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Full Name</Label>
                                <Input name="full_name" required className="h-10 font-bold" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Business Nature</Label>
                                <Input name="biz_nature" placeholder="e.g. Retail" className="h-10 font-semibold" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Email Address</Label>
                                <Input name="email" type="email" required className="h-10 font-medium" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Phone</Label>
                                <Input name="phone" className="h-10 font-medium" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 border-t pt-4">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-blue-600">Assign Package</Label>
                                <Select name="package_id">
                                    <SelectTrigger className="h-10 font-bold"><SelectValue placeholder="No Package" /></SelectTrigger>
                                    <SelectContent className="font-bold">
                                        {packages.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-blue-600">Billing Day</Label>
                                <Input name="billing_day" type="number" min="1" max="31" defaultValue="1" className="h-10 font-black" />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="px-8 py-6 bg-slate-50 border-t flex items-center justify-between">
                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="text-[10px] font-black uppercase text-slate-400">Abort</Button>
                        <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 h-11 px-10 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100">
                            {isPending ? <Loader2 className="animate-spin" /> : "Commit Identity"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}