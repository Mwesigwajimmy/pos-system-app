'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, UserPlus, Edit, SlidersHorizontal } from 'lucide-react';
import { Badge as UiBadge } from "@/components/ui/badge";
import { InviteEmployeeModal } from '@/components/management/InviteEmployeeModal';
import { ManageFloatModal } from '@/components/modals/ManageFloatModal';
import { EditAgentModal } from '@/components/modals/EditAgentModal';

interface TelecomAgent {
    user_id: string;
    full_name: string;
    email: string;
    is_active: boolean;
    current_float_balance: number;
}

export default function AgentManagementPage() {
    const supabase = createClient();
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isFloatModalOpen, setIsFloatModalOpen] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<TelecomAgent | null>(null);

    const { data: agents, isLoading, error } = useQuery({
        queryKey: ['allTelecomAgents'],
        queryFn: async (): Promise<TelecomAgent[]> => {
            const { data, error } = await supabase.rpc('get_all_telecom_agents');
            if (error) {
                toast.error('Failed to load agents', { description: error.message });
                throw new Error(error.message);
            }
            return data || [];
        }
    });

    if (error) {
        return <div className="p-6 text-red-600">Error loading agents: {error.message}</div>
    }
    
    const handleEdit = (agent: TelecomAgent) => { 
        setSelectedAgent(agent); 
        setIsEditModalOpen(true); 
    };
    
    const handleManageFloat = (agent: TelecomAgent) => { 
        setSelectedAgent(agent); 
        setIsFloatModalOpen(true); 
    };
    
    const formatCurrency = (value: number) => `UGX ${value.toLocaleString()}`;

    return (
        <div className="p-4 md:p-6 space-y-6">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Agent Onboarding & Management</h1>
                    <p className="text-muted-foreground">Onboard, edit, and manage float for your telecom agents.</p>
                </div>
                <Button onClick={() => setIsInviteModalOpen(true)} className="mt-4 sm:mt-0">
                    <UserPlus className="mr-2 h-4 w-4" /> Onboard New Agent
                </Button>
            </header>
            
            <Card>
                <CardHeader>
                    <CardTitle>All Telecom Agents</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center p-8 h-48">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : !agents || agents.length === 0 ? (
                        <div className="text-center text-muted-foreground py-16">
                            <p>No agents have been onboarded yet.</p>
                            <Button variant="link" onClick={() => setIsInviteModalOpen(true)} className="mt-2">Onboard the first one</Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Float Balance</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {agents.map(agent => (
                                    <TableRow key={agent.user_id}>
                                        <TableCell className="font-medium">{agent.full_name}</TableCell>
                                        <TableCell>{agent.email}</TableCell>
                                        <TableCell>
                                            <UiBadge variant={agent.is_active ? 'default' : 'destructive'} className={agent.is_active ? 'bg-green-600' : ''}>
                                                {agent.is_active ? 'Active' : 'Inactive'}
                                            </UiBadge>
                                        </TableCell>
                                        <TableCell className="font-mono">{formatCurrency(agent.current_float_balance)}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="outline" size="sm" onClick={() => handleManageFloat(agent)}>
                                                <SlidersHorizontal className="mr-2 h-4 w-4"/> Manage Float
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => handleEdit(agent)}>
                                                <Edit className="mr-2 h-4 w-4"/> Edit
                                            </Button> 
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <InviteEmployeeModal 
                isOpen={isInviteModalOpen} 
                onClose={() => setIsInviteModalOpen(false)} 
                defaultRole="cashier" 
            />
            
            {selectedAgent && isEditModalOpen && <EditAgentModal agent={selectedAgent} isOpen={isEditModalOpen} onClose={() => {setIsEditModalOpen(false); setSelectedAgent(null);}} />}
            {selectedAgent && isFloatModalOpen && <ManageFloatModal agent={selectedAgent} isOpen={isFloatModalOpen} onClose={() => {setIsFloatModalOpen(false); setSelectedAgent(null);}} />} 
        </div>
    );
}