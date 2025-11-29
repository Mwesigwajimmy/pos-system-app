'use client';

import { useEffect, useState, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useToast } from '@/components/ui/use-toast';
import { createFolderAction } from '@/lib/professional-services/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FolderPlus, Loader2 } from 'lucide-react';

// Shared type definition
interface FormState {
    success: boolean;
    message: string;
    errors?: any;
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Creating...</> : 'Create Folder'}
        </Button>
    );
}

export function CreateFolderModal({ parentId }: { parentId: string | null }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const initialState: FormState = { success: false, message: '', errors: null };
    
    // We bind parentId to the action so it's available on the server
    const createFolderWithParent = createFolderAction.bind(null, parentId);
    const [formState, formAction] = useFormState(createFolderWithParent, initialState);

    useEffect(() => {
        if (formState.message) {
            if (formState.success) {
                toast({ title: "Folder Created", description: formState.message });
                setIsOpen(false);
                formRef.current?.reset();
            } else if (!formState.errors) {
                toast({ title: "Error", description: formState.message, variant: 'destructive' });
            }
        }
    }, [formState, toast]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-dashed">
                    <FolderPlus className="mr-2 h-4 w-4" /> New Folder
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form ref={formRef} action={formAction}>
                    <DialogHeader>
                        <DialogTitle>Create New Folder</DialogTitle>
                        <DialogDescription>Organize your documents by creating a new folder.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Folder Name</Label>
                            <Input id="name" name="name" placeholder="e.g. Legal Contracts" required />
                            {formState.errors?.name && (
                                <p className="text-sm text-red-600 mt-1 flex items-center">
                                    <span className="w-1 h-1 bg-red-600 rounded-full mr-2"/>
                                    {formState.errors.name[0]}
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <SubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}