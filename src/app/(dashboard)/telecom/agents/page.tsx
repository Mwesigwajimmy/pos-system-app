'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

// Import the Agent type from our central schema file
import { Agent } from '@/lib/schemas'; 
// Import the newly created ManageFloatModal component
import { ManageFloatModal } from '@/components/modals/ManageFloatModal';

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// Re-add SlidersHorizontal icon for the button
import { Loader2, Edit, UserPlus, SlidersHorizontal } from 'lucide-react'; 

// --- FORM SCHEMAS (excluding manageFloatSchema, which is now in schemas.ts) ---
const onboardAgentSchema = z.object({
    full_name: z.string().min(3, "Full name is required."),
    email: z.string().email("Please enter a valid email address."),
});

const editAgentSchema = z.object({
    full_name: z.string().min(3, "Full name is required."),
    is_active: z.boolean(),
});

// ===================================================================
// MODAL COMPONENT: Onboard New Agent (No Changes)
// ===================================================================
function OnboardAgentModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) {
    const supabase = createClient();
    const queryClient = useQueryClient();
    const form = useForm<z.infer<typeof onboardAgentSchema>>({
        resolver: zodResolver(onboardAgentSchema),
        defaultValues: { full_name: "", email: "" },
    });

    const { mutate: onboardAgent, isPending } = useMutation({
        mutationFn: async (values: z.infer<typeof onboardAgentSchema>) => {
            const { error } = await supabase.rpc('invite_telecom_agent', {
                p_email: values.email,
                p_full_name: values.full_name
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Agent invitation sent successfully!");
            queryClient.invalidateQueries({ queryKey: ['allTelecomAgents'] });
            onClose();
            form.reset();
        },
        onError: (error) => toast.error(`Error: ${error.message}`),
    });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader><DialogTitle>Onboard New Telecom Agent</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground">An invitation email will be sent, allowing them to set their password and join your business as a cashier/agent.</p>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(data => onboardAgent(data))} className="space-y-4">
                        <FormField name="full_name" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Agent's Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField name="email" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Agent's Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <DialogFooter>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send Invitation
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

// ===================================================================
// MODAL COMPONENT: Edit Agent (No Changes)
// ===================================================================
function EditAgentModal({ agent, isOpen, onClose }: { agent: Agent; isOpen: boolean; onClose: () => void; }) {
    const supabase = createClient();
    const queryClient = useQueryClient();
    const form = useForm<z.infer<typeof editAgentSchema>>({
        resolver: zodResolver(editAgentSchema),
        defaultValues: { full_name: agent.full_name, is_active: agent.is_active },
    });

    const { mutate: updateAgent, isPending } = useMutation({
        mutationFn: async (values: z.infer<typeof editAgentSchema>) => {
            const { error } = await supabase.rpc('update_telecom_agent_details', {
                p_agent_user_id: agent.user_id,
                p_full_name: values.full_name,
                p_is_active: values.is_active,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Agent details updated.");
            queryClient.invalidateQueries({ queryKey: ['allTelecomAgents'] });
            onClose();
        },
        onError: (error) => toast.error(`Error: ${error.message}`),
    });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader><DialogTitle>Edit Agent: {agent.full_name}</DialogTitle></DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(data => updateAgent(data))} className="space-y-4">
                        <FormField name="full_name" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField name="is_active" control={form.control} render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <FormLabel>Agent is Active</FormLabel>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )} />
                        <DialogFooter>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

// ===================================================================
// MAIN PAGE COMPONENT (Re-integrating ManageFloatModal)
// ===================================================================
export default function AgentManagementPage() {
    const supabase = createClient();
    const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    // 1. Re-add state for the float modal
    const [isFloatModalOpen, setIsFloatModalOpen] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

    const { data: agents, isLoading, error } = useQuery<Agent[]>({
        queryKey: ['allTelecomAgents'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_all_telecom_agents');
            if (error) throw error;
            return data || [];
        }
    });

    if (error) {
        toast.error(`Failed to load agents: ${error.message}`);
    }

    const handleEdit = (agent: Agent) => {
        setSelectedAgent(agent);
        setIsEditModalOpen(true);
    };

    // 2. Re-add the handler to open the float modal
    const handleManageFloat = (agent: Agent) => {
        setSelectedAgent(agent);
        setIsFloatModalOpen(true);
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Agent Onboarding & Management</h1>
                    <p className="text-muted-foreground">Onboard, edit, and manage float balances for your telecom agents.</p>
                </div>
                <Button onClick={() => setIsOnboardModalOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" /> Onboard New Agent
                </Button>
            </header>
            
            <Card>
                <CardHeader><CardTitle>All Telecom Agents</CardTitle></CardHeader>
                <CardContent>
                    {isLoading && <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>}
                    {!isLoading && agents && agents.length > 0 ? (
                        <Table>
                            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Status</TableHead><TableHead>Float Balance</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {agents.map(agent => (
                                    <TableRow key={agent.user_id}>
                                        <TableCell>{agent.full_name}</TableCell>
                                        <TableCell>{agent.email}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 text-xs rounded-full ${agent.is_active ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {agent.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </TableCell>
                                        <TableCell>UGX {agent.current_float_balance.toLocaleString()}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            {/* 3. Re-add the "Manage Float" button */}
                                            <Button variant="outline" size="sm" onClick={() => handleManageFloat(agent)}>
                                                <SlidersHorizontal className="mr-2 h-4 w-4"/> Manage Float
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => handleEdit(agent)}>
                                                <Edit className="mr-2 h-4 w-4"/> Edit Details
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : !isLoading && !error && (
                        <p className="text-center text-muted-foreground py-8">No agents have been onboarded yet.</p>
                    )}
                </CardContent>
            </Card>

            {/* Modals */}
            <OnboardAgentModal isOpen={isOnboardModalOpen} onClose={() => setIsOnboardModalOpen(false)} />
            {selectedAgent && isEditModalOpen && <EditAgentModal agent={selectedAgent} isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} />}
            
            {/* 4. Re-add the ManageFloatModal component, passing the required props */}
            {selectedAgent && isFloatModalOpen && (
                <ManageFloatModal
                    agent={selectedAgent}
                    isOpen={isFloatModalOpen}
                    onClose={() => setIsFloatModalOpen(false)}
                />
            )}
        </div>
    );
}