'use client';

import React, { useRef, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, ChevronsUpDown, Check } from 'lucide-react';
import { cn, mergeRefs } from '@/lib/utils'; // Assuming mergeRefs is correctly imported from here

// --- 1. Type Definitions & Schema (Strict Typing with EXPORTS) ---

export interface Agent {
  user_id: string;
  full_name: string;
}

// UPDATE: The Service interface is updated to match the new, more detailed data
// from the `get_telecom_operator_prerequisites` function.
export interface Service {
  id: number;
  provider_name: string | null; // e.g., 'MTN', can be null for generic services
  service_name: string;      // e.g., 'Airtime', 'Mobile Money'
  service_type: string;      // The ENUM type from the database
}

export interface SubmissionData {
  agentId: string;
  serviceId: number;
  amount: number;
  phone: string;
}

// Props for the VirtualAgentForm component
interface VirtualAgentFormProps {
  agents: Agent[];
  services: Service[];
  // UPDATE: The onSubmit prop is simplified. The parent component now handles success/error logic.
  onSubmit: (data: SubmissionData) => void;
  isPending: boolean;
}

// Zod schema remains the same, as the final data shape is the same.
const formSchema = z.object({
  agentId: z.string().min(1, { message: "Please select a field agent." }),
  serviceId: z.string().min(1, { message: "Please select a service type." }),
  amount: z.string()
    .min(1, { message: "Sale amount is required." })
    .refine((val) => {
      const num = Number(val);
      return !isNaN(num) && num > 0;
    }, {
      message: "Amount must be a valid number greater than zero.",
    }),
  phone: z.string()
    .min(10, "Phone number must be exactly 10 digits.")
    .max(10, "Phone number must be exactly 10 digits.")
    .regex(/^\d{10}$/, "Phone number must contain only digits."),
});

type FormValues = z.infer<typeof formSchema>;

// --- 2. VirtualAgentForm Component ---

export function VirtualAgentForm({ agents, services, onSubmit, isPending }: VirtualAgentFormProps) {
  const serviceTriggerRef = useRef<HTMLButtonElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: { // Set default values to prevent uncontrolled component warnings
        agentId: '',
        serviceId: '',
        amount: '',
        phone: '',
    }
  });

  const agentMap = useMemo(() => new Map(agents.map(agent => [agent.user_id, agent])), [agents]);
  const serviceMap = useMemo(() => new Map(services.map(service => [service.id.toString(), service])), [services]);

  const handleFormSubmit = useCallback((values: FormValues) => {
    const submissionData: SubmissionData = {
      ...values,
      serviceId: parseInt(values.serviceId, 10),
      amount: Number(values.amount),
    };

    // UPDATE: The call to onSubmit is simplified.
    // The parent page now handles toast notifications and form resets.
    onSubmit(submissionData);
    
    // Logic to reset only specific fields after submission
    form.reset({
      agentId: values.agentId, // Keep the selected agent
      serviceId: '',
      amount: '',
      phone: '',
    });
    phoneInputRef.current?.focus();

  }, [form, onSubmit]);

  const selectedAgentName = form.watch("agentId") ? agentMap.get(form.watch("agentId"))?.full_name : null;
  const selectedService = form.watch("serviceId") ? serviceMap.get(form.watch("serviceId")) : undefined;

  // UPDATE: New helper function to create a descriptive name for the service dropdown.
  const getDisplayServiceName = (service: Service | undefined) => {
    if (!service) return "Select a service type...";
    // Combines provider name and service name, e.g., "MTN Airtime"
    return `${service.provider_name ? service.provider_name + ' ' : ''}${service.service_name}`;
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">Record New Sale</h2>

        {/* This part remains for server-side errors if you choose to implement them */}
        {form.formState.errors.root?.serverError && (
          <p className="text-sm font-medium text-red-500 text-center">
            {form.formState.errors.root.serverError.message}
          </p>
        )}

        {/* Agent Field - No changes needed */}
        <FormField
          control={form.control}
          name="agentId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Field Agent</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" role="combobox" className={cn("w-full justify-between font-normal", !field.value && "text-muted-foreground")}>
                      {selectedAgentName || "Select a field agent..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search agents..." />
                    <CommandEmpty>No agents found.</CommandEmpty>
                    <CommandGroup>
                      {agents.map((agent) => (
                        <CommandItem value={agent.full_name} key={agent.user_id} onSelect={() => { form.setValue("agentId", agent.user_id, { shouldValidate: true }); }}>
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
          )}
        />

        {/* Service Field - UPDATED */}
        <FormField
          control={form.control}
          name="serviceId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Service / Float Type</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button ref={serviceTriggerRef} variant="outline" role="combobox" className={cn("w-full justify-between font-normal", !field.value && "text-muted-foreground")}>
                      {/* UPDATE: Use the new helper function for a better display name */}
                      {getDisplayServiceName(selectedService)}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search services..." />
                    <CommandEmpty>No services found.</CommandEmpty>
                    <CommandGroup>
                      {services.map((s) => (
                        <CommandItem
                          // UPDATE: Use the helper function for both the value and the display text
                          value={getDisplayServiceName(s)}
                          key={s.id}
                          onSelect={() => {
                            form.setValue("serviceId", s.id.toString(), { shouldValidate: true });
                            phoneInputRef.current?.focus();
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", s.id.toString() === field.value ? "opacity-100" : "opacity-0")} />
                          {getDisplayServiceName(s)}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Phone Field - CORRECTED */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => {
            const { ref, ...rest } = field; // Extract ref from field
            return (
              <FormItem>
                <FormLabel>Customer's Phone Number</FormLabel>
                <FormControl>
                  <Input 
                    type="tel" 
                    placeholder="e.g., 0771234567" 
                    ref={mergeRefs(ref, phoneInputRef)} // Pass both refs to mergeRefs
                    {...rest} // Spread the rest of the field props
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        {/* Amount Field - No changes needed */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sale Amount (UGX)</FormLabel>
              <FormControl>
                <Input type="number" inputMode="numeric" placeholder="e.g., 50,000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full h-12 text-lg font-bold transition-all duration-200" disabled={isPending || !form.formState.isValid}>
          {isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          {isPending ? "Recording Sale..." : "Record Sale"}
        </Button>
      </form>
    </Form>
  );
}