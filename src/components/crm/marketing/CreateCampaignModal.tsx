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

// Import the real server action and its state type
import { createCampaign, FormState } from '@/lib/crm/actions/marketing';


interface CreateCampaignModalProps {
    employeeId: string;
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? 'Creating Campaign...' : 'Create Campaign'}
        </Button>
    );
}

export function CreateCampaignModal({ employeeId }: CreateCampaignModalProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);

    const initialState: FormState = { success: false, message: '', errors: null };
    const [formState, formAction] = useFormState(createCampaign, initialState);

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

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Campaign
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <form action={formAction}>
                    <DialogHeader>
                        <DialogTitle>Create New Campaign</DialogTitle>
                        <DialogDescription>
                            Define the name and type for a new campaign. You can add content and define the audience in the next step.
                        </DialogDescription>
                    </DialogHeader>

                    <input type="hidden" name="created_by" value={employeeId} />

                    <div className="grid gap-4 py-6">
                        <div className="space-y-1">
                            <Label htmlFor="name">Campaign Name</Label>
                            <Input id="name" name="name" placeholder="e.g., Q4 Holiday Promotion" required />
                            {formState.errors?.name && (
                                <p className="text-sm text-destructive">{formState.errors.name[0]}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="type">Campaign Type</Label>
                            <Select name="type" defaultValue="EMAIL" required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="EMAIL">Email</SelectItem>
                                    <SelectItem value="SMS">SMS</SelectItem>
                                </SelectContent>
                            </Select>
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