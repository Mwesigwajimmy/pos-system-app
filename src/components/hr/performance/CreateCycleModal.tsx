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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

// Import the real server action and its state type
import { createPerformanceCycle, FormState } from '@/lib/hr/actions/performance';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? 'Creating Cycle...' : 'Create Cycle'}
        </Button>
    );
}

export function CreateCycleModal() {
    const router = useRouter();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [date, setDate] = useState<DateRange | undefined>(undefined);

    const initialState: FormState = { success: false, message: '', errors: null };
    const [formState, formAction] = useFormState(createPerformanceCycle, initialState);

    useEffect(() => {
        if (formState.success) {
            toast({
                title: "Success!",
                description: formState.message,
            });
            setIsOpen(false);
            setDate(undefined);
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
                    New Review Cycle
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form action={formAction}>
                    <DialogHeader>
                        <DialogTitle>New Performance Cycle</DialogTitle>
                        <DialogDescription>
                            Define the name and date range for this review cycle.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-6">
                        <div className="space-y-1">
                            <Label htmlFor="name">Cycle Name</Label>
                            <Input id="name" name="name" placeholder="e.g., Q4 2025 Performance Review" required />
                            {formState.errors?.name && (
                                <p className="text-sm text-destructive">{formState.errors.name[0]}</p>
                            )}
                        </div>

                        <div className="space-y-1">
                             <Label htmlFor="dates">Review Period</Label>
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
                                        {date?.from ? ( date.to ? (<> {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")} </>) : (format(date.from, "LLL dd, y"))) : (<span>Pick the review period</span>)}
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