'use client';

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { TelecomAgentDashboard } from '@/components/telecom/TelecomAgentDashboard';

export default function AgentTelecomPage() {
    const supabase = createClient();
    const queryClient = useQueryClient();

    const { data, isLoading, error } = useQuery({
        queryKey: ['telecomAgentDashboard'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_telecom_agent_dashboard');
            if (error) throw new Error(error.message);
            return data;
        },
        refetchInterval: 30000, // Refresh every 30 seconds
    });

     const { data: services } = useQuery({
        queryKey: ['telecomServices'],
        queryFn: async () => {
             const { data, error } = await supabase.from('telecom_service_balances').select(`id, service_type, provider:telecom_providers(name)`);
             if (error) throw new Error(error.message);
             return data;
        }
    });

    const { mutate: recordSale, isPending: isRecordingSale } = useMutation({
        mutationFn: async (vars: { serviceId: number; amount: number; commission: number; phone: string }) => {
            const { error } = await supabase.rpc('record_telecom_sale', { 
                p_service_balance_id: vars.serviceId, 
                p_amount: vars.amount,
                p_commission_earned: vars.commission,
                p_customer_phone: vars.phone
            });
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            toast.success("Sale recorded successfully!");
            queryClient.invalidateQueries({ queryKey: ['telecomAgentDashboard'] });
        },
        onError: (err) => toast.error(err.message),
    });
    
    const { mutate: recordExpense, isPending: isRecordingExpense } = useMutation({
        mutationFn: async (vars: { amount: number; description: string; receiptUrl: string | null }) => {
            const { error } = await supabase.rpc('record_telecom_expense', { 
                p_amount: vars.amount,
                p_description: vars.description,
                p_receipt_url: vars.receiptUrl
            });
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            toast.success("Expense recorded!");
            queryClient.invalidateQueries({ queryKey: ['telecomAgentDashboard'] });
        },
        onError: (err) => toast.error(err.message),
    });

    if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (error) return <div className="p-4 text-destructive">Failed to load your dashboard: {error.message}</div>;

    return (
        <TelecomAgentDashboard
            data={data}
            services={services || []}
            onRecordSale={recordSale}
            isRecordingSale={isRecordingSale}
            onRecordExpense={recordExpense}
            isRecordingExpense={isRecordingExpense}
        />
    );
}