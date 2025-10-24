'use client';

import { useEffect, useState, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';
import { uploadDocumentAction, FormState } from '@/lib/professional-services/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { UploadCloud, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Customer { id: string; name: string; }

function SubmitButton() {
    const { pending } = useFormStatus();
    return <Button type="submit" disabled={pending}>{pending ? 'Uploading...' : 'Upload File'}</Button>;
}

export function UploadDocumentModal({ parentId }: { parentId: string | null }) {
    const { toast } = useToast();
    const supabase = createClient();
    const [isOpen, setIsOpen] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);

    const initialState: FormState = { success: false, message: '', errors: null };
    const uploadDocumentWithParent = uploadDocumentAction.bind(null, parentId);
    const [formState, formAction] = useFormState(uploadDocumentWithParent, initialState);

     useEffect(() => {
        if (formState.message) {
            if (formState.success) {
                toast({ title: "Success!", description: formState.message });
                setIsOpen(false);
                formRef.current?.reset();
                setSelectedCustomer('');
            } else {
                toast({ title: "Error", description: formState.message, variant: 'destructive' });
            }
        }
    }, [formState, toast]);

    useEffect(() => {
        if (isOpen) {
            const fetchCustomers = async () => {
                const { data } = await supabase.from('customers').select('id, name').order('name');
                if (data) setCustomers(data);
            };
            fetchCustomers();
        }
    }, [isOpen, supabase]);
    
    const selectedCustomerName = customers.find(c => c.id === selectedCustomer)?.name || "Select a client...";

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button><UploadCloud className="mr-2 h-4 w-4" /> Upload Document</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form ref={formRef} action={formAction}>
                    <DialogHeader>
                        <DialogTitle>Upload Document</DialogTitle>
                        <DialogDescription>Select a file and optionally link it to a client.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-1">
                            <Label htmlFor="file">File</Label>
                            <Input id="file" name="file" type="file" required />
                        </div>
                         <div className="space-y-1">
                            <Label htmlFor="customer_id">Link to Client (Optional)</Label>
                            <input type="hidden" name="customer_id" value={selectedCustomer} />
                            <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                                        {selectedCustomerName}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search clients..." />
                                        <CommandEmpty>No client found.</CommandEmpty>
                                        <CommandGroup>{customers.map((c) => (<CommandItem key={c.id} value={c.name} onSelect={() => { setSelectedCustomer(c.id); setCustomerPopoverOpen(false); }}><Check className={cn("mr-2 h-4 w-4", selectedCustomer === c.id ? "opacity-100" : "opacity-0")} />{c.name}</CommandItem>))}</CommandGroup>
                                    </Command>
                                </PopoverContent>
                            </Popover>
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