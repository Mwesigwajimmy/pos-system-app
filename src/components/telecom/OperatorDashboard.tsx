// src/components/telecom/OperatorDashboard.tsx
'use client'; // This directive is the key to making it interactive

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Zap } from 'lucide-react';
import { VirtualAgentForm, Agent, Service } from '@/components/telecom/VirtualAgentForm';

interface OperatorPrerequisites {
  active_agents: (Agent & { current_float_balance: number })[];
  services: Service[];
}

// We rename the main function to OperatorDashboard
export default function OperatorDashboard() {
    const supabase = createClient();

    const { data: prerequisites, isLoading, isError, error } = useQuery({
        queryKey: ['telecomOperatorPrerequisites'],
        queryFn: async (): Promise<OperatorPrerequisites> => {
            const { data, error } = await supabase.rpc('get_telecom_operator_prerequisites');
            if (error) throw new Error(error.message);
            return {
                active_agents: data?.active_agents || [],
                services: data?.services || [],
            };
        },
        refetchInterval: 10000,
    });

    if (isError) {
        return <div className="p-4 text-center text-red-500">Failed to load operator data: {error.message}</div>;
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            <header>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Operator Command Center</h1>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center text-lg sm:text-xl"><Zap className="mr-2 h-5 w-5 text-yellow-500"/> Real-Time Transaction Entry</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center items-center h-48">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                                    <span className="ml-3 text-muted-foreground">Loading form data...</span>
                                </div>
                            ) : (
                                <VirtualAgentForm
                                    agents={prerequisites?.active_agents || []}
                                    services={prerequisites?.services || []}
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg sm:text-xl">Active Agent Balances</CardTitle>
                    </CardHeader>
                    <CardContent>
                         {isLoading ? (
                            <div className="text-center p-4">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary"/>
                            </div>
                         ) : (
                            <div className="space-y-4">
                                {prerequisites?.active_agents && prerequisites.active_agents.length > 0 ? (
                                    prerequisites.active_agents.map((agent) => (
                                        <div key={agent.user_id} className="flex flex-wrap justify-between items-center p-2 border-b last:border-b-0 gap-2">
                                            <span className="font-medium text-sm sm:text-base">{agent.full_name}</span>
                                            <span className="font-bold text-base sm:text-lg">
                                                UGX {agent.current_float_balance.toLocaleString()}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-muted-foreground py-4">No active agents found.</p>
                                )}
                            </div>
                         )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}