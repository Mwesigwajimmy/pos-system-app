'use client';

import { useState } from 'react';
import { Coins, CreditCard, Receipt, NotebookPen, Loader2 } from 'lucide-react';
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
            toast({ 
                title: "Success", 
                description: "The payment has been successfully recorded." 
            });
            onOpenChange(false);
        } else {
            toast({ 
                title: "Error", 
                description: result.message || "Failed to record payment.", 
                variant: "destructive" 
            });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] p-0 border border-slate-200 shadow-xl overflow-hidden bg-white rounded-xl outline-none">
                <form onSubmit={handleSubmit}>
                    {/* CLEAN PROFESSIONAL HEADER */}
                    <DialogHeader className="px-8 py-6 border-b border-slate-100 bg-white">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-emerald-50 rounded-lg flex items-center justify-center border border-emerald-100">
                                <Coins className="text-emerald-600" size={22} />
                            </div>
                            <div className="space-y-0.5">
                                <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">Record Payment</DialogTitle>
                                <DialogDescription className="text-slate-500 text-xs font-medium">Add payment details for {client.name}</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <input type="hidden" name="contact_id" value={client.id} />
                    <input type="hidden" name="business_id" value={client.business_id} />
                    <input type="hidden" name="currency_code" value={client.currency} />

                    <div className="p-8 space-y-6">
                        {/* OUTSTANDING BALANCE DISPLAY */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Balance</span>
                            <span className="text-lg font-bold text-slate-900">
                                {client.current_debt.toLocaleString()} {client.currency}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Payment Amount</Label>
                                <Input 
                                    name="amount" 
                                    type="number" 
                                    step="0.01" 
                                    required 
                                    placeholder="0.00" 
                                    className="h-10 text-sm font-bold text-emerald-700 border-slate-200 focus:ring-emerald-500" 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Method</Label>
                                <Select name="payment_method" required defaultValue="CASH">
                                    <SelectTrigger className="h-10 text-sm font-semibold border-slate-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CASH">Cash</SelectItem>
                                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                                        <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">Reference Number</Label>
                            <div className="relative">
                                <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <Input 
                                    name="reference_no" 
                                    placeholder="e.g. Receipt # or TRX ID" 
                                    className="h-10 pl-10 text-sm font-medium border-slate-200" 
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">Internal Notes</Label>
                            <div className="relative">
                                <NotebookPen className="absolute left-3 top-3 text-slate-400" size={16} />
                                <Input 
                                    name="notes" 
                                    placeholder="Any additional details regarding this payment..." 
                                    className="h-20 pl-10 pt-2 text-sm border-slate-200 align-top" 
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => onOpenChange(false)} 
                            className="text-xs font-bold text-slate-500 hover:text-slate-900"
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={isPending} 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-8 h-10 shadow-sm transition-all"
                        >
                            {isPending ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Processing...
                                </span>
                            ) : (
                                "Record Payment"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}