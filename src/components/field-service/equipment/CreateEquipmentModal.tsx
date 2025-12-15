'use client';

import { useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { PlusCircle, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { createEquipment, FormState } from '@/lib/actions/equipment';

// FIX 1: Define the Interface for the Props
interface TenantContext {
    tenantId: string;
    currency: string;
}

interface CreateEquipmentModalProps {
    tenant: TenantContext;
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Adding...</> : 'Add Equipment'}
        </Button>
    );
}

// FIX 2: Accept the props in the function signature
export function CreateEquipmentModal({ tenant }: CreateEquipmentModalProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [nextMaintenanceDate, setNextMaintenanceDate] = useState<Date | undefined>();
    
    const initialState: FormState = { success: false, message: '', errors: null };
    const [formState, formAction] = useFormState(createEquipment, initialState);

    useEffect(() => {
        if (formState.success) {
            toast({ title: "Success!", description: formState.message });
            setIsOpen(false);
            setNextMaintenanceDate(undefined);
            router.refresh(); 
        } else if (formState.message && !formState.errors) {
            toast({ title: "Error", description: formState.message, variant: "destructive" });
        }
    }, [formState, router, toast]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Equipment</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <form action={formAction}>
                    <DialogHeader>
                        <DialogTitle>Add New Equipment</DialogTitle>
                        <DialogDescription>Add a new vehicle, tool, or other asset to your inventory.</DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-6">
                        {/* 
                           FIX 3: Enterprise Security 
                           Pass the tenant_id as a hidden input so the Server Action knows 
                           which organization this equipment belongs to.
                        */}
                        <input type="hidden" name="tenant_id" value={tenant.tenantId} />

                        {/* Name Field */}
                        <div className="space-y-1">
                            <Label htmlFor="name">Equipment Name</Label>
                            <Input id="name" name="name" placeholder="e.g., Service Van #4" required />
                            {formState.errors?.name && <p className="text-sm text-destructive font-medium">{formState.errors.name[0]}</p>}
                        </div>

                        {/* Type and Serial */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="type">Type</Label>
                                <Input id="type" name="type" placeholder="e.g., Vehicle" />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="serial_number">Serial # (Optional)</Label>
                                <Input id="serial_number" name="serial_number" />
                            </div>
                        </div>

                        {/* Date Picker */}
                        <div className="space-y-1">
                            <Label htmlFor="next_maintenance_date">Next Maintenance</Label>
                            <input type="hidden" name="next_maintenance_date" value={nextMaintenanceDate ? format(nextMaintenanceDate, 'yyyy-MM-dd') : ''} />
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !nextMaintenanceDate && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {nextMaintenanceDate ? format(nextMaintenanceDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={nextMaintenanceDate} onSelect={setNextMaintenanceDate} initialFocus />
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