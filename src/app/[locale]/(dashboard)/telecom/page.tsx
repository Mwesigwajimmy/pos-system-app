'use client';

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { TelecomAdminDashboard } from '@/components/telecom/TelecomAdminDashboard';

export default function TelecomPage() {
    const supabase = createClient();
    const queryClient = useQueryClient();
    const [reconciliationData, setReconciliationData] = useState(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ['telecomAdminDashboard'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_telecom_admin_dashboard');
            if (error) throw new Error(error.message);
            return data;
        },
        refetchInterval: 15000,
    });

    const { data: employees } = useQuery({
        queryKey: ['employeesForTelecom'],
        queryFn: async () => {
             const { data, error } = await supabase.from('profiles').select('id, full_name').neq('role', 'admin');
             if (error) throw new Error(error.message);
             return data;
        }
    });
    
    const { data: pendingRequests } = useQuery({
        queryKey: ['pendingFloatRequests'],
        queryFn: async () => {
             const { data, error } = await supabase.rpc('get_pending_float_requests');
             if (error) throw new Error(error.message);
             return data;
        },
        refetchInterval: 10000,
    });

    const { mutate: startShift, isPending: isStartingShift } = useMutation({
        mutationFn: async ({ userId, amount }: { userId: string; amount: number }) => {
            const { error } = await supabase.rpc('start_telecom_shift', { p_user_id: userId, p_amount_issued: amount });
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            toast.success("Agent's shift started successfully!");
            queryClient.invalidateQueries({ queryKey: ['telecomAdminDashboard'] });
        },
        onError: (err) => toast.error(err.message),
    });

    const { mutate: approveRequest, isPending: isApproving } = useMutation({
        mutationFn: async (requestId: number) => {
            const { error } = await supabase.rpc('approve_telecom_float_request', { p_request_id: requestId });
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            toast.success("Float request approved and issued!");
            queryClient.invalidateQueries({ queryKey: ['pendingFloatRequests'] });
            queryClient.invalidateQueries({ queryKey: ['telecomAdminDashboard'] });
        },
        onError: (err) => toast.error(err.message),
    });
    
    const { mutate: reconcileShift, isPending: isReconciling } = useMutation({
        mutationFn: async ({ userId, cashCounted }: { userId: string; cashCounted: number }) => {
            const { data, error } = await supabase.rpc('reconcile_telecom_agent_shift', { p_user_id: userId, p_cash_counted_by_manager: cashCounted });
            if (error) throw new Error(error.message);
            return data;
        },
        onSuccess: (data) => {
            toast.success("Shift reconciled successfully!");
            setReconciliationData(data); // Open the reconciliation report
            queryClient.invalidateQueries({ queryKey: ['telecomAdminDashboard'] });
        },
        onError: (err) => toast.error(err.message),
    });

    if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (error) return <div className="p-4 text-destructive">Failed to load dashboard: {error.message}</div>;

    return (
        <TelecomAdminDashboard
            data={data}
            employees={employees || []}
            pendingRequests={pendingRequests || []}
            onStartShift={startShift}
            isStartingShift={isStartingShift}
            onApproveRequest={approveRequest}
            onReconcile={reconcileShift}
            isReconciling={isReconciling}
            reconciliationData={reconciliationData}
            onCloseReconciliation={() => setReconciliationData(null)}
        />
    );
}