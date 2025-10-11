'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from 'lucide-react';

// Define the structure of the agent data this modal receives
interface Agent {
    user_id: string;
    full_name: string;
    is_active: boolean;
}

// Define the form validation schema
const editAgentSchema = z.object({
    full_name: z.string().min(3, { message: "Full name must be at least 3 characters." }),
    is_active: z.boolean(),
});

type EditAgentFormValues = z.infer<typeof editAgentSchema>;

export function EditAgentModal({ agent, isOpen, onClose }: { agent: Agent; isOpen: boolean; onClose: () => void; }) {
    const supabase = createClient();
    const queryClient = useQueryClient();

    const form = useForm<EditAgentFormValues>({
        resolver: zodResolver(editAgentSchema),
        defaultValues: {
            full_name: '',
            is_active: true,
        },
    });

    // When the 'agent' prop changes, reset the form with the new agent's data
    useEffect(() => {
        if (agent) {
            form.reset({
                full_name: agent.full_name,
                is_active: agent.is_active,
            });
        }
    }, [agent, form]);

    const { mutate: updateAgent, isPending } = useMutation({
        mutationFn: async (values: EditAgentFormValues) => {
            const { error } = await supabase.rpc('update_telecom_agent_details', {
                p_user_id: agent.user_id,
                p_full_name: values.full_name,
                p_is_active: values.is_active,
            });
            if (error) {
                throw new Error(error.message);
            }
        },
        onSuccess: () => {
            toast.success("Agent details updated successfully!");
            queryClient.invalidateQueries({ queryKey: ['allTelecomAgents'] });
            onClose();
        },
        onError: (error) => {
            toast.error("Failed to update agent", { description: error.message });
        },
    });

    const onSubmit = (data: EditAgentFormValues) => {
        updateAgent(data);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Agent: {agent.full_name}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                        <FormField
                            control={form.control}
                            name="full_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Full Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter agent's full name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="is_active"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Status</FormLabel>
                                        <p className="text-sm text-muted-foreground">
                                            Set the agent to active or inactive.
                                        </p>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}