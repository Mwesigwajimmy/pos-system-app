'use client';

import { useEffect, useState, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import { logBillableTime, FormState } from '@/lib/professional-services/actions';
import { useToast } from '@/components/ui/use-toast';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Clock, ChevronsUpDown, Check } from "lucide-react";
import { cn } from '@/lib/utils';

interface Customer { id: string; name: string; }

function SubmitButton() {
    const { pending } = useFormStatus();
    return <Button type="submit" className="w-full" disabled={pending}>{pending ? 'Logging...' : 'Log Billable Time'}</Button>;
}

export function TimeLogWidget() {
    const { toast } = useToast();
    const supabase = createClient();
    const formRef = useRef<HTMLFormElement>(null);
    
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [popoverOpen, setPopoverOpen] = useState(false);
    
    const initialState: FormState = { success: false, message: '', errors: null };
    const [formState, formAction] = useFormState(logBillableTime, initialState);

    useEffect(() => {
        const fetchCustomers = async () => {
            const { data } = await supabase.from('customers').select('id, name').order('name');
            if (data) setCustomers(data);
        };
        fetchCustomers();
    }, [supabase]);

    useEffect(() => {
        if (formState.message) {
            if (formState.success) {
                toast({ title: "Success!", description: formState.message });
                formRef.current?.reset();
                setSelectedCustomer('');
            } else if (!formState.errors) {
                toast({ title: "Error", description: formState.message, variant: 'destructive' });
            }
        }
    }, [formState, toast]);
    
    const selectedCustomerName = customers.find(c => c.id === selectedCustomer)?.name || "Select a client...";

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><Clock className="mr-2 h-5 w-5" /> Quick Time Log</CardTitle>
                <CardDescription>Log billable work instantly.</CardDescription>
            </CardHeader>
            <CardContent>
                <form ref={formRef} action={formAction} className="space-y-4">
                    <div className="space-y-1">
                        <Label htmlFor="customer_id">Client</Label>
                        <input type="hidden" name="customer_id" value={selectedCustomer} />
                        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" aria-expanded={popoverOpen} className="w-full justify-between font-normal">
                                    {selectedCustomerName}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Search clients..." />
                                    <CommandEmpty>No client found.</CommandEmpty>
                                    <CommandGroup>
                                        {customers.map((c) => (
                                            <CommandItem key={c.id} value={c.name} onSelect={() => { setSelectedCustomer(c.id); setPopoverOpen(false); }}>
                                                <Check className={cn("mr-2 h-4 w-4", selectedCustomer === c.id ? "opacity-100" : "opacity-0")} />
                                                {c.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </Command>
                            </PopoverContent>
                        </Popover>
                         {formState.errors?.customerId && <p className="text-sm text-destructive mt-1">{formState.errors.customerId[0]}</p>}
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="hours">Hours</Label>
                        <Input id="hours" name="hours" type="number" step="0.1" placeholder="e.g., 1.5" required />
                         {formState.errors?.hours && <p className="text-sm text-destructive mt-1">{formState.errors.hours[0]}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="description">Description of Work</Label>
                        <Input id="description" name="description" placeholder="e.g., Drafted initial contract" required />
                         {formState.errors?.description && <p className="text-sm text-destructive mt-1">{formState.errors.description[0]}</p>}
                    </div>
                    <SubmitButton />
                </form>
            </CardContent>
        </Card>
    );
}
