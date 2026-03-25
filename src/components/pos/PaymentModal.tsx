'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Loader2, CheckCircle2, Wallet, Banknote, CreditCard, Coins } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onConfirm: (paymentData: { paymentMethod: string; amountPaid: number; }) => void;
  isProcessing: boolean;
}

export default function PaymentModal({ isOpen, onClose, totalAmount, onConfirm, isProcessing }: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState<string | number>(totalAmount);

  useEffect(() => {
    if (isOpen) {
      setAmountPaid(totalAmount);
    }
  }, [totalAmount, isOpen]);

  const changeDue = useMemo(() => {
    const paid = Number(amountPaid) || 0;
    return paid >= totalAmount ? paid - totalAmount : 0;
  }, [amountPaid, totalAmount]);

  const handleConfirm = () => {
    onConfirm({
      paymentMethod,
      amountPaid: Number(amountPaid),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none rounded-2xl shadow-2xl">
        <DialogHeader className="p-8 bg-white border-b border-slate-100">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-blue-50 rounded-xl">
                <Wallet className="h-6 w-6 text-blue-600" />
             </div>
             <div>
                <DialogTitle className="text-xl font-bold text-slate-900">Finalize Payment</DialogTitle>
                <DialogDescription className="text-sm text-slate-500">Confirm payment method and amount received.</DialogDescription>
             </div>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-8 bg-white">
            {/* Amount Summary */}
            <div className="text-center p-6 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
                <span className="text-xs font-bold text-blue-100 uppercase tracking-widest">Total Amount Due</span>
                <p className="text-4xl font-bold text-white mt-1">
                   UGX {totalAmount.toLocaleString()}
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="paymentMethod" className="text-xs font-bold text-slate-700 uppercase">Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger id="paymentMethod" className="h-11 border-slate-200 bg-slate-50 font-semibold">
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Cash">Cash Payment</SelectItem>
                            <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                            <SelectItem value="Card">Card / POS</SelectItem>
                            <SelectItem value="Credit">Store Credit</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="amountPaid" className="text-xs font-bold text-slate-700 uppercase">Received</Label>
                    <div className="relative">
                        <Input
                            id="amountPaid"
                            type="number"
                            value={amountPaid}
                            onChange={e => setAmountPaid(e.target.value)}
                            autoFocus
                            onFocus={(e) => e.target.select()}
                            className="h-11 border-slate-200 bg-slate-50 font-bold text-lg focus:ring-blue-600"
                        />
                    </div>
                </div>
            </div>

            {paymentMethod === 'Cash' && (
               <div className={`p-5 rounded-xl border transition-all flex items-center justify-between ${changeDue > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                  <div className="flex items-center gap-3">
                     <div className={`p-2 rounded-lg ${changeDue > 0 ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-500'}`}>
                        <Coins className="h-5 w-5" />
                     </div>
                     <span className="text-sm font-bold text-slate-600">Change Due</span>
                  </div>
                  <p className={`text-xl font-bold ${changeDue > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    UGX {changeDue.toLocaleString()}
                  </p>
               </div>
            )}
        </div>

        <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isProcessing} className="font-bold text-slate-500">
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-8 rounded-lg shadow-md">
            {isProcessing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Processing...</>
            ) : (
                <><CheckCircle2 className="mr-2 h-4 w-4" /> Confirm Sale</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}