'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

// UI Components from shadcn/ui
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, PlusCircle, Edit, SlidersHorizontal /* MinusCircle, PlusCircle as PlusCircleIcon */ } from 'lucide-react'; // Removed unused icons

// --- DATA TYPES (matching our SQL functions) ---

interface Agent {
    user_id: string;
    full_name: string;
    email: string;
    is_active: boolean;
    current_float_balance: number;
}

interface Service {
    id: number;
    service_name: string;
    service_type: string;
    is_active: boolean;
    provider_name: string | null;
}

interface Provider {
    id: number;
    name: string;
}

// --- FORM SCHEMAS (for validation) ---

const editAgentSchema = z.object({
    full_name: z.string().min(3, "Full name is required."),
    is_active: z.boolean(),
});

const serviceSchema = z.object({
    service_name: z.string().min(3, "Service name is required."),
    service_type: z.string().min(3, "Service type is required."),
    is_active: z.boolean(),
    provider_id: z.string().optional(),
});


// ===================================================================
// MODAL COMPONENT: Edit Agent
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
// MODAL COMPONENT: Manage Agent Float - ENTIRELY REMOVED
// ===================================================================
// Removed the ManageFloatModal function and its associated schema.


// ===================================================================
// MODAL COMPONENT: Create or Edit Service
// ===================================================================
function ServiceFormModal({ service, providers, isOpen, onClose }: { service?: Service; providers: Provider[]; isOpen: boolean; onClose: () => void; }) {
    const supabase = createClient();
    const queryClient = useQueryClient();
    const isEditMode = !!service;

    const form = useForm<z.infer<typeof serviceSchema>>({
        resolver: zodResolver(serviceSchema),
        defaultValues: {
            service_name: service?.service_name || "",
            service_type: service?.service_type || "",
            is_active: service?.is_active ?? true,
            provider_id: service?.provider_name ? String(providers.find(p => p.name === service.provider_name)?.id) : undefined,
        },
    });
    
    const { mutate: createService, isPending: isCreating } = useMutation({
        mutationFn: async (values: z.infer<typeof serviceSchema>) => {
            const { data: newServiceId, error } = await supabase.rpc('create_telecom_service', {
                p_service_name: values.service_name,
                p_service_type: values.service_type,
                p_provider_id: values.provider_id ? Number(values.provider_id) : null,
            });
            if (error) throw error;
            return newServiceId;
        },
        onSuccess: () => {
            toast.success("Service created successfully.");
            queryClient.invalidateQueries({ queryKey: ['allTelecomServices'] });
            onClose();
            form.reset();
        },
        onError: (error) => toast.error(`Error: ${error.message}`),
    });

    const { mutate: updateService, isPending: isUpdating } = useMutation({
        mutationFn: async (values: z.infer<typeof serviceSchema>) => {
            const { error } = await supabase.rpc('update_telecom_service', {
                p_service_id: service!.id,
                p_service_name: values.service_name,
                p_service_type: values.service_type,
                p_is_active: values.is_active,
                p_provider_id: values.provider_id ? Number(values.provider_id) : null,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Service updated successfully.");
            queryClient.invalidateQueries({ queryKey: ['allTelecomServices'] });
            onClose();
        },
        onError: (error) => toast.error(`Error: ${error.message}`),
    });
    
    const isPending = isCreating || isUpdating;

    const onSubmit = (data: z.infer<typeof serviceSchema>) => {
        if (isEditMode) {
            updateService(data);
        } else {
            createService(data);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader><DialogTitle>{isEditMode ? "Edit Service" : "Create New Service"}</DialogTitle></DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField name="service_name" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Service Name</FormLabel><FormControl><Input {...field} placeholder="e.g., MTN Airtime" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField name="service_type" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Service Type</FormLabel><FormControl><Input {...field} placeholder="e.g., Airtime, Data, Utilities" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField name="provider_id" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Provider</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select a provider (optional)" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="">No Provider</SelectItem>
                                    {providers.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select><FormMessage /></FormItem>
                        )} />
                        {isEditMode && <FormField name="is_active" control={form.control} render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <FormLabel>Service is Active</FormLabel>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )} /> }
                        <DialogFooter>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {isEditMode ? "Save Changes" : "Create Service"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

// ===================================================================
// TAB COMPONENT: Agent Management
// ===================================================================
function AgentManagementTab() {
    const supabase = createClient();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    // const [isFloatModalOpen, setIsFloatModalOpen] = useState(false); // REMOVED
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

    // REMOVED: handleManageFloat function
    // const handleManageFloat = (agent: Agent) => {
    //     setSelectedAgent(agent);
    //     setIsFloatModalOpen(true);
    // };

    return (
        <Card>
            <CardHeader><CardTitle>Agent Management</CardTitle></CardHeader>
            <CardContent>
                {isLoading && <div className="flex justify-center items-center py-4"><Loader2 className="h-8 w-8 animate-spin" /></div>}
                {!isLoading && agents && agents.length > 0 ? (
                    <Table>
                        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Status</TableHead><TableHead>Float Balance</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {agents.map(agent => (
                                <TableRow key={agent.user_id}>
                                    <TableCell>{agent.full_name}</TableCell>
                                    <TableCell>{agent.email}</TableCell>
                                    <TableCell>{agent.is_active ? 'Active' : 'Inactive'}</TableCell>
                                    <TableCell>UGX {agent.current_float_balance.toLocaleString()}</TableCell>
                                    <TableCell className="space-x-2">
                                        {/* REMOVED: Manage Float Button */}
                                        {/* <Button variant="outline" size="sm" onClick={() => handleManageFloat(agent)}><SlidersHorizontal className="mr-2 h-4 w-4"/> Manage Float</Button> */}
                                        <Button variant="outline" size="sm" onClick={() => handleEdit(agent)}><Edit className="mr-2 h-4 w-4"/> Edit</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : !isLoading && !error && (
                    <p className="text-center text-muted-foreground py-4">No agents found.</p>
                )}
                {selectedAgent && isEditModalOpen && <EditAgentModal agent={selectedAgent} isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} />}
                {/* REMOVED: ManageFloatModal render */}
                {/* {selectedAgent && isFloatModalOpen && <ManageFloatModal agent={selectedAgent} isOpen={isFloatModalOpen} onClose={() => setIsFloatModalOpen(false)} />} */}
            </CardContent>
        </Card>
    );
}

// ===================================================================
// TAB COMPONENT: Service Management
// ===================================================================
function ServiceManagementTab() {
    const supabase = createClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<Service | undefined>(undefined);

    const { data: services, isLoading: isLoadingServices, error: servicesError } = useQuery<Service[]>({
        queryKey: ['allTelecomServices'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_all_telecom_services');
            if (error) throw error;
            return data || [];
        }
    });

    const { data: providers, isLoading: isLoadingProviders, error: providersError } = useQuery<Provider[]>({
        queryKey: ['allTelecomProviders'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_all_telecom_providers');
            if (error) throw error;
            return data || [];
        }
    });

    if (servicesError) {
        toast.error(`Failed to load services: ${servicesError.message}`);
    }
    if (providersError) {
        toast.error(`Failed to load providers: ${providersError.message}`);
    }
    
    const handleEdit = (service: Service) => {
        setSelectedService(service);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setSelectedService(undefined);
        setIsModalOpen(true);
    };

    const isLoading = isLoadingServices || isLoadingProviders;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Service Management</CardTitle>
                <Button onClick={handleCreate}><PlusCircle className="mr-2 h-4 w-4"/> Create New Service</Button>
            </CardHeader>
            <CardContent>
                {isLoading && <div className="flex justify-center items-center py-4"><Loader2 className="h-8 w-8 animate-spin" /></div>}
                {!isLoading && services && services.length > 0 ? (
                    <Table>
                        <TableHeader><TableRow><TableHead>Service Name</TableHead><TableHead>Type</TableHead><TableHead>Provider</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {services.map(service => (
                                <TableRow key={service.id}>
                                    <TableCell>{service.service_name}</TableCell>
                                    <TableCell>{service.service_type}</TableCell>
                                    <TableCell>{service.provider_name || 'N/A'}</TableCell>
                                    <TableCell>{service.is_active ? 'Active' : 'Inactive'}</TableCell>
                                    <TableCell><Button variant="outline" size="sm" onClick={() => handleEdit(service)}><Edit className="mr-2 h-4 w-4"/> Edit</Button></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : !isLoading && !servicesError && (
                    <p className="text-center text-muted-foreground py-4">No services found.</p>
                )}
                {isModalOpen && <ServiceFormModal service={selectedService} providers={providers || []} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />}
            </CardContent>
        </Card>
    );
}


// ===================================================================
// MAIN PAGE COMPONENT
// ===================================================================
export default function FinancialControlsPage() {
    return (
        <div className="p-4 md:p-6 space-y-6">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Financial Controls</h1>
                <p className="text-muted-foreground">Manage float, reconcile shifts, and track all financial movements.</p>
            </header>
            
            <Tabs defaultValue="agents">
                <TabsList>
                    <TabsTrigger value="agents">Agent Management</TabsTrigger>
                    <TabsTrigger value="services">Service Management</TabsTrigger>
                </TabsList>
                <TabsContent value="agents" className="pt-4">
                    <AgentManagementTab />
                </TabsContent>
                <TabsContent value="services" className="pt-4">
                    <ServiceManagementTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}