'use client';

import React, { useState } from 'react';
import { approvePayrollRun } from '@/lib/payroll/actions';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { 
    ShieldCheck, 
    Loader2, 
    AlertTriangle, 
    Landmark,
    Lock,
    Scale,
    Gavel,
    FileCheck,
    Fingerprint
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * BBU1 SOVEREIGN AUTHORIZATION PROTOCOL - V12.9
 * 
 * This component handles the definitive ledger commit. It transitions a 
 * payroll run from 'DRAFT' to 'PAID', sealing all underlying payslips 
 * and generating the statutory liabilities.
 */

interface ApprovePayrollButtonProps {
    runId: string;
}

export function ApprovePayrollButton({ runId }: ApprovePayrollButtonProps) {
    const [isPending, startTransition] = useTransition();
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();
    
    const executeAuthorization = () => {
        startTransition(async () => {
            try {
                const result = await approvePayrollRun(runId);
                
                if (result?.error) {
                    toast.error("Authorization Breach", {
                        description: result.error,
                        icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
                    });
                } else {
                    toast.success("Ledger Synchronized", {
                        description: "Identity sealed and disbursements recorded in the General Ledger.",
                        icon: <ShieldCheck className="h-5 w-5 text-slate-900" />,
                    });
                    setIsOpen(false);
                    router.refresh();
                }
            } catch (err: any) {
                toast.error("Handshake Fault", {
                    description: "An unexpected exception occurred during ledger synchronization.",
                    icon: <Scale className="h-5 w-5 text-amber-600" />
                });
            }
        });
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
                <Button 
                    disabled={isPending}
                    className="h-12 px-10 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.15em] text-[10px] shadow-2xl transition-all active:scale-95 rounded-xl border-none"
                >
                    {isPending ? (
                        <>
                            <Loader2 className="mr-3 h-4 w-4 animate-spin" />
                            <span>Authenticating Node...</span>
                        </>
                    ) : (
                        <>
                            <ShieldCheck className="mr-3 h-4 w-4" />
                            <span>Authorize & Post Ledger</span>
                        </>
                    )}
                </Button>
            </AlertDialogTrigger>
            
            <AlertDialogContent className="max-w-md rounded-[2.5rem] border-none shadow-2xl p-10 bg-white">
                <AlertDialogHeader>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-14 w-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900 border border-slate-100">
                            <Gavel className="h-7 w-7" />
                        </div>
                        <div>
                            <AlertDialogTitle className="text-xl font-black uppercase tracking-tighter leading-none">Authoritative Seal</AlertDialogTitle>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                                <Lock className="h-3 w-3" /> Ledger Security Level 4
                            </p>
                        </div>
                    </div>
                    
                    <AlertDialogDescription className="text-slate-600 text-sm font-medium leading-relaxed bg-slate-50 p-6 rounded-3xl border border-slate-100 italic">
                        "I am authorizing the immediate disbursement of labor funds and the generation of statutory tax liabilities for this node."
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="py-8 space-y-5">
                    <div className="flex items-start gap-4">
                        <FileCheck className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                            <p className="text-xs font-black text-slate-900 uppercase">Personnel Lock</p>
                            <p className="text-[11px] text-slate-500 font-medium">All payslips will be physically locked and finalized.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <Landmark className="h-5 w-5 text-amber-500 mt-0.5" />
                        <div>
                            <p className="text-xs font-black text-slate-900 uppercase">General Ledger Entry</p>
                            <p className="text-[11px] text-slate-500 font-medium">Auto-post to Accounts 6100 (Labor) and 2100 (Tax Authority).</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <Fingerprint className="h-5 w-5 text-slate-400 mt-0.5" />
                        <div>
                            <p className="text-xs font-black text-slate-900 uppercase">Forensic Identity</p>
                            <p className="text-[11px] text-slate-500 font-medium">Your identity signature will be sealed in the transaction audit trail.</p>
                        </div>
                    </div>
                </div>

                <AlertDialogFooter className="flex flex-col sm:flex-row gap-3">
                    <AlertDialogCancel asChild>
                        <Button variant="ghost" className="flex-1 h-12 font-bold uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-900">
                            Decline
                        </Button>
                    </AlertDialogCancel>
                    <AlertDialogAction asChild>
                        <Button 
                            onClick={(e) => {
                                e.preventDefault();
                                executeAuthorization();
                            }}
                            disabled={isPending}
                            className="flex-1 h-12 bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] tracking-widest shadow-xl rounded-xl"
                        >
                            {isPending ? "Executing Math Node..." : "Confirm Authorization"}
                        </Button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}