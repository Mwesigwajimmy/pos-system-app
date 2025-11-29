'use client';

import { useEffect, useState, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';
import { createProjectAction, FormState } from '@/lib/professional-services/actions';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Check, ChevronsUpDown, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Customer { 
    id: string; 
    name: string; 
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="bg-slate-900 text-white">
            {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : 'Save Project'}
        </Button>
    );
}

export function CreateProjectModal() {
    const { toast } = useToast();
    const supabase = createClient();
    const [isOpen, setIsOpen] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    
    // Customer Selection State
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
    const [isFetchingCustomers, setIsFetchingCustomers] = useState(false);
    
    const [dueDate, setDueDate] = useState<Date | undefined>();
    
    const initialState: FormState = { success: false, message: '', errors: null };
    const [formState, formAction] = useFormState(createProjectAction, initialState);

    useEffect(() => {
        if (formState.message) {
            if (formState.success) {
                toast({ 
                    title: "Project Created", 
                    description: formState.message,
                    className: "bg-green-50 border-green-200"
                });
                setIsOpen(false);
                formRef.current?.reset();
                setSelectedCustomer('');
                setDueDate(undefined);
            } else if (!formState.errors) {
                toast({ 
                    title: "Action Failed", 
                    description: formState.message, 
                    variant: 'destructive' 
                });
            }
        }
    }, [formState, toast]);

    useEffect(() => {
        if (isOpen) {
            const fetchCustomers = async () => {
                setIsFetchingCustomers(true);
                const { data } = await supabase
                    .from('customers')
                    .select('id, name')
                    .eq('status', 'ACTIVE')
                    .order('name');
                if (data) setCustomers(data);
                setIsFetchingCustomers(false);
            };
            fetchCustomers();
        }
    }, [isOpen, supabase]);
    
    const selectedCustomerName = customers.find(c => c.id === selectedCustomer)?.name || "Select a client...";

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="shadow-sm">
                    <PlusCircle className="mr-2 h-4 w-4" /> New Project
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
                <form ref={formRef} action={formAction}>
                    <DialogHeader>
                        <DialogTitle>Create New Project</DialogTitle>
                        <DialogDescription>Define the scope and timeline for your new engagement.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm font-semibold">Project Name</Label>
                            <Input id="name" name="name" placeholder="e.g. Q3 Financial Audit" required />
                            {formState.errors?.name && <p className="text-xs text-red-500 font-medium">{formState.errors.name[0]}</p>}
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="customer_id" className="text-sm font-semibold">Client</Label>
                            <input type="hidden" name="customer_id" value={selectedCustomer} />
                            <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" aria-expanded={customerPopoverOpen} className="w-full justify-between font-normal">
                                        {isFetchingCustomers ? "Loading..." : selectedCustomerName}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search clients..." />
                                        <CommandList>
                                            <CommandEmpty>No client found.</CommandEmpty>
                                            <CommandGroup>
                                                {customers.map((c) => (
                                                    <CommandItem key={c.id} value={c.name} onSelect={() => { setSelectedCustomer(c.id); setCustomerPopoverOpen(false); }}>
                                                        <Check className={cn("mr-2 h-4 w-4", selectedCustomer === c.id ? "opacity-100" : "opacity-0")} />
                                                        {c.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            {formState.errors?.customerId && <p className="text-xs text-red-500 font-medium">{formState.errors.customerId[0]}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="due_date" className="text-sm font-semibold">Due Date (Optional)</Label>
                            <input type="hidden" name="due_date" value={dueDate ? format(dueDate, 'yyyy-MM-dd') : ''} />
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dueDate ? format(dueDate, "PPP") : <span>Pick a completion date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
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