'use client';
import { approvePayrollRun } from '@/lib/payroll/actions';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button'; // Assuming you use Shadcn UI

export function ApprovePayrollButton({ runId }: { runId: string }) {
    const [isPending, startTransition] = useTransition();
    
    const handleApprove = () => {
        if (confirm('Are you sure you want to approve this payroll? This action cannot be undone.')) {
            startTransition(async () => {
                const result = await approvePayrollRun(runId);
                if (result.error) {
                    alert(`Error: ${result.error}`);
                } else {
                    alert('Payroll approved and is now processing!');
                }
            });
        }
    }

    return (
        <Button onClick={handleApprove} disabled={isPending}>
            {isPending ? 'Approving...' : 'Approve & Process Payroll'}
        </Button>
    );
}