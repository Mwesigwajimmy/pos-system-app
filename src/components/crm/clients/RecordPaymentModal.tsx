'use client';

import { useState } from 'react';
import { Coins, CreditCard, ShieldCheck, Receipt, NotebookPen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
import { useToast } from '@/components/ui/use-toast';
import { recordClientPayment } from '@/lib/crm/actions/payments';

interface RecordPaymentModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    client: {
        id: string;
        name: string;
        current_debt: number;
        currency: string;
        business_id: string;
    };
}

export function RecordPaymentModal({ isOpen, onOpenChange, client }: RecordPaymentModalProps) {
    const { toast } = useToast();
    const [isPending, setIsPending] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsPending(true);
        const formData = new FormData(e.currentTarget);
        
        const result = await recordClientPayment(formData);
        
        setIsPending(false);
        if (result.success) {
            toast({ title: "Forensic Sync Success", description: result.message });
            onOpenChange(false);
        } else {
            toast({ title: "Reconciliation Failed", description: result.message, variant: "destructive" });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none rounded-xl shadow-2xl">
                <form onSubmit={handleSubmit} className="bg-white">
                    <DialogHeader className="px-8 py-6 bg-slate-900 text-white">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                                <Coins className="text-emerald-400" size={24} />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold">Record Client Payment</DialogTitle>
                                <DialogDescription className="text-slate-400 text-xs">Reconcile debt for {client.name}</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <input type="hidden" name="contact_id" value={client.id} />
                    <input type="hidden" name="business_id" value={client.business_id} />
                    <input type="hidden" name="currency_code" value={client.currency} />

                    <div className="p-8 space-y-6">
                        {/* DEBT ALERT BOX */}
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Outstanding Balance</span>
                            <span className="text-lg font-black text-slate-900">{client.current_debt.toLocaleString()} {client.currency}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-500">Payment Amount</Label>
                                <Input name="amount" type="number" step="0.01" required placeholder="0.00" className="h-11 font-black text-emerald-600 border-slate-200" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-500">Method</Label>
                                <Select name="payment_method" required defaultValue="CASH">
                                    <SelectTrigger className="h-11 font-bold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="font-bold">
                                        <SelectItem value="CASH">Cash Payment</SelectItem>
                                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                                        <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-500">Reference / Receipt No.</Label>
                            <div className="relative">
                                <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                <Input name="reference_no" placeholder="e.g. TRX-99821" className="h-11 pl-10 font-semibold border-slate-200" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-500">Forensic Notes</Label>
                            <div className="relative">
                                <NotebookPen className="absolute left-3 top-3 text-slate-300" size={16} />
                                <Input name="notes" placeholder="Reason for payment or partial reconciliation..." className="h-20 pl-10 pt-2 border-slate-200 align-top" />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="px-8 py-6 bg-slate-50 border-t flex items-center justify-between">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-[10px] font-black uppercase text-slate-400">Cancel</Button>
                        <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest px-8 h-11 shadow-lg shadow-emerald-100">
                            {isPending ? "Syncing..." : "Commit Payment"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}