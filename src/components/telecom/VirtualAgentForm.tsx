// src/components/telecom/VirtualAgentForm.tsx
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

// --- UI & Utility Imports ---
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Type Definitions (Exported for use in the parent page) ---
export interface Agent { user_id: string; full_name: string; }
export interface Service { id: number; name: string; }

interface VirtualAgentFormProps {
    agents: Agent[];
    services: Service[];
}

// --- Zod Schema using our robust pattern ---
const saleSchema = z.object({
    agentId: z.string().min(1, { message: "Please select a field agent." }),
    serviceId: z.string().min(1, { message: "Please select a service type." }),
    phone: z.string().optional(),
    amount: z.coerce.number().positive({ message: "Sale amount must be a positive number." }),
});

type SaleFormInput = z.input<typeof saleSchema>;
type SaleFormOutput = z.infer<typeof saleSchema>;

export function VirtualAgentForm({ agents, services }: VirtualAgentFormProps) {
    const supabase = createClient();
    const queryClient = useQueryClient();

    // --- Form Initialization ---
    const form = useForm<SaleFormInput>({
        resolver: zodResolver(saleSchema),
        defaultValues: { agentId: '', serviceId: '', phone: '', amount: '' }
    });

    // --- Mutation for Form Submission ---
    const { mutate: recordSale, isPending } = useMutation({
        mutationFn: async (values: SaleFormOutput) => {
            const { error } = await supabase.rpc('record_telecom_sale_for_agent', {
                p_agent_user_id: values.agentId,
                p_service_id: Number(values.serviceId),
                p_amount: values.amount,
                p_customer_phone: values.phone,
            });
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            toast.success("Sale recorded successfully!");
            queryClient.invalidateQueries({ queryKey: ['telecomOperatorPrerequisites'] });
            form.reset({
                ...form.getValues(), // Keep the agent selected
                serviceId: '', phone: '', amount: ''
            });
        },
        onError: (err: Error) => toast.error(`Error: ${err.message}`),
    });

    const selectedAgentName = form.watch("agentId") ? agents.find(a => a.user_id === form.watch("agentId"))?.full_name : "Select a field agent...";
    const selectedServiceName = form.watch("serviceId") ? services.find(s => s.id.toString() === form.watch("serviceId"))?.name : "Select a service type...";

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(data => recordSale(data as SaleFormOutput))} className="space-y-4 sm:space-y-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 text-center">Record New Sale</h2>

                {/* Agent Field with Searchable Popover */}
                <FormField control={form.control} name="agentId" render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Field Agent</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant="outline" role="combobox" className={cn("w-full justify-between font-normal", !field.value && "text-muted-foreground")}>
                                        {selectedAgentName}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Search agents..." />
                                    <CommandEmpty>No agents found.</CommandEmpty>
                                    <CommandGroup>
                                        {agents.map(agent => (
                                            <CommandItem value={agent.full_name} key={agent.user_id} onSelect={() => form.setValue("agentId", agent.user_id)}>
                                                <Check className={cn("mr-2 h-4 w-4", agent.user_id === field.value ? "opacity-100" : "opacity-0")} />
                                                {agent.full_name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )} />

                {/* Service Field with Searchable Popover */}
                <FormField control={form.control} name="serviceId" render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Service / Float Type</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant="outline" role="combobox" className={cn("w-full justify-between font-normal", !field.value && "text-muted-foreground")}>
                                        {selectedServiceName}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Search services..." />
                                    <CommandEmpty>No services found.</CommandEmpty>
                                    <CommandGroup>
                                        {services.map(service => (
                                            <CommandItem value={service.name} key={service.id} onSelect={() => form.setValue("serviceId", service.id.toString())}>
                                                <Check className={cn("mr-2 h-4 w-4", service.id.toString() === field.value ? "opacity-100" : "opacity-0")} />
                                                {service.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )} />

                {/* Phone and Amount fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Customer's Phone</FormLabel>
                            <FormControl>
                                <Input type="tel" placeholder="e.g., 0771234567" {...field} value={String(field.value ?? '')} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="amount" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Sale Amount (UGX)</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="e.g., 50000" {...field} value={String(field.value ?? '')} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
                
                <Button type="submit" className="w-full h-12 text-lg" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    Record Sale
                </Button>
            </form>
        </Form>
    );
}