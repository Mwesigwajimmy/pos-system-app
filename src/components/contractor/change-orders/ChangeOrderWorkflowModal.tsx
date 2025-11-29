'use client';

import * as React from "react";
// FIX: Replaced non-existent 'Modal' with standard 'Dialog' components
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle 
} from "@/components/ui/dialog"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

interface ChangeOrderWorkflowModalProps {
    open: boolean;
    onClose: () => void;
    jobId: string;
    tenantId: string;
    currentUser: string;
    onComplete: () => void;
}

export function ChangeOrderWorkflowModal({ open, onClose, jobId, tenantId, currentUser, onComplete }: ChangeOrderWorkflowModalProps) {
    const [title, setTitle] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [amountChange, setAmountChange] = React.useState<number>(0);
    const [file, setFile] = React.useState<File | null>(null);
    const [saving, setSaving] = React.useState(false);

    // Reset form when modal opens
    React.useEffect(() => {
        if (open) {
            setTitle('');
            setDescription('');
            setAmountChange(0);
            setFile(null);
        }
    }, [open]);

    const handleSubmit = async () => {
        setSaving(true);
        try {
            let doc_url = '';
            const db = createClient();

            if (file) {
                const path = `${tenantId}/change-orders/${Date.now()}-${file.name}`;
                const { error: uploadError } = await db.storage.from('contracts').upload(path, file);
                if (uploadError) throw uploadError;
                
                const { data } = db.storage.from('contracts').getPublicUrl(path);
                doc_url = data.publicUrl;
            }

            const { error: dbError } = await db.from("change_orders").insert([{
                job_id: jobId,
                title,
                description,
                amount_change: amountChange,
                status: "PENDING",
                doc_url,
                tenant_id: tenantId,
                created_by: currentUser,
            }]);

            if (dbError) throw dbError;

            toast.success("Change Order Submitted");
            onComplete();
            onClose();
        } catch (e: any) {
            toast.error(e.message || "Change Order failed");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Submit Change Order</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Title</label>
                        <Input 
                            placeholder="e.g. Additional Wiring" 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <Textarea 
                            placeholder="Reason for change..." 
                            value={description} 
                            onChange={e => setDescription(e.target.value)} 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Amount Change (+/-)</label>
                        <Input 
                            type="number" 
                            placeholder="0.00" 
                            value={amountChange} 
                            onChange={e => setAmountChange(Number(e.target.value))} 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Attachment (Optional)</label>
                        <Input 
                            type="file" 
                            className="cursor-pointer"
                            onChange={e => setFile(e.target.files?.[0] ?? null)} 
                        />
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button onClick={onClose} variant="outline" disabled={saving}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={saving || !title || !description}>
                            {saving ? "Submitting..." : "Submit"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}