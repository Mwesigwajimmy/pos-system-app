'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

export function RecordExpenseModal({ isOpen, onClose, onSubmit, isPending }: { isOpen: boolean, onClose: () => void, onSubmit: any, isPending: boolean }) {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = () => {
        onSubmit({ amount: parseFloat(amount), description, receiptUrl: null }, {
            onSuccess: () => {
                onClose();
                setAmount(''); setDescription('');
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader><DialogTitle>Record Operational Expense</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2"><Label>Amount (UGX)</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., Transport to town" /></div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Record Expense
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}