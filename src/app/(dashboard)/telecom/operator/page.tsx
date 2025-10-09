'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Zap } from 'lucide-react';
// Import the component and its updated types for full type safety
import { VirtualAgentForm, Agent, Service, SubmissionData } from '@/components/telecom/VirtualAgentForm';

// UPDATE: A new interface to match the combined data from our efficient SQL function.
// It includes agents with their float balance.
interface OperatorPrerequisites {
  active_agents: (Agent & { current_float_balance: number })[];
  services: Service[];
}

export default function OperatorPage() {
    const supabase = createClient();
    const queryClient = useQueryClient();

    // UPDATE: Replaced two separate useQuery hooks with a single, more efficient one.
    // This fetches both agents and services in one network request.
    const { data: prerequisites, isLoading } = useQuery<OperatorPrerequisites>({
        queryKey: ['telecomOperatorPrerequisites'], // New, combined query key
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_telecom_operator_prerequisites');
            if (error) throw new Error(error.message);
            // Ensure we return a valid structure with empty arrays if the RPC returns null
            return {
                active_agents: data.active_agents || [],
                services: data.services || [],
            };
        },
        refetchInterval: 10000, // Continues to refetch data periodically
    });

    // UPDATE: The mutation is updated to match the new SQL function and provides clearer feedback.
    const { mutate: recordSale, isPending: isRecordingSale } = useMutation({
        mutationFn: async (vars: SubmissionData) => {
            // The parameter names now match the final, corrected SQL function
            const { error } = await supabase.rpc('record_telecom_sale_for_agent', {
                p_agent_user_id: vars.agentId,
                p_service_id: vars.serviceId,
                p_amount: vars.amount,
                p_customer_phone: vars.phone
            });
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            toast.success("Sale recorded successfully!");
            // Invalidate the main query to refresh all data, including agent balances
            queryClient.invalidateQueries({ queryKey: ['telecomOperatorPrerequisites'] });
        },
        onError: (err: Error) => { // Explicitly type the error for better handling
            console.error("Sale recording failed:", err);
            toast.error(`Error: ${err.message}`);
        },
    });

    // Note: The main `isLoading` state now correctly covers both agents and services.

    return (
        <div className="p-4 md:p-6 space-y-6">
            <header className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Operator Command Center</h1>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center"><Zap className="mr-2 h-5 w-5 text-yellow-500"/> Real-Time Transaction Entry</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center items-center h-48">
                                <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                                <span className="ml-3 text-muted-foreground">Loading form data...</span>
                            </div>
                        ) : (
                            <VirtualAgentForm
                                // UPDATE: Pass the correct data from our new `prerequisites` object
                                agents={prerequisites?.active_agents || []}
                                services={prerequisites?.services || []}
                                onSubmit={recordSale} // The simplified onSubmit prop
                                isPending={isRecordingSale}
                            />
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Active Agent Balances</CardTitle>
                    </CardHeader>
                    <CardContent>
                         {isLoading ? ( // UPDATE: Use the single `isLoading` state
                            <div className="text-center p-4">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary"/>
                            </div>
                         ) : (
                            <div className="space-y-4">
                                {/* UPDATE: Map over the `active_agents` from our new `prerequisites` object */}
                                {prerequisites?.active_agents && prerequisites.active_agents.length > 0 ? (
                                    prerequisites.active_agents.map((agent) => (
                                        <div key={agent.user_id} className="flex justify-between items-center p-2 border-b last:border-b-0">
                                            <span className="font-medium">{agent.full_name}</span>
                                            <span className="font-bold text-lg">
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