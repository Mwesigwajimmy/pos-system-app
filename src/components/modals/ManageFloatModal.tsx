// src/components/modals/ManageFloatModal.tsx
'use client';

import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { createClient } from '@/lib/supabase/client';
// --- Import your central schemas ---
import { manageFloatSchema } from '@/lib/schemas';
import type { Agent } from '@/lib/schemas';

// --- UI Components ---
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, PlusCircle, MinusCircle } from 'lucide-react';

// Define the shape of data for the mutation
type FloatMutationVariables = {
  amount: number;
  notes: string;
};

interface ManageFloatModalProps {
  agent: Agent;
  isOpen: boolean;
  onClose: () => void;
}

export function ManageFloatModal({ agent, isOpen, onClose }: ManageFloatModalProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof manageFloatSchema>>({
    resolver: zodResolver(manageFloatSchema),
    defaultValues: { amount: "", notes: "" },
  });

  const handleSuccess = (message: string) => {
    toast.success(message);
    queryClient.invalidateQueries({ queryKey: ['allTelecomAgents'] });
    form.reset();
    onClose();
  };

  // --- Your excellent two-mutation design ---
  const { mutate: issueFloat, isPending: isIssuing } = useMutation({
    mutationFn: async (values: FloatMutationVariables) => {
      const { error } = await supabase.rpc('issue_telecom_agent_float', {
        p_agent_user_id: agent.user_id, p_amount: values.amount, p_notes: values.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => handleSuccess("Float added successfully."),
    onError: (error: Error) => toast.error(`Error: ${error.message}`),
  });
  
  const { mutate: deductFloat, isPending: isDeducting } = useMutation({
    mutationFn: async (values: FloatMutationVariables) => {
      const { error } = await supabase.rpc('deduct_telecom_agent_float', {
        p_agent_user_id: agent.user_id, p_amount: values.amount, p_notes: values.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => handleSuccess("Float deducted successfully."),
    onError: (error: Error) => toast.error(`Error: ${error.message}`),
  });

  // --- Your excellent submission handler ---
  const processSubmit = (mutationCallback: (vars: FloatMutationVariables) => void) => 
    (data: z.infer<typeof manageFloatSchema>) => {
      const transformedData = {
        amount: parseFloat(data.amount),
        notes: data.notes || '', // Ensure notes is always a string
      };
      mutationCallback(transformedData);
    };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
            <DialogTitle>Manage Float for {agent.full_name}</DialogTitle>
            <p className="text-sm text-muted-foreground pt-1">Current Balance: <span className="font-bold">UGX {agent.current_float_balance.toLocaleString()}</span></p>
        </DialogHeader>
        <Form {...form}>
          <div className="space-y-4">
            <FormField name="amount" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 50000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
            )}/>
            <FormField name="notes" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes / Reason</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Weekly float top-up" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
            )}/>
            <DialogFooter className="grid grid-cols-2 gap-2 pt-4">
              <Button type="button" variant="destructive" disabled={isDeducting || isIssuing || !form.formState.isValid} onClick={form.handleSubmit(processSubmit(deductFloat))}>
                {isDeducting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <MinusCircle className="mr-2 h-4 w-4"/> Deduct
              </Button>
              <Button type="button" variant="default" disabled={isIssuing || isDeducting || !form.formState.isValid} onClick={form.handleSubmit(processSubmit(issueFloat))}>
                {isIssuing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <PlusCircle className="mr-2 h-4 w-4"/> Add
              </Button>
            </DialogFooter>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}