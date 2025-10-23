'use client';

import { useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { PlusCircle, Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';

// Import the real server action and its state type
import { createSupportTicket, FormState } from '@/lib/crm/actions/support';

interface Customer { id: string; name: string; }

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? 'Creating Ticket...' : 'Create Ticket'}
        </Button>
    );
}

export function CreateTicketModal() {
    const router = useRouter();
    const { toast } = useToast();
    const supabase = createClient();
    
    const [isOpen, setIsOpen] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [customerSearch, setCustomerSearch] = useState('');
    const [popoverOpen, setPopoverOpen] = useState(false);

    const initialState: FormState = { success: false, message: '', errors: null };
    const [formState, formAction] = useFormState(createSupportTicket, initialState);

    // Fetch customers based on search query
    useEffect(() => {
        const fetchCustomers = async () => {
            const { data } = await supabase
                .from('customers')
                .select('id, name')
                .ilike('name', `%${customerSearch}%`)
                .limit(10);
            setCustomers(data || []);
        };
        fetchCustomers();
    }, [customerSearch, supabase]);
    
    useEffect(() => {
        if (formState.success) {
            toast({
                title: "Success!",
                description: formState.message,
            });
            setIsOpen(false);
            setSelectedCustomer('');
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
                    New Ticket
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <form action={formAction}>
                    <DialogHeader>
                        <DialogTitle>Create New Support Ticket</DialogTitle>
                        <DialogDescription>
                            Create a new ticket on behalf of a customer.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-6">
                        <div className="space-y-1">
                            <Label htmlFor="customer_id">Customer</Label>
                             <input type="hidden" name="customer_id" value={selectedCustomer} />
                             <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                                <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={popoverOpen}
                                    className={cn("w-full justify-between", !selectedCustomer && "text-muted-foreground")}
                                >
                                    {selectedCustomer ? customers.find((c) => c.id === selectedCustomer)?.name : "Select customer..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[550px] p-0">
                                <Command>
                                    <CommandInput placeholder="Search customers..." onValueChange={setCustomerSearch} />
                                    <CommandEmpty>No customer found.</CommandEmpty>
                                    <CommandGroup>
                                    {customers.map((customer) => (
                                        <CommandItem
                                            value={customer.name}
                                            key={customer.id}
                                            onSelect={() => {
                                                setSelectedCustomer(customer.id);
                                                setPopoverOpen(false);
                                            }}
                                        >
                                        <Check className={cn("mr-2 h-4 w-4", customer.id === selectedCustomer ? "opacity-100" : "opacity-0")} />
                                        {customer.name}
                                        </CommandItem>
                                    ))}
                                    </CommandGroup>
                                </Command>
                                </PopoverContent>
                            </Popover>
                             {formState.errors?.customer_id && (
                                <p className="text-sm text-destructive">{formState.errors.customer_id[0]}</p>
                            )}
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="subject">Subject</Label>
                            <Input id="subject" name="subject" placeholder="e.g., Issue with recent order #12345" required />
                             {formState.errors?.subject && (
                                <p className="text-sm text-destructive">{formState.errors.subject[0]}</p>
                            )}
                        </div>
                        
                        <div className="space-y-1">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="Provide a detailed description of the customer's issue."
                                className="min-h-[120px]"
                                required
                            />
                             {formState.errors?.description && (
                                <p className="text-sm text-destructive">{formState.errors.description[0]}</p>
                            )}
                        </div>

                         <div className="space-y-1">
                            <Label htmlFor="priority">Priority</Label>
                            <Select name="priority" defaultValue="MEDIUM">
                                <SelectTrigger>
                                    <SelectValue placeholder="Set a priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LOW">Low</SelectItem>
                                    <SelectItem value="MEDIUM">Medium</SelectItem>
                                    <SelectItem value="HIGH">High</SelectItem>
                                    <SelectItem value="URGENT">Urgent</SelectItem>
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