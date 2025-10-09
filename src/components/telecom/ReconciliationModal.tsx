'use client';

import { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Printer } from 'lucide-react';
import { PrintableReconciliationReport } from './PrintableReconciliationReport';

export function ReconciliationModal({ agent, isOpen, onClose, onSubmit, isPending, reportData, onCloseReport }: any) {
    const [cashCounted, setCashCounted] = useState('');
    const reportRef = useRef(null);
    const handlePrint = useReactToPrint({ content: () => reportRef.current });

    const handleSubmit = () => {
        if (agent && cashCounted) {
            onSubmit({ userId: agent.id, cashCounted: parseFloat(cashCounted) });
        }
    };
    
    if (reportData) {
        return (
             <Dialog open={true} onOpenChange={onCloseReport}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Shift Reconciliation Report</DialogTitle></DialogHeader>
                    <div className="py-4">
                        <PrintableReconciliationReport ref={reportRef} reportData={reportData} />
                    </div>
                    <DialogFooter>
                         <Button variant="outline" onClick={onCloseReport}>Close</Button>
                         <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Print Report</Button>
                    </DialogFooter>
                </DialogContent>
             </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Reconcile Shift for {agent?.name}</DialogTitle>
                    <DialogDescription>Enter the total cash counted from the agent to balance their shift.</DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-4">
                    <Label>Actual Cash Counted (UGX)</Label>
                    <Input type="number" placeholder="Enter total physical cash" value={cashCounted} onChange={e => setCashCounted(e.target.value)} />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isPending || !cashCounted}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Generate Report & End Shift
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}