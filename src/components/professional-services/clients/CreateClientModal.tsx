'use client';

import { useEffect, useState, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import toast from 'react-hot-toast';
import { createClientAction, FormState } from '@/lib/professional-services/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Loader2 } from 'lucide-react';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? <><Loader2 className="w-4 h-4 animate-spin mr-2"/> Saving...</> : 'Save Client'}
        </Button>
    );
}

export function CreateClientModal() {
    const [isOpen, setIsOpen] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const initialState: FormState = { success: false, message: '', errors: null };
    
    const [formState, formAction] = useFormState(createClientAction, initialState);

    useEffect(() => {
        if (formState.message) {
            if (formState.success) {
                toast.success(formState.message);
                setIsOpen(false);
                formRef.current?.reset();
            } else if (!formState.errors) {
                toast.error(formState.message);
            }
        }
    }, [formState]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                    <PlusCircle className="mr-2 h-4 w-4" /> New Client
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form ref={formRef} action={formAction}>
                    <DialogHeader>
                        <DialogTitle>Add New Client</DialogTitle>
                        <DialogDescription>Enter the details for your new client entity.</DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name / Company</Label>
                            <Input id="name" name="name" required placeholder="e.g. Acme Industries" />
                            {formState.errors?.name && <p className="text-xs text-red-500">{formState.errors.name[0]}</p>}
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input id="email" name="email" type="email" required placeholder="contact@acme.com" />
                            {formState.errors?.email && <p className="text-xs text-red-500">{formState.errors.email[0]}</p>}
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number (Optional)</Label>
                            <Input id="phone" name="phone" placeholder="+1 (555) 000-0000" />
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <SubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}