// src/components/core/CreateWorkbookModal.tsx
'use client';

import React, { memo, useCallback, useMemo } from 'react';
import { useForm, Controller, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// UI Components
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check } from 'lucide-react';

// --- 1. Schema, Types, and Hook Logic ---

interface Employee {
  id: string;
  full_name: string;
}

const createWorkbookSchema = z.object({
  name: z.string().min(3, { message: "Workbook name must be at least 3 characters." }),
  shared_with: z.array(z.string()),
});

type CreateWorkbookInput = z.infer<typeof createWorkbookSchema>;

// --- 2. Main Modal Component ---

interface CreateWorkbookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateWorkbookModal({ isOpen, onClose }: CreateWorkbookModalProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  // --- Data Fetching ---
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ['allEmployees'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_employees');
      if (error) {
        toast.error(`Failed to fetch employees: ${error.message}`);
        throw new Error(error.message);
      }
      return data || [];
    },
  });

  // --- Form Setup ---
  const form = useForm<CreateWorkbookInput>({
    resolver: zodResolver(createWorkbookSchema),
    defaultValues: {
      name: '',
      shared_with: [],
    },
  });

  // --- Mutation for Creating Workbook ---
  const { mutate: createWorkbook, isPending: isCreating } = useMutation({
    mutationFn: async (values: CreateWorkbookInput) => {
      const { error } = await supabase.rpc('create_workbook_and_share', {
        p_name: values.name,
        p_user_ids: values.shared_with,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Workbook created successfully!");
      queryClient.invalidateQueries({ queryKey: ['myWorkbooks'] });
      form.reset();
      onClose();
    },
    onError: (err) => {
      toast.error(`Error creating workbook: ${err.message}`);
    },
  });

  const isLoading = isLoadingEmployees || isCreating;

  // This function acts as the bridge between react-hook-form and react-query
  const onSubmit = (data: CreateWorkbookInput) => {
    createWorkbook(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create & Share New Workbook</DialogTitle>
          <DialogDescription>
            Give your new workbook a name and select employees to share it with.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          {/* FIX: Pass a compatible function to handleSubmit. */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <fieldset disabled={isLoading} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workbook Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Q4 Product Roadmap" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shared_with"
                render={() => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Share With (Optional)</FormLabel>
                    <EmployeeSelector employees={employees} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isCreating}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Workbook
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

// --- 3. Reusable Sub-components ---

const EmployeeSelector = memo(({ employees }: { employees: Employee[] }) => {
  const { control, setValue, getValues } = useFormContext<CreateWorkbookInput>();

  const handleSelect = useCallback((employeeId: string) => {
    const currentSelection = getValues("shared_with") || [];
    const newSelection = currentSelection.includes(employeeId)
      ? currentSelection.filter(id => id !== employeeId)
      : [...currentSelection, employeeId];
    setValue("shared_with", newSelection, { shouldValidate: true, shouldDirty: true });
  }, [getValues, setValue]);

  return (
    <Controller
      control={control}
      name="shared_with"
      render={({ field: { value: selectedIds = [] } }) => {
        const selectedEmployees = useMemo(
          () => employees.filter(e => selectedIds.includes(e.id)),
          [employees, selectedIds]
        );

        const triggerText = useMemo(() => {
          if (selectedIds.length === 0) return "Select employees...";
          if (selectedIds.length > 3) return <Badge variant="secondary">{`${selectedIds.length} employees selected`}</Badge>;
          return selectedEmployees.map(e => <Badge key={e.id} variant="secondary">{e.full_name}</Badge>);
        }, [selectedIds.length, selectedEmployees]);

        return (
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button variant="outline" role="combobox" className={cn("w-full justify-start h-auto min-h-10", !selectedIds.length && "text-muted-foreground")}>
                  <div className="flex gap-1 flex-wrap items-center">{triggerText}</div>
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput placeholder="Search employees..." />
                <CommandList>
                  <CommandEmpty>No employees found.</CommandEmpty>
                  <CommandGroup>
                    {employees.map(employee => (
                      <EmployeeCommandItem
                        key={employee.id}
                        employee={employee}
                        isSelected={selectedIds.includes(employee.id)}
                        onSelect={handleSelect}
                      />
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        );
      }}
    />
  );
});
EmployeeSelector.displayName = "EmployeeSelector";

const EmployeeCommandItem = memo(({ employee, isSelected, onSelect }: { employee: Employee; isSelected: boolean; onSelect: (id: string) => void; }) => (
  <CommandItem onSelect={() => onSelect(employee.id)}>
    <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
    {employee.full_name}
  </CommandItem>
));
EmployeeCommandItem.displayName = "EmployeeCommandItem";