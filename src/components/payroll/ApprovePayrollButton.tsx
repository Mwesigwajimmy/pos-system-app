'use client';

import { approvePayrollRun } from '@/lib/payroll/actions';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { 
    ShieldCheck, 
    Loader2, 
    AlertTriangle, 
    Landmark,
    Lock,
    Scale
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

/**
 * LITONU BUSINESS BASE UNIVERSE LTD - SOVEREIGN AUTHORIZATION PROTOCOL
 * 
 * UPGRADE: Authoritative Ledger Execution Gate.
 * This component handles the final "Weld" of payroll data into the 
 * Institutional General Ledger (IFRS-16 Compliant).
 */
export function ApprovePayrollButton({ runId }: { runId: string }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    
    const handleApprove = () => {
        // --- AUTHORITATIVE EXECUTION NOTICE ---
        // Upgraded text to reflect Institutional Security and GL impact.
        const isConfirmed = window.confirm(
            "SOVEREIGN AUTHORIZATION REQUIRED:\n\n" +
            "Executing this protocol will perform the following actions:\n" +
            "1. Physically LOCK all employee payslips for this cycle.\n" +
            "2. Generate definitive Statutory Tax Liabilities (Account 2100).\n" +
            "3. Post Gross Wage Expenditures to the General Ledger (Account 6100).\n" +
            "4. Identity Seal: This action is irreversible and forensic logs will be recorded.\n\n" +
            "Do you authorize this financial execution?"
        );

        if (isConfirmed) {
            startTransition(async () => {
                try {
                    const result = await approvePayrollRun(runId);
                    
                    if (result?.error) {
                        toast.error("Authorization Breach", {
                            description: result.error,
                            icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
                            duration: 6000
                        });
                    } else {
                        toast.success("Identity Sealed & Ledger Posted", {
                            description: "Financial nodes have been successfully synchronized.",
                            icon: <ShieldCheck className="h-5 w-5 text-emerald-600" />,
                            duration: 5000
                        });
                        
                        // Force a deep refresh to update the 'Sealed' status across the UI
                        router.refresh();
                    }
                } catch (err: any) {
                    toast.error("Kernel Error", {
                        description: "An unexpected exception occurred during ledger synchronization.",
                        icon: <Scale className="h-5 w-5 text-amber-500" />
                    });
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
                "h-12 px-10 font-black uppercase tracking-[0.15em] text-xs shadow-2xl transition-all active:scale-95 rounded-2xl",
                !isPending 
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20" 
                    : "border-slate-200 text-slate-400 bg-slate-50"
            )}
        >
            {isPending ? (
                <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin text-emerald-600" />
                    <span>Authorizing Node...</span>
                </>
            ) : (
                <>
                    <Landmark className="mr-3 h-5 w-5 fill-white/10" />
                    <span>Authorize & Post Ledger</span>
                </>
            )}
        </Button>
    );
}

/**
 * DEEPLY DEFINED UTILITY: cn (Class Name Merger)
 * Optimized for institutional build stability.
 */
function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}