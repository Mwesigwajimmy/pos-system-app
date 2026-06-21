'use client';

import { useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { 
    PlusCircle, 
    Check, 
    ChevronsUpDown, 
    LifeBuoy, 
    User, 
    Clock, 
    AlertTriangle, 
    Coins, 
    ShieldAlert,
    MessageSquare,
    Headset
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
        <Button type="submit" disabled={pending} className="bg-blue-600 hover:bg-blue-700 font-black text-[10px] uppercase tracking-widest px-8 shadow-lg shadow-blue-100">
            {pending ? 'Initializing Resolution...' : 'Deploy Support Ticket'}
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
                .from('crm_contacts') // Using the crm_contacts intelligence table
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
                title: "Forensic Ticket Created",
                description: formState.message,
            });
            setIsOpen(false);
            setSelectedCustomer('');
            router.refresh();
        } else if (formState.message && !formState.errors) {
            toast({
                title: "Resolution Conflict",
                description: formState.message,
                variant: "destructive",
            });
        }
    }, [formState, router, toast]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 font-black text-[10px] uppercase tracking-widest gap-2 h-10 px-6 shadow-lg shadow-blue-200">
                    <PlusCircle className="h-4 w-4" />
                    New Ticket
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden border-none rounded-xl shadow-2xl">
                <form action={formAction} className="flex flex-col h-full bg-white">
                    {/* ENTERPRISE HEADER */}
                    <DialogHeader className="px-8 py-6 bg-slate-900 text-white shrink-0">
                        <div className="flex items-center gap-3">
                             <div className="h-10 w-10 bg-white/10 rounded-lg flex items-center justify-center">
                                <Headset className="text-blue-400" size={24} />
                             </div>
                             <div>
                                <DialogTitle className="text-xl font-bold tracking-tight">Support Resolution Intelligence</DialogTitle>
                                <DialogDescription className="text-slate-400 text-xs font-medium">
                                    Register a forensic support record for deep client resolution.
                                </DialogDescription>
                             </div>
                        </div>
                    </DialogHeader>

                    {/* HIDDEN LOGISTICS */}
                    <input type="hidden" name="business_id" value={currentBusinessId} />
                    <input type="hidden" name="contact_id" value={selectedCustomer} />

                    <ScrollArea className="max-h-[70vh]">
                        <div className="p-8 space-y-8">
                            
                            {/* SECTION 1: IDENTITY */}
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">1. Client Identity</Label>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500">Target Client / Customer</Label>
                                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                                        <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className={cn("w-full h-10 justify-between font-semibold border-slate-200", !selectedCustomer && "text-slate-400")}
                                        >
                                            {selectedCustomer ? customers.find((c) => c.id === selectedCustomer)?.name : "Search for a client record..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[580px] p-0 z-[11000]">
                                        <Command>
                                            <CommandInput placeholder="Search client DNA..." onValueChange={setCustomerSearch} className="font-semibold" />
                                            <CommandEmpty className="text-xs font-bold py-6 text-slate-400">No forensic record found.</CommandEmpty>
                                            <CommandGroup>
                                            {customers.map((customer) => (
                                                <CommandItem
                                                    value={customer.name}
                                                    key={customer.id}
                                                    onSelect={() => {
                                                        setSelectedCustomer(customer.id);
                                                        setPopoverOpen(false);
                                                    }}
                                                    className="font-bold text-sm"
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

                            {/* SECTION 2: ISSUE INTEL */}
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">2. Issue Intelligence</Label>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="subject" className="text-xs font-bold text-slate-500">Ticket Subject</Label>
                                        <Input id="subject" name="subject" placeholder="e.g. POS Sync failure at Kampala Branch" required className="h-10 font-semibold" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="description" className="text-xs font-bold text-slate-500">Forensic Description</Label>
                                        <Textarea id="description" name="description" placeholder="Describe the technical or business issue in detail..." className="min-h-[120px] font-medium text-sm" required />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: ASSIGNMENT & FINANCIALS */}
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">3. Assignment & Financials</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-500">Assigned Technician / Agent</Label>
                                        <Select name="assigned_to" required>
                                            <SelectTrigger className="h-10 font-semibold">
                                                <SelectValue placeholder="Assign Agent" />
                                            </SelectTrigger>
                                            <SelectContent className="font-semibold">
                                                {employees.map(emp => (
                                                    <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold text-slate-500">Est. Cost</Label>
                                            <Input name="estimated_cost" type="number" step="0.01" placeholder="0.00" className="h-10 font-black text-slate-900" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold text-slate-500">Currency</Label>
                                            <Select name="currency_code" defaultValue="UGX">
                                                <SelectTrigger className="h-10 font-bold">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="font-bold">
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
                                <Label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">4. Criticality Status</Label>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500">Priority Level</Label>
                                    <Select name="priority" defaultValue="MEDIUM">
                                        <SelectTrigger className="h-10 font-bold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="font-bold">
                                            <SelectItem value="LOW" className="text-slate-400">Low (Routine)</SelectItem>
                                            <SelectItem value="MEDIUM" className="text-blue-600">Medium (Standard)</SelectItem>
                                            <SelectItem value="HIGH" className="text-orange-600">High (Operational Risk)</SelectItem>
                                            <SelectItem value="URGENT" className="text-red-600 font-black">Urgent (Critical Failure)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="px-8 py-6 bg-slate-50 border-t shrink-0 flex items-center justify-between">
                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="font-bold text-[10px] uppercase text-slate-400 hover:text-red-500">
                            Abort Ticket
                        </Button>
                        <SubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}