'use client';

import { useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { PlusCircle, Check, ChevronsUpDown, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';
import { createWorkOrder, FormState } from '@/lib/field-service/actions/work_orders';

interface Customer { id: string; name: string; }
function SubmitButton() {
    const { pending } = useFormStatus();
    return <Button type="submit" disabled={pending}>{pending ? 'Creating...' : 'Create Work Order'}</Button>;
}

export function CreateWorkOrderModal() {
    const router = useRouter();
    const { toast } = useToast();
    const supabase = createClient();
    const [isOpen, setIsOpen] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [scheduledDate, setScheduledDate] = useState<Date | undefined>(new Date());
    const initialState: FormState = { success: false, message: '', errors: null };
    const [formState, formAction] = useFormState(createWorkOrder, initialState);

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
            router.refresh();
        } else if (formState.message && !formState.errors) {
            toast({ title: "Error", description: formState.message, variant: "destructive" });
        }
    }, [formState, router, toast]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" /> New Work Order</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <form action={formAction}>
                    <DialogHeader>
                        <DialogTitle>Create New Work Order</DialogTitle>
                        <DialogDescription>Schedule a new job for a customer.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-6">
                        <div className="space-y-1">
                            <Label htmlFor="summary">Summary</Label>
                            <Input id="summary" name="summary" placeholder="e.g., Annual HVAC Service" required />
                            {formState.errors?.summary && <p className="text-sm text-destructive">{formState.errors.summary[0]}</p>}
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
                            {formState.errors?.customer_id && <p className="text-sm text-destructive">{formState.errors.customer_id[0]}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="scheduled_date">Scheduled Date</Label>
                                <input type="hidden" name="scheduled_date" value={scheduledDate ? format(scheduledDate, 'yyyy-MM-dd') : ''} />
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !scheduledDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {scheduledDate ? format(scheduledDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={scheduledDate} onSelect={setScheduledDate} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                             <div className="space-y-1">
                                <Label htmlFor="priority">Priority</Label>
                                <Select name="priority" defaultValue="MEDIUM">
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LOW">Low</SelectItem>
                                        <SelectItem value="MEDIUM">Medium</SelectItem>
                                        <SelectItem value="HIGH">High</SelectItem>
                                        <SelectItem value="URGENT">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
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