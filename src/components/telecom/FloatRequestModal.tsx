'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export function FloatRequestModal({ isOpen, onClose, services, onSubmit, isPending }: any) {
    const [serviceId, setServiceId] = useState('');
    const [amount, setAmount] = useState('');

    const handleSubmit = () => {
        onSubmit({ serviceId: parseInt(serviceId), amount: parseFloat(amount) }, {
            onSuccess: () => { onClose(); setServiceId(''); setAmount(''); }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader><DialogTitle>Request Float / Stock</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Service Stock</Label>
                        <Select value={serviceId} onValueChange={setServiceId}>
                            <SelectTrigger><SelectValue placeholder="Select a service..." /></SelectTrigger>
                            <SelectContent>
                                {services.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.provider.name} {s.service_type}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2"><Label>Amount (UGX)</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} /></div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Submit Request
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}