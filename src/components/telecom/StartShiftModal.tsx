'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export function StartShiftModal({ isOpen, onClose, employees, onStartShift, isPending }: { isOpen: boolean, onClose: () => void, employees: any[], onStartShift: any, isPending: boolean }) {
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [amount, setAmount] = useState('');

    const handleSubmit = () => {
        if (!selectedEmployee || !amount) return;
        onStartShift({ userId: selectedEmployee, amount: parseFloat(amount) }, {
            onSuccess: () => {
                onClose();
                setSelectedEmployee('');
                setAmount('');
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Start Agent Shift</DialogTitle>
                    <DialogDescription>Issue working capital to an agent to begin their shift.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Select Agent</Label>
                        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                            <SelectTrigger><SelectValue placeholder="Choose an agent..." /></SelectTrigger>
                            <SelectContent>
                                {employees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Float Amount (UGX)</Label>
                        <Input type="number" placeholder="e.g., 500000" value={amount} onChange={e => setAmount(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isPending || !selectedEmployee || !amount}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Issue Float
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}