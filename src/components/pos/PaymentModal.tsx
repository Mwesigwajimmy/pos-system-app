'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';

// --- INTERFACE UPDATED ---
interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  // This function now expects 'amountPaid'
  onConfirm: (paymentData: { paymentMethod: string; amountPaid: number; }) => void;
  isProcessing: boolean;
}

export default function PaymentModal({ isOpen, onClose, totalAmount, onConfirm, isProcessing }: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  // --- STATE RENAMED ---
  const [amountPaid, setAmountPaid] = useState<string | number>(totalAmount);

  // Reset amount paid when the modal opens or totalAmount changes
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
    // --- CONFIRMATION DATA FIXED ---
    onConfirm({
      paymentMethod,
      amountPaid: Number(amountPaid),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Complete Sale</DialogTitle>
          <DialogDescription>Select payment method and confirm the transaction.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
            <div className="text-center">
                <Label>Total Due</Label>
                <p className="text-4xl font-bold">UGX {totalAmount.toLocaleString()}</p>
            </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="paymentMethod"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Credit">On Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              {/* --- UI UPDATED --- */}
              <Label htmlFor="amountPaid">Amount Paid</Label>
              <Input
                id="amountPaid"
                type="number"
                value={amountPaid}
                onChange={e => setAmountPaid(e.target.value)}
                autoFocus
                onFocus={(e) => e.target.select()}
              />
            </div>
          </div>
          {paymentMethod === 'Cash' && changeDue > 0 && (
             <div className="text-center p-4 bg-secondary rounded-lg">
                <Label>Change Due</Label>
                <p className="text-2xl font-semibold text-primary">UGX {changeDue.toLocaleString()}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={isProcessing}>
            {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Processing...</> : `Confirm Payment`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}