'use client';

import { useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { 
    PlusCircle, 
    Check, 
    ChevronsUpDown, 
    Headset,
    Loader2
} from 'lucide-react';

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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';

// Import the real server action and its state type
import { createSupportTicket, FormState } from '@/lib/crm/actions/support';

interface Customer { id: string; name: string; }
interface Employee { id: string; full_name: string; }

interface CreateTicketModalProps {
    employees: Employee[];
    currentBusinessId: string;
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button 
            type="submit" 
            disabled={pending} 
            className="bg-blue-600 hover:bg-blue-700 text-sm font-semibold px-8 shadow-sm"
        >
            {pending ? (
                <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                </span>
            ) : (
                'Create Ticket'
            )}
        </Button>
    );
}

export function CreateTicketModal({ employees, currentBusinessId }: CreateTicketModalProps) {
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
                .from('crm_contacts')
                .select('id, full_name')
                .ilike('full_name', `%${customerSearch}%`)
                .limit(10);
            
            const mappedData = data?.map(d => ({ id: d.id, name: d.full_name })) || [];
            setCustomers(mappedData);
        };
        fetchCustomers();
    }, [customerSearch, supabase]);
    
    useEffect(() => {
        if (formState.success) {
            toast({
                title: "Success",
                description: "The support ticket has been created successfully.",
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
                <Button className="bg-blue-600 hover:bg-blue-700 text-sm font-semibold gap-2 h-10 px-5 shadow-sm">
                    <PlusCircle className="h-4 w-4" />
                    New Ticket
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border border-slate-200 rounded-xl shadow-xl bg-white outline-none">
                <form action={formAction} className="flex flex-col h-full bg-white">
                    {/* CLEAN PROFESSIONAL HEADER */}
                    <DialogHeader className="px-8 py-6 border-b border-slate-100 shrink-0">
                        <div className="flex items-center gap-4">
                             <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
                                <Headset className="text-blue-600" size={22} />
                             </div>
                             <div className="space-y-0.5">
                                <DialogTitle className="text-lg font-bold text-slate-900 tracking-tight">Create Support Ticket</DialogTitle>
                                <DialogDescription className="text-slate-500 text-xs font-medium">
                                    Fill in the details below to open a new support request.
                                </DialogDescription>
                             </div>
                        </div>
                    </DialogHeader>

                    {/* HIDDEN LOGISTICS */}
                    <input type="hidden" name="business_id" value={currentBusinessId} />
                    <input type="hidden" name="contact_id" value={selectedCustomer} />

                    <ScrollArea className="max-h-[65vh]">
                        <div className="p-8 space-y-8">
                            
                            {/* SECTION 1: CUSTOMER SELECTION */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider">1. Customer Information</h3>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">Select Customer</Label>
                                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                                        <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className={cn("w-full h-10 justify-between text-sm font-medium border-slate-200", !selectedCustomer && "text-slate-400")}
                                        >
                                            {selectedCustomer ? customers.find((c) => c.id === selectedCustomer)?.name : "Search for a customer..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[534px] p-0 z-[11000]">
                                        <Command>
                                            <CommandInput placeholder="Search name..." onValueChange={setCustomerSearch} className="text-sm font-medium" />
                                            <CommandEmpty className="text-xs font-medium py-6 text-slate-500">No customer found.</CommandEmpty>
                                            <CommandGroup>
                                            {customers.map((customer) => (
                                                <CommandItem
                                                    value={customer.name}
                                                    key={customer.id}
                                                    onSelect={() => {
                                                        setSelectedCustomer(customer.id);
                                                        setPopoverOpen(false);
                                                    }}
                                                    className="font-medium text-sm"
                                                >
                                                <Check className={cn("mr-2 h-4 w-4 text-blue-600", customer.id === selectedCustomer ? "opacity-100" : "opacity-0")} />
                                                {customer.name}
                                                </CommandItem>
                                            ))}
                                            </CommandGroup>
                                        </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            {/* SECTION 2: ISSUE DETAILS */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider">2. Issue Description</h3>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="subject" className="text-xs font-semibold text-slate-700">Ticket Subject</Label>
                                        <Input id="subject" name="subject" placeholder="Brief summary of the issue" required className="h-10 text-sm font-medium border-slate-200" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="description" className="text-xs font-semibold text-slate-700">Detailed Description</Label>
                                        <Textarea id="description" name="description" placeholder="Please provide full details of the issue..." className="min-h-[120px] text-sm font-medium border-slate-200" required />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: ASSIGNMENT & COST */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider">3. Assignment & Budget</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-700">Assigned Agent</Label>
                                        <Select name="assigned_to" required>
                                            <SelectTrigger className="h-10 text-sm font-medium border-slate-200">
                                                <SelectValue placeholder="Select Agent" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {employees.map(emp => (
                                                    <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-700">Est. Cost</Label>
                                            <Input name="estimated_cost" type="number" step="0.01" placeholder="0.00" className="h-10 text-sm font-bold border-slate-200" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-700">Currency</Label>
                                            <Select name="currency_code" defaultValue="UGX">
                                                <SelectTrigger className="h-10 text-sm font-bold border-slate-200">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="UGX">UGX</SelectItem>
                                                    <SelectItem value="KES">KES</SelectItem>
                                                    <SelectItem value="USD">USD</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 4: PRIORITY */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider">4. Priority Level</h3>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">Urgency</Label>
                                    <Select name="priority" defaultValue="MEDIUM">
                                        <SelectTrigger className="h-10 text-sm font-bold border-slate-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="LOW">Low (Routine)</SelectItem>
                                            <SelectItem value="MEDIUM" className="text-blue-600">Medium (Standard)</SelectItem>
                                            <SelectItem value="HIGH" className="text-orange-600">High (Action Required)</SelectItem>
                                            <SelectItem value="URGENT" className="text-red-600 font-bold">Urgent (Critical)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="px-8 py-5 bg-slate-50 border-t shrink-0 flex items-center justify-between">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => setIsOpen(false)} 
                            className="text-xs font-bold text-slate-500 hover:text-slate-900"
                        >
                            Cancel
                        </Button>
                        <SubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}