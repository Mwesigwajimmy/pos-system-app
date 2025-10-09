'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export function RecordSaleModal({ isOpen, onClose, services, onSubmit, isPending }: { isOpen: boolean, onClose: () => void, services: any[], onSubmit: any, isPending: boolean }) {
    const [serviceId, setServiceId] = useState('');
    const [amount, setAmount] = useState('');
    const [commission, setCommission] = useState('');
    const [phone, setPhone] = useState('');

    const handleSubmit = () => {
        onSubmit({ serviceId: parseInt(serviceId), amount: parseFloat(amount), commission: parseFloat(commission) || 0, phone }, {
            onSuccess: () => {
                onClose();
                setServiceId(''); setAmount(''); setCommission(''); setPhone('');
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader><DialogTitle>Record Telecom Sale</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Service Sold</Label>
                        <Select value={serviceId} onValueChange={setServiceId}>
                            <SelectTrigger><SelectValue placeholder="Select a service..." /></SelectTrigger>
                            <SelectContent>
                                {services.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.provider.name} {s.service_type}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2"><Label>Customer Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g., 077XXXXXXX" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Sale Amount (UGX)</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} /></div>
                        <div className="space-y-2"><Label>Commission (UGX)</Label><Input type="number" value={commission} onChange={e => setCommission(e.target.value)} /></div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Record Sale
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}