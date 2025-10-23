'use client';

import { useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { PlusCircle, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { costTypes } from './JobCostsList';

// Import the real server action and its state type
import { addJobCost, FormState } from '@/lib/contractor/actions/jobs';


interface AddCostModalProps {
    projectId: string;
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? 'Adding Cost...' : 'Add Cost'}
        </Button>
    );
}

export function AddCostModal({ projectId }: AddCostModalProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [transactionDate, setTransactionDate] = useState<Date | undefined>(new Date());

    const initialState: FormState = { success: false, message: '', errors: null };
    const [formState, formAction] = useFormState(addJobCost, initialState);

    useEffect(() => {
        if (formState.success) {
            toast({ title: "Success!", description: formState.message });
            setIsOpen(false);
            setTransactionDate(new Date());
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
                    Add New Cost
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form action={formAction}>
                    <DialogHeader>
                        <DialogTitle>Add Cost to Job</DialogTitle>
                        <DialogDescription>
                            Log a new expense against this project.
                        </DialogDescription>
                    </DialogHeader>

                    <input type="hidden" name="project_id" value={projectId} />

                    <div className="grid gap-4 py-6">
                         <div className="space-y-1">
                            <Label htmlFor="description">Description</Label>
                            <Input id="description" name="description" placeholder="e.g., Lumber from Home Depot" required />
                            {formState.errors?.description && <p className="text-sm text-destructive">{formState.errors.description[0]}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="amount">Amount ($)</Label>
                                <Input id="amount" name="amount" type="number" step="0.01" placeholder="e.g., 250.75" required />
                                {formState.errors?.amount && <p className="text-sm text-destructive">{formState.errors.amount[0]}</p>}
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="cost_type">Cost Type</Label>
                                <Select name="cost_type" defaultValue="MATERIAL" required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {costTypes.map(type => (
                                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                         <div className="space-y-1">
                            <Label htmlFor="transaction_date">Transaction Date</Label>
                            <input type="hidden" name="transaction_date" value={transactionDate ? format(transactionDate, 'yyyy-MM-dd') : ''} />
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !transactionDate && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {transactionDate ? format(transactionDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={transactionDate} onSelect={setTransactionDate} initialFocus />
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