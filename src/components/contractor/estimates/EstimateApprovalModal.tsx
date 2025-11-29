'use client';

import * as React from "react";
// FIX: Replaced non-existent 'Modal' with standard 'Dialog' components
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Check, X, Loader2 } from "lucide-react";

export function EstimateApprovalModal({ open, onClose, estimateId, tenantId, onComplete }: { open: boolean; onClose: () => void; estimateId: string; tenantId: string; onComplete: ()=>void }) {
    const [processing, setProcessing] = React.useState<'approve' | 'reject' | null>(null);

    const handleAction = async (action: 'APPROVED' | 'REJECTED') => {
        setProcessing(action === 'APPROVED' ? 'approve' : 'reject');
        try {
            const db = createClient();
            const { error } = await db
                .from("estimates")
                .update({ status: action })
                .eq("id", estimateId)
                .eq("tenant_id", tenantId);

            if (error) throw error;

            toast.success(`Estimate ${action.toLowerCase()}`);
            onComplete();
            onClose();
        } catch (e: any) { 
            toast.error(e.message || "Action failed"); 
        } finally {
            setProcessing(null);
        }
    };

    if (!open) return null;

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Review Estimate</DialogTitle>
                    <DialogDescription>
                        Please review the estimate details before making a decision. This action cannot be easily undone.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-3 mt-4">
                    <Button 
                        onClick={() => handleAction('APPROVED')} 
                        disabled={!!processing} 
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                        {processing === 'approve' ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Check className="w-4 h-4 mr-2"/>}
                        Approve Estimate
                    </Button>
                    <Button 
                        onClick={() => handleAction('REJECTED')} 
                        disabled={!!processing} 
                        variant="destructive"
                        className="w-full"
                    >
                        {processing === 'reject' ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <X className="w-4 h-4 mr-2"/>}
                        Reject Estimate
                    </Button>
                    <Button 
                        variant="ghost" 
                        onClick={onClose} 
                        disabled={!!processing}
                    >
                        Cancel
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}