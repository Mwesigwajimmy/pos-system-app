'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client'; // ADDED FOR IDENTITY CHECK
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
import { 
  Loader2, 
  CheckCircle2, 
  Wallet, 
  Banknote, 
  CreditCard, 
  Coins, 
  AlertCircle, 
  ShieldAlert 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Customer } from '@/types/dashboard';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  selectedCustomer: Customer | null; // ADDED: Required for Credit logic
  onConfirm: (paymentData: { paymentMethod: string; amountPaid: number; }) => void;
  isProcessing: boolean;
}

export default function PaymentModal({ 
  isOpen, 
  onClose, 
  totalAmount, 
  selectedCustomer,
  onConfirm, 
  isProcessing 
}: PaymentModalProps) {
  const supabase = createClient();
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState<string | number>(totalAmount);
  
  // --- CREDIT INFRASTRUCTURE STATE ---
  const [isCreditCheckLoading, setIsCreditCheckLoading] = useState(false);
  const [creditData, setCreditData] = useState({ limit: 0, balance: 0 });

  useEffect(() => {
    if (isOpen) {
      setAmountPaid(totalAmount);
      // Reset credit data on open
      setCreditData({ limit: 0, balance: 0 });
    }
  }, [totalAmount, isOpen]);

  // --- DYNAMIC CREDIT HANDSHAKE ---
  useEffect(() => {
    if (isOpen && paymentMethod === 'Credit' && selectedCustomer?.id) {
      const fetchCustomerCredit = async () => {
        setIsCreditCheckLoading(true);
        const { data, error } = await supabase
          .from('customers')
          .select('credit_limit, outstanding_balance')
          .eq('id', selectedCustomer.id)
          .single();
        
        if (data) {
          setCreditData({ 
            limit: Number(data.credit_limit || 0), 
            balance: Number(data.outstanding_balance || 0) 
          });
        }
        setIsCreditCheckLoading(false);
      };
      fetchCustomerCredit();
    }
  }, [paymentMethod, selectedCustomer, isOpen, supabase]);

  const changeDue = useMemo(() => {
    const paid = Number(amountPaid) || 0;
    return paid >= totalAmount ? paid - totalAmount : 0;
  }, [amountPaid, totalAmount]);

  // --- CREDIT VALIDATION LOGIC ---
  const availableCredit = creditData.limit - creditData.balance;
  const isOverLimit = paymentMethod === 'Credit' && creditData.limit > 0 && totalAmount > availableCredit;
  const noCustomerSelectedForCredit = paymentMethod === 'Credit' && !selectedCustomer;

  const handleConfirm = () => {
    if (isOverLimit || noCustomerSelectedForCredit) return;
    
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

        <div className="p-8 space-y-6 bg-white">
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
                            disabled={paymentMethod === 'Credit'}
                            className="h-11 border-slate-200 bg-slate-50 font-bold text-lg focus:ring-blue-600"
                        />
                    </div>
                </div>
            </div>

            {/* --- NATIVE CREDIT STATUS CARD --- */}
            {paymentMethod === 'Credit' && (
               <div className={cn(
                 "p-5 rounded-xl border animate-in fade-in slide-in-from-top-2",
                 noCustomerSelectedForCredit ? "bg-amber-50 border-amber-200" :
                 isOverLimit ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-100"
               )}>
                  {isCreditCheckLoading ? (
                    <div className="flex items-center justify-center py-2 gap-2 text-blue-600 font-bold text-xs uppercase">
                      <Loader2 className="h-4 w-4 animate-spin" /> Verifying Identity...
                    </div>
                  ) : noCustomerSelectedForCredit ? (
                    <div className="flex flex-col items-center text-center gap-2">
                       <ShieldAlert className="h-6 w-6 text-amber-600" />
                       <p className="text-xs font-bold text-amber-700 uppercase tracking-tight">Access Denied: No Customer Linked</p>
                       <p className="text-[10px] text-amber-600 font-medium">Link a customer first to authorize store credit.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                       <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase text-slate-400">Customer Identity</span>
                          <span className="text-[10px] font-black uppercase text-blue-600">{selectedCustomer?.name}</span>
                       </div>
                       <div className="flex justify-between items-center border-t border-blue-100 pt-2">
                          <span className="text-[10px] font-black uppercase text-slate-400">Available Limit</span>
                          <span className={cn("font-bold text-sm", isOverLimit ? "text-red-600" : "text-slate-900")}>
                             UGX {availableCredit.toLocaleString()}
                          </span>
                       </div>
                       {isOverLimit && (
                         <div className="flex items-center gap-2 p-2 bg-red-600 text-white rounded-lg mt-2 shadow-lg shadow-red-100">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <p className="text-[9px] font-black uppercase leading-tight">Handshake Failed: Transaction Exceeds Credit Limit</p>
                         </div>
                       )}
                    </div>
                  )}
               </div>
            )}

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
          <Button 
            onClick={handleConfirm} 
            disabled={isProcessing || isOverLimit || noCustomerSelectedForCredit || isCreditCheckLoading} 
            className={cn(
              "font-bold h-11 px-8 rounded-lg shadow-md transition-all",
              isOverLimit ? "bg-slate-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"
            )}
          >
            {isProcessing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Processing...</>
            ) : isOverLimit ? (
                <><ShieldAlert className="mr-2 h-4 w-4" /> Limit Exceeded</>
            ) : (
                <><CheckCircle2 className="mr-2 h-4 w-4" /> Confirm Sale</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}