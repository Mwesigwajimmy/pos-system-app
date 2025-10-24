'use client';

import { useEffect, useState, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useToast } from '@/components/ui/use-toast';
import { createClientAction, FormState } from '@/lib/professional-services/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle } from 'lucide-react';

function SubmitButton() {
    const { pending } = useFormStatus();
    return <Button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Save Client'}</Button>;
}

export function CreateClientModal() {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const initialState: FormState = { success: false, message: '', errors: null };
    const [formState, formAction] = useFormState(createClientAction, initialState);

    useEffect(() => {
        if (formState.message) {
            if (formState.success) {
                toast({ title: "Success!", description: formState.message });
                setIsOpen(false);
                formRef.current?.reset();
            } else if (!formState.errors) {
                toast({ title: "Error", description: formState.message, variant: 'destructive' });
            }
        }
    }, [formState, toast]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" /> New Client</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form ref={formRef} action={formAction}>
                    <DialogHeader><DialogTitle>Add New Client</DialogTitle><DialogDescription>Enter the details for your new client.</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-1"><Label htmlFor="name">Full Name / Company</Label><Input id="name" name="name" required />{formState.errors?.name && <p className="text-sm text-destructive">{formState.errors.name[0]}</p>}</div>
                        <div className="space-y-1"><Label htmlFor="email">Email Address</Label><Input id="email" name="email" type="email" required />{formState.errors?.email && <p className="text-sm text-destructive">{formState.errors.email[0]}</p>}</div>
                        <div className="space-y-1"><Label htmlFor="phone">Phone Number (Optional)</Label><Input id="phone" name="phone" /></div>
                    </div>
                    <DialogFooter><Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button><SubmitButton /></DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}