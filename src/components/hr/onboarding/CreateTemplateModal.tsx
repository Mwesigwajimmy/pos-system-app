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

// We will create the server action in the next step
// import { createOnboardingTemplate, FormState } from '@/lib/hr/actions/onboarding';

// MOCK TYPES AND ACTION FOR UI DEVELOPMENT
interface FormState { success: boolean; message: string; errors?: { [key: string]: string[] } | null; }
async function createOnboardingTemplate(prevState: FormState, formData: FormData): Promise<FormState> {
    console.log("Mock Action: Creating onboarding template...");
    const rawFormData = Object.fromEntries(formData.entries());
    console.log(rawFormData);
    await new Promise(resolve => setTimeout(resolve, 1000));
    // return { success: false, message: "This is a mock server error.", errors: null };
    return { success: true, message: "Onboarding template has been created." };
}
// END MOCK

interface CreateTemplateModalProps {
    employeeId: string;
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? 'Creating...' : 'Create Template'}
        </Button>
    );
}

export function CreateTemplateModal({ employeeId }: CreateTemplateModalProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);

    const initialState: FormState = { success: false, message: '', errors: null };
    const [formState, formAction] = useFormState(createOnboardingTemplate, initialState);

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
                    New Onboarding Template
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <form action={formAction}>
                    <DialogHeader>
                        <DialogTitle>New Onboarding Template</DialogTitle>
                        <DialogDescription>
                            Create a reusable checklist template for new hires. You can add specific tasks in the next step.
                        </DialogDescription>
                    </DialogHeader>

                    <input type="hidden" name="created_by" value={employeeId} />

                    <div className="grid gap-4 py-6">
                        <div className="space-y-1">
                            <Label htmlFor="title">Template Title</Label>
                            <Input id="title" name="title" placeholder="e.g., Software Engineer Onboarding" required />
                            {formState.errors?.title && (
                                <p className="text-sm text-destructive">{formState.errors.title[0]}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="A brief description of who this template is for."
                                className="min-h-[100px]"
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