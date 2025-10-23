'use client';

import { useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { PlusCircle, Check, ChevronsUpDown, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from '@/components/ui/command';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';

// Import the real server action and its state type
import { createContractorJob, FormState } from '@/lib/contractor/actions/jobs';

interface Customer { id: string; name: string; }

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? 'Creating Job...' : 'Create Job'}
        </Button>
    );
}

export function CreateJobModal() {
    const router = useRouter();
    const { toast } = useToast();
    const supabase = createClient();
    
    const [isOpen, setIsOpen] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [startDate, setStartDate] = useState<Date | undefined>();

    const initialState: FormState = { success: false, message: '', errors: null };
    const [formState, formAction] = useFormState(createContractorJob, initialState);

    useEffect(() => {
        if (isOpen) {
            const fetchCustomers = async () => {
                const { data } = await supabase.from('customers').select('id, name').limit(10);
                if (data) setCustomers(data);
            };
            fetchCustomers();
        }
    }, [isOpen, supabase]);
    
    useEffect(() => {
        if (formState.success) {
            toast({ title: "Success!", description: formState.message });
            setIsOpen(false);
            setSelectedCustomer('');
            setStartDate(undefined);
            router.refresh();
        } else if (formState.message && !formState.errors) {
            toast({ title: "Error", description: formState.message, variant: "destructive" });
        }
    }, [formState, router, toast]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Job
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <form action={formAction}>
                    <DialogHeader>
                        <DialogTitle>Create New Job</DialogTitle>
                        <DialogDescription>
                            Enter the initial details for this project. You can add costs later.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-6">
                        <div className="space-y-1">
                            <Label htmlFor="name">Job Name / Title</Label>
                            <Input id="name" name="name" placeholder="e.g., 123 Main St. Kitchen Remodel" required />
                            {formState.errors?.name && <p className="text-sm text-destructive">{formState.errors.name[0]}</p>}
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="customer_id">Customer</Label>
                             <input type="hidden" name="customer_id" value={selectedCustomer} />
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className={cn("w-full justify-between", !selectedCustomer && "text-muted-foreground")}>
                                    {selectedCustomer ? customers.find((c) => c.id === selectedCustomer)?.name : "Select a customer"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[450px] p-0">
                                <Command>
                                    <CommandInput placeholder="Search customers..." />
                                    <CommandEmpty>No customer found.</CommandEmpty>
                                    <CommandGroup>
                                    {customers.map((c) => (
                                        <CommandItem value={c.name} key={c.id} onSelect={() => setSelectedCustomer(c.id)}>
                                        <Check className={cn("mr-2 h-4 w-4", c.id === selectedCustomer ? "opacity-100" : "opacity-0")} />
                                        {c.name}
                                        </CommandItem>
                                    ))}
                                    </CommandGroup>
                                </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1">
                                <Label htmlFor="estimated_budget">Estimated Budget</Label>
                                <Input id="estimated_budget" name="estimated_budget" type="number" step="0.01" placeholder="e.g., 25000" />
                            </div>
                             <div className="space-y-1">
                                <Label htmlFor="start_date">Start Date</Label>
                                <input type="hidden" name="start_date" value={startDate ? format(startDate, 'yyyy-MM-dd') : ''} />
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
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