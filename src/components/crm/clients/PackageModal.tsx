'use client';

import { useState } from 'react';
import { Package, Plus, Coins, CalendarDays, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';

export function CreatePackageModal({ businessId }: { businessId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const { toast } = useToast();
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsPending(true);
        const formData = new FormData(e.currentTarget);

        const { error } = await supabase.from('crm_subscription_packages').insert({
            business_id: businessId,
            name: formData.get('name'),
            price: parseFloat(formData.get('price') as string),
            currency_code: formData.get('currency_code'),
            billing_interval: formData.get('billing_interval'),
            description: formData.get('description'),
        });

        setIsPending(false);
        if (error) toast({ title: "Catalog Error", description: error.message, variant: "destructive" });
        else {
            toast({ title: "Package Registered", description: "The subscription package is now live." });
            setIsOpen(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="font-black text-[10px] uppercase tracking-widest gap-2 h-10 border-slate-200">
                    <Plus size={14} /> Define Packages
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] p-0 border-none shadow-2xl overflow-hidden">
                <form onSubmit={handleSubmit} className="bg-white">
                    <DialogHeader className="px-8 py-6 bg-slate-900 text-white">
                        <DialogTitle className="text-xl font-bold">Subscription Architect</DialogTitle>
                        <DialogDescription className="text-slate-400 text-xs">Define a new recurring revenue package.</DialogDescription>
                    </DialogHeader>
                    <div className="p-8 space-y-5">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Package Name</Label>
                            <Input name="name" placeholder="e.g. Enterprise Monthly Maintenance" required className="h-11 font-bold" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Price</Label>
                                <Input name="price" type="number" step="0.01" required className="h-11 font-black" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Cycle</Label>
                                <Select name="billing_interval" defaultValue="MONTHLY">
                                    <SelectTrigger className="h-11 font-bold">
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
                            <Label className="text-[10px] font-black uppercase text-slate-400">Currency</Label>
                            <Select name="currency_code" defaultValue="UGX">
                                <SelectTrigger className="h-11 font-bold"><SelectValue /></SelectTrigger>
                                <SelectContent className="font-bold">
                                    <SelectItem value="UGX">UGX</SelectItem>
                                    <SelectItem value="USD">USD</SelectItem>
                                    <SelectItem value="KES">KES</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="px-8 py-6 bg-slate-50 border-t">
                        <Button type="submit" disabled={isPending} className="w-full bg-blue-600 hover:bg-blue-700 h-11 font-black text-[10px] uppercase tracking-widest">
                            {isPending ? <Loader2 className="animate-spin" /> : "Deploy Package"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}