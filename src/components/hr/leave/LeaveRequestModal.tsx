'use client';

import { useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, PlusCircle } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { createLeaveRequest, FormState } from '@/lib/hr/actions/leave';

// Define the shape of a leave type object
interface LeaveType {
    id: string;
    name: string;
}

interface LeaveRequestModalProps {
    leaveTypes: LeaveType[];
    employeeId: string;
}

// A dedicated Submit Button that shows a pending state
function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? 'Submitting...' : 'Submit Request'}
        </Button>
    );
}


export function LeaveRequestModal({ leaveTypes, employeeId }: LeaveRequestModalProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [date, setDate] = useState<DateRange | undefined>(undefined);

    // Initial state for the form
    const initialState: FormState = { success: false, message: '', errors: null };
    const [formState, formAction] = useFormState(createLeaveRequest, initialState);

    // Effect to handle post-submission logic (toast, closing modal, etc.)
    useEffect(() => {
        if (formState.success) {
            toast({
                title: "Success!",
                description: formState.message,
            });
            setIsOpen(false); // Close the modal
            setDate(undefined); // Reset local state
            router.refresh(); // Refresh page data
        } else if (formState.message && !formState.errors) {
            // Show general errors (like date mismatch) that aren't tied to a specific field
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
                    Request Leave
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                {/* The form now directly calls the server action */}
                <form action={formAction}>
                    <DialogHeader>
                        <DialogTitle>New Leave Request</DialogTitle>
                        <DialogDescription>
                            Fill out the form below to request time off. Your manager will be notified.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Hidden input for employee_id */}
                    <input type="hidden" name="employee_id" value={employeeId} />

                    <div className="grid gap-4 py-4">
                        <div className="space-y-1">
                             <Label htmlFor="leave_type_id">Leave Type</Label>
                             <Select name="leave_type_id" required>
                                <SelectTrigger id="leave_type_id">
                                    <SelectValue placeholder="Select a type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {leaveTypes.map((type) => (
                                        <SelectItem key={type.id} value={type.id}>
                                            {type.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {formState.errors?.leave_type_id && (
                                <p className="text-sm text-destructive">{formState.errors.leave_type_id[0]}</p>
                            )}
                        </div>

                        <div className="space-y-1">
                             <Label htmlFor="dates">Dates</Label>
                            <input type="hidden" name="start_date" value={date?.from ? format(date.from, 'yyyy-MM-dd') : ''} />
                            <input type="hidden" name="end_date" value={date?.to ? format(date.to, 'yyyy-MM-dd') : ''} />
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="dates"
                                        variant={"outline"}
                                        className={cn( "w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date?.from ? ( date.to ? (<> {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")} </>) : (format(date.from, "LLL dd, y"))) : (<span>Pick a date range</span>)}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={1} />
                                </PopoverContent>
                            </Popover>
                             {(formState.errors?.start_date || formState.errors?.end_date) && (
                                <p className="text-sm text-destructive">Please select a valid date range.</p>
                            )}
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="reason">Reason (Optional)</Label>
                            <Textarea
                                id="reason"
                                name="reason"
                                placeholder="Provide a brief reason for your request"
                            />
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