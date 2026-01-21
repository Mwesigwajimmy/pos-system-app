'use client';

import { approvePayrollRun } from '@/lib/payroll/actions';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { 
    ShieldCheck, 
    Loader2, 
    AlertTriangle, 
    Landmark 
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function ApprovePayrollButton({ runId }: { runId: string }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    
    const handleApprove = () => {
        // We use a toast-based confirmation or a more professional prompt
        const isConfirmed = window.confirm(
            "AUTHORIZATION REQUIRED:\n\nApproving this payroll will:\n1. Lock employee payslips.\n2. Generate PAYE Tax Liabilities.\n3. Post Gross Wages to the General Ledger (Account 6100).\n\nDo you wish to proceed?"
        );

        if (isConfirmed) {
            startTransition(async () => {
                const result = await approvePayrollRun(runId);
                
                if (result?.error) {
                    toast.error(`Authorization Failed: ${result.error}`, {
                        icon: <AlertTriangle className="h-4 w-4 text-destructive" />
                    });
                } else {
                    toast.success("Payroll Authorized & Ledger Synchronized", {
                        description: "Financial entries have been posted to the master ledger.",
                        icon: <ShieldCheck className="h-4 w-4 text-green-600" />
                    });
                    // Refresh the page data to show the 'Paid' status and new Ledger links
                    router.refresh();
                }
            });
        }
    }

    return (
        <Button 
            onClick={handleApprove} 
            disabled={isPending}
            variant={isPending ? "outline" : "default"}
            className={cn(
                "h-11 px-8 font-bold shadow-xl transition-all",
                !isPending && "bg-green-600 hover:bg-green-700 text-white"
            )}
        >
            {isPending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authorizing Ledger...
                </>
            ) : (
                <>
                    <Landmark className="mr-2 h-5 w-5" />
                    Approve & Post Payroll
                </>
            )}
        </Button>
    );
}

// Helper for class names if you don't have it imported
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}