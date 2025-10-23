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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

// Import the real server action and its state type
import { createJobOpening, FormState } from '@/lib/hr/actions/recruitment';


interface CreateJobModalProps {
    employeeId: string;
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? 'Creating...' : 'Create Job Opening'}
        </Button>
    );
}

export function CreateJobModal({ employeeId }: CreateJobModalProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);

    const initialState: FormState = { success: false, message: '', errors: null };
    const [formState, formAction] = useFormState(createJobOpening, initialState);

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
                    New Job Opening
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <form action={formAction}>
                    <DialogHeader>
                        <DialogTitle>Create New Job Opening</DialogTitle>
                        <DialogDescription>
                            This will create a new job posting. It will start as a draft, and you can publish it later.
                        </DialogDescription>
                    </DialogHeader>

                    <input type="hidden" name="created_by" value={employeeId} />

                    <div className="grid gap-4 py-6">
                        <div className="space-y-1">
                            <Label htmlFor="title">Job Title</Label>
                            <Input id="title" name="title" placeholder="e.g., Senior Software Engineer" required />
                            {formState.errors?.title && (
                                <p className="text-sm text-destructive">{formState.errors.title[0]}</p>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="department">Department</Label>
                                <Input id="department" name="department" placeholder="e.g., Technology" />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="location">Location</Label>
                                <Input id="location" name="location" placeholder="e.g., Remote or New York, NY" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="description">Job Description</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="Describe the role, responsibilities, and qualifications."
                                className="min-h-[150px]"
                            />
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