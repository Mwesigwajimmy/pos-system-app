'use client';

import { useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import type { Stage } from './SalesPipelineBoard';

// Import the real server action and its state type
import { createDeal, FormState } from '@/lib/crm/actions/leads';


interface CreateDealModalProps {
    stages: Stage[];
    employeeId: string;
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? 'Creating Deal...' : 'Create Deal'}
        </Button>
    );
}

export function CreateDealModal({ stages, employeeId }: CreateDealModalProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);

    const initialState: FormState = { success: false, message: '', errors: null };
    const [formState, formAction] = useFormState(createDeal, initialState);

    useEffect(() => {
        if (formState.success) {
            toast({
                title: "Success!",
                description: formState.message,
            });
            setIsOpen(false);
            router.refresh();
        } else if (formState.message && !formState.errors) {
            toast({
                title: "Error",
                description: formState.message,
                variant: "destructive",
            });
        }
    }, [formState, router, toast]);

    // Set the default stage to the first one in the pipeline
    const initialStageId = stages.length > 0 ? stages[0].id : '';

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Deal
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <form action={formAction}>
                    <DialogHeader>
                        <DialogTitle>Create New Deal</DialogTitle>
                        <DialogDescription>
                            Enter the details for the new sales opportunity.
                        </DialogDescription>
                    </DialogHeader>

                    <input type="hidden" name="owner_id" value={employeeId} />

                    <div className="grid gap-4 py-6">
                        <div className="space-y-1">
                            <Label htmlFor="title">Deal Title</Label>
                            <Input id="title" name="title" placeholder="e.g., Acme Corp Website Redesign" required />
                            {formState.errors?.title && (
                                <p className="text-sm text-destructive">{formState.errors.title[0]}</p>
                            )}
                        </div>

                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="value">Value (USD)</Label>
                                <Input id="value" name="value" type="number" step="0.01" placeholder="e.g., 5000" />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="stage_id">Initial Stage</Label>
                                <Select name="stage_id" defaultValue={initialStageId} required>
                                    {/* --- THIS IS THE FIXED BLOCK --- */}
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a stage" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {stages.map((stage) => (
                                            <SelectItem key={stage.id} value={stage.id}>
                                                {stage.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="contact_name">Contact Name (Optional)</Label>
                            <Input id="contact_name" name="contact_name" placeholder="e.g., John Doe" />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                            Cancel
                        </Button>
                        <SubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}