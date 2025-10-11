// src/components/telecom/data/CreateWorkbookModal.tsx
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

// --- UI Component Imports ---
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Check, ChevronsUpDown, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';

// --- Type Definitions ---
interface Employee { id: string; full_name: string; }

// --- Form Validation Schema ---
const createWorkbookSchema = z.object({
    name: z.string().min(3, "Workbook name must be at least 3 characters."),
    // shared_with will be an array of user UUIDs
    shared_with: z.array(z.string()).min(1, "You must share with at least one employee."),
});

type WorkbookInput = z.infer<typeof createWorkbookSchema>;

export function CreateWorkbookModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const supabase = createClient();
    const queryClient = useQueryClient();

    // Fetch the list of employees to share with
    const { data: employees, isLoading: isLoadingEmployees } = useQuery({
        queryKey: ['allEmployees'],
        queryFn: async (): Promise<Employee[]> => {
            const { data, error } = await supabase.rpc('get_all_employees');
            if (error) throw new Error(error.message);
            return data || [];
        }
    });

    const form = useForm<WorkbookInput>({
        resolver: zodResolver(createWorkbookSchema),
        defaultValues: { name: '', shared_with: [] },
    });

    // --- Mutation to Create the Workbook ---
    const { mutate: createWorkbook, isPending } = useMutation({
        mutationFn: async (values: WorkbookInput) => {
            const { error } = await supabase.rpc('create_workbook_and_share', {
                p_name: values.name,
                p_user_ids: values.shared_with,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Workbook created and invitations sent!");
            queryClient.invalidateQueries({ queryKey: ['myWorkbooks'] });
            form.reset();
            onClose();
        },
        onError: (err: Error) => toast.error(`Error: ${err.message}`),
    });

    // --- THE FIX ---
    // Create an explicit onSubmit handler that receives the correctly typed data
    const onSubmit = (data: WorkbookInput) => {
        createWorkbook(data);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Create & Share New Workbook</DialogTitle>
                    <DialogDescription>Name the workbook and select employees to share it with. They will be notified.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <FormField name="name" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Workbook Name</FormLabel><FormControl><Input placeholder="e.g., Daily Sales Reconciliation - Q3" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />

                        {/* Multi-Select for Employees */}
                        <FormField name="shared_with" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel>Share With</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <div className="relative border rounded-md px-3 py-2 min-h-[40px]">
                                                <div className="flex flex-wrap gap-1">
                                                    {field.value.map(userId => (
                                                        <Badge key={userId} variant="secondary">
                                                            {employees?.find(e => e.id === userId)?.full_name}
                                                        </Badge>
                                                    ))}
                                                    {field.value.length === 0 && <span className="text-sm text-muted-foreground">Select employees...</span>}
                                                </div>
                                            </div>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search employees..." />
                                            <CommandEmpty>No employees found.</CommandEmpty>
                                            <CommandGroup>
                                                {employees?.map(employee => (
                                                    <CommandItem
                                                        key={employee.id}
                                                        value={employee.full_name}
                                                        onSelect={() => {
                                                            const currentSelection = form.getValues("shared_with");
                                                            const newSelection = currentSelection.includes(employee.id)
                                                                ? currentSelection.filter(id => id !== employee.id)
                                                                : [...currentSelection, employee.id];
                                                            form.setValue("shared_with", newSelection);
                                                        }}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", field.value.includes(employee.id) ? "opacity-100" : "opacity-0")} />
                                                        {employee.full_name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                            <Button type="submit" disabled={isPending || isLoadingEmployees}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Create & Share
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}